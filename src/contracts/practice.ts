import { z } from "zod";
import { commandMetaSchema } from "@/lib/command-validation";

const id = z.string().min(1).max(120);
export const practiceOriginSchema = z.object({ roleId: id, planStepId: id }).strict();
export const practiceContentSchema = z.object({
  title: z.string().max(500), description: z.string().max(12000),
  kind: z.enum(["Live coding", "System design", "Algorithms"]), duration: z.number().int().positive().max(1440),
  requirements: z.array(z.string().max(4000)).max(100), rubric: z.array(z.string().max(4000)).max(100),
  hints: z.array(z.string().max(8000)).max(100),
  phases: z.array(z.object({ label: z.string().max(500), minutes: z.number().nonnegative() }).strict()).max(30),
  starter: z.string().max(100000), referenceSolution: z.string().max(100000),
}).strict();
export const practiceAssistanceSchema = z.object({
  hintsRevealed: z.number().int().min(0).max(100), referenceSolutionViewed: z.boolean(),
  otherHelp: z.enum(["unknown", "none", "ai", "person", "reference", "mixed"]),
  note: z.string().max(2000),
}).strict();
export const practiceAssessmentSchema = z.object({
  source: z.literal("self_report"), rubricVersion: z.literal(1),
  checkedItems: z.array(z.string().max(4000)).max(100),
  observedResult: z.string().max(8000), limitations: z.string().max(4000),
  execution: z.literal("not_run"),
}).strict();
export const practiceSaveSchema = z.object({
  id, exerciseId: id, mode: z.enum(["Coach", "Mock"]), notes: z.string().max(100000),
  code: z.string().max(1000000), elapsed: z.number().int().min(0).max(86400),
  completedAt: z.iso.datetime({ offset: true }), selfReview: z.string().max(100000),
  language: z.enum(["python", "javascript", "design"]), origin: practiceOriginSchema.nullable(),
  content: practiceContentSchema, assistance: practiceAssistanceSchema, assessment: practiceAssessmentSchema,
  nextAction: z.string().max(4000),
}).strict();
export const practiceAttachmentSchema = z.object({ requirementId: id, attachedAt: z.iso.datetime({ offset: true }) }).strict();
export const practiceAttemptSchema = practiceSaveSchema.omit({ id: true, notes: true, code: true, elapsed: true, completedAt: true, selfReview: true, mode: true }).extend({
  sessionId: id, contentVersion: z.string().regex(/^[0-9a-f]{64}$/), savedAt: z.iso.datetime({ offset: true }),
  revision: z.number().int().positive(), attachment: practiceAttachmentSchema.nullable(),
}).strict();
export const practiceCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), data: practiceSaveSchema, meta: commandMetaSchema }).strict(),
  z.object({ action: z.literal("attach"), data: z.object({ sessionId: id, requirementId: id.nullable() }).strict(), meta: commandMetaSchema }).strict(),
]);
export const practiceResponseSchema = z.object({ attempt: practiceAttemptSchema });
export type PracticeOrigin = z.infer<typeof practiceOriginSchema>;
export type PracticeContent = z.infer<typeof practiceContentSchema>;
export type PracticeAttempt = z.infer<typeof practiceAttemptSchema>;
export type PracticeCommand = z.infer<typeof practiceCommandSchema>;
export type PracticeSave = z.infer<typeof practiceSaveSchema>;
