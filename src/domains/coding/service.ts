import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { codingAttemptSchema, type CodingAttempt, type CodingRequest } from "@/contracts/coding";
import { codingSuite } from "./suites";
import { compareResults, executionSource } from "./harness";
import { runJudge0, runnerConfigured } from "./judge0";

export class CodingError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
type Row = {
  id: string; question_id: string; language: string; mode: string; source_code: string;
  request_hash: string; suite_version: string; status: string;
  result: Record<string,unknown>; created_at: Date; finished_at: Date | null;
};
const iso = (value: Date | string) => new Date(value).toISOString();
function attempt(row: Row): CodingAttempt {
  const stale = row.status === "queued" && Date.now()-new Date(row.created_at).getTime()>45000;
  return codingAttemptSchema.parse({
    attemptId: row.id, questionId: row.question_id, language: row.language, mode: row.mode, code: row.source_code,
    suiteVersion: row.suite_version, status: stale ? "runner_error" : row.status,
    ...row.result, ...(stale ? { message: "This run could not be confirmed. Start a new run.", results: [] } : {}),
    createdAt: iso(row.created_at), finishedAt: row.finished_at ? iso(row.finished_at) : null,
  });
}
export async function codingHistory(pool: Pool, questionId: string) {
  const { rows } = await pool.query<Row>("SELECT * FROM coding_attempts WHERE question_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20", [questionId]);
  return rows.map(attempt);
}
export async function executeCoding(pool: Pool, request: CodingRequest) {
  const suite = codingSuite(request.questionId, request.mode);
  if (!suite) throw new CodingError("Execution is not available for this problem yet.", 400, "unsupported_problem");
  if (!runnerConfigured()) throw new CodingError("The code runner is not connected yet. Your code is kept in this browser.", 503, "runner_unconfigured");
  const inputHash = createHash("sha256").update(JSON.stringify(request)).digest("hex");
  const initial = { results: [], output: "", message: "Waiting for the runner.", runtime: "", timeMs: null, memoryKb: null };
  const client = await pool.connect(); let reserved: CodingAttempt;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('deems-coding-run'))");
    const existing = await client.query<Row>("SELECT * FROM coding_attempts WHERE id=$1", [request.attemptId]);
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== inputHash) throw new CodingError("This run ID was already used for different code. Start a new run.", 409, "run_id_reused");
      const previous = attempt(existing.rows[0]);
      await client.query("COMMIT");
      return { attempt: previous, saved: true };
    }
    const counts = await client.query<{recent:string;running:string}>(`SELECT count(*) FILTER(WHERE created_at>now()-interval '1 minute') AS recent,
      count(*) FILTER(WHERE status='queued' AND created_at>now()-interval '45 seconds') AS running FROM coding_attempts WHERE created_at>now()-interval '1 minute'`);
    if (Number(counts.rows[0].running)>0) throw new CodingError("A run is already in progress. Wait for it to finish.", 429, "run_in_progress");
    if (Number(counts.rows[0].recent)>=10) throw new CodingError("You have run code ten times in the last minute. Try again shortly.", 429, "rate_limited");
    const inserted = await client.query<Row>(`INSERT INTO coding_attempts(id,question_id,language,mode,source_code,request_hash,suite_version,status,result)
      VALUES($1,$2,$3,$4,$5,$6,$7,'queued',$8) RETURNING *`, [request.attemptId, request.questionId, request.language, request.mode, request.code, inputHash, suite.version, JSON.stringify(initial)]);
    reserved = attempt(inserted.rows[0]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }

  const result = { ...reserved, status: "runner_error" as CodingAttempt["status"], message: "The code runner could not finish this run.", finishedAt: new Date().toISOString() };
  try {
    const execution = await runJudge0(request.language, executionSource(request.language, request.code, suite.functionName), JSON.stringify(suite.cases.map(({id,args}) => ({id,args}))));
    result.runtime = execution.runtime;
    const seconds = Number(execution.time);
    result.timeMs = execution.time != null && Number.isFinite(seconds) && seconds>=0 ? Math.round(seconds*1000) : null;
    result.memoryKb = execution.memory != null && execution.memory>=0 ? execution.memory : null;
    result.output = [execution.compile_output, execution.stderr, execution.message].filter(Boolean).join("\n").slice(0,16000);
    if (execution.status?.id === 3) {
      result.results = compareResults(request.questionId, suite.cases, execution.stdout ?? "");
      result.status = result.results.some(row => row.status === "runtime_error") ? "runtime_error" : result.results.every(row => row.status === "passed") ? "passed" : "wrong_answer";
      result.message = `${result.results.filter(row => row.status === "passed").length} of ${suite.cases.length} tests passed.`;
    } else {
      result.status = execution.status?.id === 5 ? "time_limit" : execution.status?.id === 13 ? "runner_error" : "runtime_error";
      result.message = result.status === "time_limit" ? "Time limit exceeded. The run was stopped." : result.status === "runner_error" ? "The runner could not execute this submission." : "The program stopped before all test results were returned.";
      result.results = suite.cases.map(test => ({ ...test, status: "not_run", actual: null, error: null }));
    }
  } catch (error) { result.message = error instanceof Error ? error.message.slice(0,2000) : "The code runner is unavailable. Your code is kept."; }
  result.finishedAt = new Date().toISOString();
  const checked = codingAttemptSchema.parse(result);
  const { results, output, message, runtime, timeMs, memoryKb } = checked;
  try {
    const saved = await pool.query<Row>("UPDATE coding_attempts SET status=$2,result=$3,finished_at=greatest(now(),created_at) WHERE id=$1 AND status='queued' RETURNING *", [request.attemptId, checked.status, JSON.stringify({results,output,message,runtime,timeMs,memoryKb})]);
    return { attempt: saved.rows[0] ? attempt(saved.rows[0]) : checked, saved: saved.rowCount===1 };
  } catch { return { attempt: checked, saved: false }; }
}
