import { z } from "zod";

export const codingLanguageSchema = z.enum(["javascript", "python"]);
export const codingModeSchema = z.enum(["examples", "submit"]);
export const codingStatusSchema = z.enum(["queued", "passed", "wrong_answer", "runtime_error", "time_limit", "runner_error"]);
const value = z.json();
export const codingCaseSchema = z.object({
  id: z.string().max(80), name: z.string().max(160), args: z.array(value).max(8), expected: value,
}).strict();
export const codingProblemSchema = z.object({
  id: z.string().max(120), functionName: z.string().max(80), parameters: z.array(z.string()).max(8),
  starter: z.object({ javascript: z.string(), python: z.string() }),
  examples: z.array(codingCaseSchema).max(3), totalCases: z.number().int().positive().max(30),
}).strict();
export const codingRequestSchema = z.object({
  attemptId: z.uuid(), questionId: z.string().min(1).max(120),
  language: codingLanguageSchema, mode: codingModeSchema, code: z.string().min(1).max(32000).regex(/^[^\u0000]*$/),
}).strict();
export const codingCaseResultSchema = codingCaseSchema.extend({
  status: z.enum(["passed", "wrong_answer", "runtime_error", "not_run"]),
  actual: value.nullable(), error: z.string().max(2000).nullable(),
}).strict();
export const codingAttemptSchema = codingRequestSchema.extend({
  status: codingStatusSchema, suiteVersion: z.string().regex(/^[a-f0-9]{64}$/),
  results: z.array(codingCaseResultSchema).max(30), output: z.string().max(16000),
  message: z.string().max(2000), runtime: z.string().max(160),
  timeMs: z.number().nonnegative().nullable(), memoryKb: z.number().nonnegative().nullable(),
  createdAt: z.iso.datetime({ offset: true }), finishedAt: z.iso.datetime({ offset: true }).nullable(),
}).strict();
export const codingResponseSchema = z.object({ attempt: codingAttemptSchema, saved: z.boolean() }).strict();
export const codingHistorySchema = z.object({
  configured: z.boolean(), problem: codingProblemSchema.nullable(), attempts: z.array(codingAttemptSchema).max(20),
}).strict();
export type CodingLanguage = z.infer<typeof codingLanguageSchema>;
export type CodingMode = z.infer<typeof codingModeSchema>;
export type CodingCase = z.infer<typeof codingCaseSchema>;
export type CodingCaseResult = z.infer<typeof codingCaseResultSchema>;
export type CodingRequest = z.infer<typeof codingRequestSchema>;
export type CodingAttempt = z.infer<typeof codingAttemptSchema>;
export type CodingProblem = z.infer<typeof codingProblemSchema>;
