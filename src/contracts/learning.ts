import { z } from "zod";

export const knowledgeSourceSchema = z.object({ title: z.string(), url: z.string() });
export const algorithmLanguageSchema = z.enum(["python", "javascript", "go", "php"]);
export const algorithmDifficultySchema = z.enum(["Easy", "Medium", "Hard"]);
export const algorithmQuestionSchema = z.object({
  id: z.string(), title: z.string(), url: z.string(), difficulty: algorithmDifficultySchema,
  pattern: z.string(), summary: z.string(), example: z.object({ input: z.string(), output: z.string() }),
  complexity: z.object({ time: z.string(), space: z.string(), plain: z.string() }), analogy: z.string(),
  walkthrough: z.array(z.string()), concepts: z.array(z.string()),
  solutions: z.record(algorithmLanguageSchema, z.object({ code: z.string(), explanation: z.array(z.string()) })),
});
export const algorithmsResponseSchema = z.object({ questions: z.array(algorithmQuestionSchema) });
export const questionSolutionSchema = z.object({ language: algorithmLanguageSchema, code: z.string(), explanation: z.array(z.string()) });
export const questionDetailSchema = z.object({
  question: algorithmQuestionSchema.omit({ solutions: true }),
  solution: questionSolutionSchema.optional(),
  relatedKnowledge: z.array(z.object({ id: z.string(), title: z.string(), kind: z.enum(["term", "mental-math"]), url: z.string() })),
});

export const knowledgeEntrySchema = z.object({
  id: z.string(), title: z.string(), kind: z.enum(["term", "mental-math"]), category: z.string(), plain: z.string(),
  analogy: z.string(), example: z.string(), steps: z.array(z.string()), pitfalls: z.array(z.string()),
  relatedQuestionIds: z.array(z.string()), relatedTerms: z.array(z.string()), sources: z.array(knowledgeSourceSchema),
});
export const knowledgeListResponseSchema = z.object({ entries: z.array(knowledgeEntrySchema), total: z.number().int() });
export const knowledgeDetailResponseSchema = z.object({ entry: knowledgeEntrySchema });
export const knowledgeQuerySchema = z.object({
  q: z.string().trim().max(200).optional(), kind: z.enum(["term", "mental-math"]).optional(),
  category: z.string().trim().min(1).max(80).optional(),
}).strict();
export const questionDetailQuerySchema = z.object({
  language: algorithmLanguageSchema.default("python"), includeSolutions: z.enum(["true", "false"]).default("false"),
}).strict();

/** Request body for the explicit saved coaching workflow. */
export const coachInputSchema = z.object({
  questionId: z.string().min(1).max(120), language: algorithmLanguageSchema,
  message: z.string().max(4_000), mode: z.enum(["rephrase", "explain", "hint"]), revealSolution: z.boolean().default(false),
});
export const coachInput = coachInputSchema;

export const coachingAnswerSchema = z.object({
  rephrasedQuestion: z.string(), explanation: z.string(), steps: z.array(z.string()), checkQuestion: z.string(),
});
export const coachingRoutingSchema = z.object({
  style: z.enum(["systems", "steps", "visual"]), focus: z.string(), provider: z.enum(["jev", "profile"]), reason: z.string(),
});
export const coachingRecordSchema = z.object({
  id: z.string(), questionId: z.string(), language: algorithmLanguageSchema, mode: z.enum(["rephrase", "explain", "hint"]),
  message: z.string(), model: z.string(), answer: coachingAnswerSchema, createdAt: z.string(),
  routing: coachingRoutingSchema.optional(),
});
export const coachingResponseSchema = z.object({
  id: z.string(), questionId: z.string(), language: algorithmLanguageSchema, mode: z.enum(["rephrase", "explain", "hint"]),
  message: z.string(), model: z.string(), answer: coachingAnswerSchema, context: z.unknown().optional(),
  createdAt: z.string(), routing: z.unknown().optional(),
});
export const coachingHistoryResponseSchema = z.object({
  configured: z.boolean(), model: z.string(), history: z.array(coachingRecordSchema),
});

export type AlgorithmLanguage = z.infer<typeof algorithmLanguageSchema>;
export type AlgorithmQuestionData = z.infer<typeof algorithmQuestionSchema>;
export type KnowledgeEntryData = z.infer<typeof knowledgeEntrySchema>;
export type CoachRequest = z.infer<typeof coachInputSchema>;
export type CoachingAnswer = z.infer<typeof coachingAnswerSchema>;
export type CoachingRecord = z.infer<typeof coachingRecordSchema>;
export type CoachingResponse = z.infer<typeof coachingResponseSchema>;
export type CoachingHistoryResponse = z.infer<typeof coachingHistoryResponseSchema>;
