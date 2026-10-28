import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { exercises } from "@/data/prep";
import { practiceAttemptSchema, practiceCommandSchema, type PracticeAttempt, type PracticeCommand, type PracticeSave } from "@/contracts/practice";
import { snapshotExercise } from "./content";

export class PracticeError extends Error {
  constructor(message: string, public status: number, public code: string, public currentRevision?: number) {
    super(message);
    this.name = "PracticeError";
  }
}

type Row = Record<string, any>;
type Db = Pool | PoolClient;
const now = () => new Date().toISOString();
const fail = (message: string, status: number, code: string): never => { throw new PracticeError(message, status, code); };
const json = (value: unknown): any => typeof value === "string" ? JSON.parse(value) : value;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function hash(value: unknown): string { return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }
async function one<T extends Row = Row>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  const result = await db.query<T>(sql, params);
  return result.rows[0];
}
function validMeta(meta: PracticeCommand["meta"]): void {
  if (!meta || !Number.isInteger(meta.expectedRevision) || meta.expectedRevision < 0 || !meta.producer?.trim() || !meta.key?.trim()) {
    fail("A valid revision and command retry key are required. Reload and retry.", 428, "precondition_required");
  }
}
function asAttempt(value: unknown): PracticeAttempt { return practiceAttemptSchema.parse(json(value)); }
function assertRevision(expected: number, actual: number): void {
  if (expected !== actual) throw new PracticeError("This practice attempt changed since you opened it. Review the current version before retrying.", 409, "revision_conflict", actual);
}

async function executeSave(client: PoolClient, command: Extract<PracticeCommand, {action:"save"}>): Promise<PracticeAttempt> {
  const data: PracticeSave = command.data;
  if (command.meta.expectedRevision !== 0) assertRevision(command.meta.expectedRevision, 0);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`practice-session:${data.id}`]);
  if (await one(client, "SELECT id FROM sessions WHERE id=$1 FOR UPDATE", [data.id])) fail("This session ID has already been used.", 409, "session_id_reused");
  const exercise = exercises.find(item => item.id === data.exerciseId);
  if (!exercise) throw new PracticeError("This exercise was not found.", 404, "exercise_not_found");
  const languageMatches = exercise.kind === "System design" ? data.language === "design" : data.language !== "design";
  if (!languageMatches) fail("The selected language does not match this exercise.", 400, "invalid_language");
  const canonicalContent = snapshotExercise(exercise, data.language);
  if (JSON.stringify(canonical(data.content)) !== JSON.stringify(canonical(canonicalContent))) fail("The exercise snapshot no longer matches the catalog. Reload the exercise before saving.", 409, "exercise_snapshot_mismatch");
  if (data.assistance.hintsRevealed > exercise.hints.length) fail("The reported hint count exceeds the available hints.", 400, "invalid_assistance");
  if (new Set(data.assessment.checkedItems).size !== data.assessment.checkedItems.length || data.assessment.checkedItems.some(item => !exercise.rubric.includes(item))) fail("Checked assessment items must be unique items from this exercise rubric.", 400, "invalid_assessment");

  let roleId: string | null = null;
  let planStepId: string | null = null;
  if (data.origin) {
    roleId = data.origin.roleId; planStepId = data.origin.planStepId;
    const roleRow = await one<{data: Row}>(client, "SELECT data FROM target_roles WHERE id=$1 FOR SHARE", [roleId]);
    if (!roleRow) throw new PracticeError("This target role was not found.", 404, "origin_not_found");
    const role = json(roleRow.data);
    const step = role.steps?.find((item: Row) => item.id === planStepId);
    if (!step) fail("This plan step was not found in the selected role.", 400, "invalid_origin");
    if (!step.resources?.some((resource: Row) => resource.kind === "exercise" && resource.id === data.exerciseId)) fail("The selected plan step does not include this exercise.", 400, "invalid_origin");
  }

  const savedAt = now();
  const attempt = asAttempt({
    exerciseId: data.exerciseId, language: data.language, origin: data.origin,
    content: canonicalContent, assistance: data.assistance, assessment: data.assessment,
    nextAction: data.nextAction, sessionId: data.id, contentVersion: hash(canonical(canonicalContent)), savedAt,
    revision: 1, attachment: null,
  });
  await client.query("INSERT INTO sessions(id,exercise_id,mode,notes,code,elapsed,completed_at,self_review) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [data.id, data.exerciseId, data.mode, data.notes, data.code, data.elapsed, data.completedAt, data.selfReview]);
  await client.query("INSERT INTO practice_attempts(session_id,role_id,plan_step_id,exercise_id,data,revision,saved_at) VALUES($1,$2,$3,$4,$5,1,$6)",
    [data.id, roleId, planStepId, data.exerciseId, JSON.stringify(attempt), savedAt]);
  return attempt;
}

