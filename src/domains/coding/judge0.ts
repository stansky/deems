import { z } from "zod";
import type { CodingLanguage } from "@/contracts/coding";

export class RunnerError extends Error {}
export function runnerConfigured() { return Boolean(process.env.DEEMS_JUDGE0_URL && process.env.DEEMS_JUDGE0_TOKEN); }
const languagesSchema = z.array(z.object({ id: z.number().int(), name: z.string() }));
const executionSchema = z.object({
  token: z.string().optional(), status: z.object({ id: z.number().int(), description: z.string() }).optional(),
  stdout: z.string().nullable().optional(), stderr: z.string().nullable().optional(),
  compile_output: z.string().nullable().optional(), message: z.string().nullable().optional(),
  time: z.union([z.string(), z.number()]).nullable().optional(), memory: z.number().nullable().optional(),
});
let runtimeCache: { key: string; expires: number; values: z.infer<typeof languagesSchema> } | undefined;
function config() {
  if (!runnerConfigured()) throw new RunnerError("The code runner is not connected yet. Your code is kept in this browser.");
  const url = new URL(process.env.DEEMS_JUDGE0_URL!);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && (process.env.VERCEL || url.protocol !== "http:"))) throw new RunnerError("The code runner configuration is invalid.");
  return { base: url.href.replace(/\/$/, ""), token: process.env.DEEMS_JUDGE0_TOKEN! };
}
async function limitedJson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new RunnerError("The code runner returned an empty response.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 128000) { await reader.cancel(); throw new RunnerError("The code runner output exceeded the limit."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function runJudge0(language: CodingLanguage, source: string, stdin: string) {
  const { base, token } = config();
  const signal = AbortSignal.timeout(25000);
  const headers = { "Content-Type": "application/json", "X-Auth-Token": token };
  async function request(path: string, body?: unknown) {
    const response = await fetch(`${base}${path}`, { method: body ? "POST" : "GET", headers, cache: "no-store", signal, redirect: "error", ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new RunnerError(response.status === 429 || response.status === 503 ? "The code runner is busy. Try again shortly." : "The code runner could not accept this run. Your code is kept.");
    return limitedJson(response);
  }
  try {
    if (!runtimeCache || runtimeCache.key !== base || runtimeCache.expires < Date.now()) runtimeCache = { key: base, expires: Date.now()+600000, values: languagesSchema.parse(await request("/languages")) };
    const choices = runtimeCache.values.filter(item => language === "python" ? /^Python \(3\./.test(item.name) : /^JavaScript \(Node\.js /.test(item.name));
    choices.sort((a,b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
    const runtime = choices[0];
    if (!runtime) throw new RunnerError(`The runner has no ${language === "python" ? "Python 3" : "Node.js"} runtime installed.`);
    let result = executionSchema.parse(await request("/submissions?base64_encoded=false&wait=true", {
      language_id: runtime.id, source_code: source, stdin,
      cpu_time_limit: 2, cpu_extra_time: 0.5, wall_time_limit: 5, memory_limit: 128000,
      stack_limit: 64000, max_processes_and_or_threads: 32, max_file_size: 64,
      enable_network: false, number_of_runs: 1,
    }));
    // Judge0 installations may return a queued token even when wait was requested.
    for (let index=0; (!result.status || result.status.id <= 2) && index<20; index++) {
      if (!result.token || !/^[a-f0-9-]{20,80}$/i.test(result.token)) throw new RunnerError("The code runner returned an invalid run ID.");
      await new Promise(resolve => setTimeout(resolve, 500));
      result = executionSchema.parse(await request(`/submissions/${result.token}?base64_encoded=false`));
    }
    if (!result.status || result.status.id <= 2) throw new RunnerError("The code runner did not finish before the deadline. Try again shortly.");
    return { ...result, runtime: runtime.name };
  } catch (error) {
    if (error instanceof RunnerError) throw error;
    throw new RunnerError(signal.aborted ? "The code runner did not respond before the deadline. Your code is kept." : "The code runner is unavailable or returned invalid output. Your code is kept.");
  }
}
