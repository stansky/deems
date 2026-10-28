import { z } from "zod";
import { careerStages } from "@/domains/career/contracts";
import { commandMetaSchema } from "@/lib/command-validation";
import { commandResultSchema, errorSchema, recordRevisionSchema } from "./career";

const id = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const note = z.string().max(16_000);
const boardStage = z.enum(["prospect", "active", "offer", "rejected", "withdrawn", "needs-review"]);
const isoTime = z.iso.datetime({ offset: true });
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date.");

export const targetResourceSchema = z.object({ kind: z.enum(["guide", "exercise", "algorithm", "reference", "source"]), id: z.string(), title: z.string() });
export const targetRequirementSchema = z.object({ id: z.string(), title: z.string(), detail: z.string(), evidence: z.string(), gap: z.string(), sourceUrl: z.string() });
export const targetStepSchema = z.object({
  id: z.string(), phase: z.enum(["Understand", "Practice", "Demonstrate", "Interview"]),
  title: z.string(), detail: z.string(), doneWhen: z.string(), minutes: z.number(), resources: z.array(targetResourceSchema),
});
export const targetRoleSchema = z.object({
  id: z.string(), companyId: z.string(), applicationId: z.string().optional(), title: z.string(),
  priority: z.enum(["Primary", "Adjacent", "Stretch", "Explore"]), rationale: z.string(), sourceUrl: z.string(),
  checkedAt: z.string(), publishedProcess: z.array(z.string()), stack: z.array(z.string()),
  requirements: z.array(targetRequirementSchema), steps: z.array(targetStepSchema),
});
export const targetCompanySchema = z.object({
  id: z.string(), name: z.string(), summary: z.string(), careersUrl: z.string(),
  researchStatus: z.enum(["Reviewed", "To research", "Personal source"]), focus: z.string(),
});
export const targetSourceSchema = z.object({ id: z.string(), companyId: z.string(), title: z.string(), provenance: z.string(), capturedAt: z.string(), body: z.string() });
export const targetProgressSchema = z.object({ roleId: z.string(), itemId: z.string(), status: z.enum(["todo", "working", "done"]), evidence: z.string(), updatedAt: z.string() });
export const targetRoleStateSchema = z.object({
  roleId: z.string(), stage: boardStage, detailedStage: z.enum(careerStages).optional(),
  revision: z.number().int().nonnegative().optional(), notes: z.string(), updatedAt: z.string(),
});
export const targetAssessmentSchema = z.object({ roleId: z.string(), requirementId: z.string(), level: z.enum(["unassessed", "strength", "developing", "gap"]), evidence: z.string(), updatedAt: z.string() });
export const targetInterviewSchema = z.object({
  revision: z.number().int().nonnegative().optional(), id: z.string(), companyId: z.string(), roleId: z.string(),
  title: z.string(), scheduledAt: z.string().nullable(), status: z.enum(["target", "scheduled", "completed", "cancelled"]),
  format: z.string(), notes: z.string(), updatedAt: z.string(),
});
export const targetDebriefSchema = z.object({
  revision: z.number().int().nonnegative().optional(), id: z.string(), roleId: z.string(), interviewId: z.string().nullable(),
  occurredOn: z.string(), outcome: z.enum(["pending", "passed", "rejected", "practice"]), prompt: z.string(),
  worked: z.string(), struggled: z.string(), feedback: z.string(), nextAction: z.string(), requirementIds: z.array(z.string()),
  resolvedAt: z.string().nullable(), createdAt: z.string(),
});
/** Runtime validation for current GET /api/targets responses. Read data has no invented length limits. */
export const targetStateSchema = z.object({
  commandResult: commandResultSchema.optional(),
  revisions: z.array(recordRevisionSchema).optional(),
  companies: z.array(targetCompanySchema), roles: z.array(targetRoleSchema), sources: z.array(targetSourceSchema),
  progress: z.array(targetProgressSchema), roleStates: z.array(targetRoleStateSchema), assessments: z.array(targetAssessmentSchema),
  interviews: z.array(targetInterviewSchema), debriefs: z.array(targetDebriefSchema),
});

export type TargetResponse = z.infer<typeof targetStateSchema>;

/** Additive error envelope used by target handlers. */
export const targetErrorSchema = errorSchema;

const interviewInputSchema = z.object({
  id, companyId: id, roleId: id, title: z.string().trim().min(1).max(240),
  scheduledAt: isoTime.nullable(), status: z.enum(["target", "scheduled", "completed", "cancelled"]),
  format: z.string().trim().max(240), notes: note,
}).strict().refine(value => value.status !== "scheduled" || value.scheduledAt !== null, {
  message: "A scheduled interview needs a date and time.", path: ["scheduledAt"],
});

/** Current POST /api/targets request validation with meta required on career-command writes. */
export const targetMutationSchema = z.discriminatedUnion("action", [
  z.object({ meta: commandMetaSchema, action: z.literal("roleState"), data: z.object({
    roleId: id, stage: z.enum(["prospect", "active", "offer", "rejected", "withdrawn", "needs-review"]),
    detailedStage: z.enum(careerStages).optional(), notes: note,
  }).strict() }).strict(),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("progress"), data: z.object({
    roleId: id, itemId: id, status: z.enum(["todo", "working", "done"]), evidence: note,
  }).strict() }).strict(),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("assessment"), data: z.object({
    roleId: id, requirementId: id, level: z.enum(["unassessed", "strength", "developing", "gap"]), evidence: note,
  }).strict() }).strict(),
  z.object({ meta: commandMetaSchema, action: z.literal("interview"), data: interviewInputSchema }).strict(),
  z.object({ meta: commandMetaSchema, action: z.literal("debrief"), data: z.object({
    id, roleId: id, interviewId: id.nullable(), occurredOn: day,
    outcome: z.enum(["pending", "passed", "rejected", "practice"]), prompt: note, worked: note,
    struggled: note, feedback: note, nextAction: z.string().max(4_000),
    requirementIds: z.array(id).max(30).refine(values => new Set(values).size === values.length, "Select each requirement once."),
  }).strict() }).strict(),
  z.object({ meta: commandMetaSchema, action: z.literal("resolve"), data: z.object({ id, resolved: z.boolean() }).strict() }).strict(),
]);

export type TargetRequest = z.infer<typeof targetMutationSchema>;