async function executeAttach(client: PoolClient, command: Extract<PracticeCommand, {action:"attach"}>): Promise<PracticeAttempt> {
  const { sessionId, requirementId } = command.data;
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`practice-session:${sessionId}`]);
  const row = await one<{data: unknown; revision: number; role_id: string | null}>(client, "SELECT data,revision,role_id FROM practice_attempts WHERE session_id=$1 FOR UPDATE", [sessionId]);
  if (!row) throw new PracticeError("This practice attempt was not found.", 404, "attempt_not_found");
  const actual = Number(row.revision);
  assertRevision(command.meta.expectedRevision, actual);
  const current = asAttempt(row.data);
  if (current.origin === null || row.role_id === null) fail("Only an attempt with a saved target role origin can be attached.", 400, "origin_required");
  if (requirementId !== null) {
    const roleRow = await one<{data: Row}>(client, "SELECT data FROM target_roles WHERE id=$1 FOR SHARE", [row.role_id]);
    const role = roleRow && json(roleRow.data);
    if (!role?.requirements?.some((item: Row) => item.id === requirementId)) fail("The selected requirement does not belong to this attempt's role.", 400, "invalid_requirement");
  }
  if ((current.attachment?.requirementId ?? null) === requirementId) return current;
  const recordedAt = now();
  const next = asAttempt({ ...current, revision: actual + 1, attachment: requirementId === null ? null : { requirementId, attachedAt: recordedAt } });
  await client.query("UPDATE practice_attempts SET data=$2,revision=$3 WHERE session_id=$1", [sessionId, JSON.stringify(next), actual + 1]);
  await client.query("INSERT INTO practice_evidence_revisions(session_id,revision,previous_requirement_id,requirement_id,recorded_at) VALUES($1,$2,$3,$4,$5)",
    [sessionId, actual + 1, current.attachment?.requirementId ?? null, requirementId, recordedAt]);
  return next;
}

export async function executePracticeCommand(pool: Pool, input: PracticeCommand): Promise<PracticeAttempt> {
  let command: PracticeCommand;
  try { command = practiceCommandSchema.parse(input); }
  catch { throw new PracticeError("The practice command is invalid.", 400, "invalid_input"); }
  validMeta(command.meta);
  const action = command.action;
  const canonicalInput = canonical({ action, data: command.data, expectedRevision: command.meta.expectedRevision });
  const inputHash = hash(canonicalInput);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`practice-command:${command.meta.producer}:${action}:${command.meta.key}`]);
    const receipt = await one<{input_hash: string; result: unknown}>(client, "SELECT input_hash,result FROM practice_command_receipts WHERE producer=$1 AND action=$2 AND key=$3 FOR UPDATE", [command.meta.producer, action, command.meta.key]);
    if (receipt) {
      if (receipt.input_hash !== inputHash) fail("This retry key was already used for different input.", 409, "idempotency_key_reused");
      await client.query("COMMIT");
      return asAttempt(receipt.result);
    }
    let result: PracticeAttempt;
    if (command.action === "save") result = await executeSave(client, command);
    else result = await executeAttach(client, command);
    await client.query("INSERT INTO practice_command_receipts(producer,action,key,input_hash,result,recorded_at) VALUES($1,$2,$3,$4,$5,$6)",
      [command.meta.producer, action, command.meta.key, inputHash, JSON.stringify(result), now()]);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof PracticeError) throw error;
    throw new PracticeError("Your practice change has not been confirmed. Retry with the same command key when your workspace is available.", 503, "save_unconfirmed");
  } finally { client.release(); }
}

export async function readPracticeAttempts(pool: Pool): Promise<PracticeAttempt[]> {
  try {
    const result = await pool.query<{data: unknown}>("SELECT data FROM practice_attempts ORDER BY saved_at DESC,session_id");
    return result.rows.map(row => asAttempt(row.data));
  } catch {
    throw new PracticeError("Practice attempts could not be loaded from your workspace.", 503, "read_unavailable");
  }
}
