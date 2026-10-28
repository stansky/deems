import { practiceAttemptSchema } from "./practice";
import { z } from "zod";
import { careerStages } from "@/domains/career/contracts";
import { commandMetaSchema } from "@/lib/command-validation";
import { commandResultSchema, errorSchema, recordRevisionSchema } from "./career";
import { studySettingError } from "@/lib/study-progress-validation";

const id = z.string().min(1).max(120);
const short = z.string().max(500);
const long = z.string().max(100_000);
const isoTime = z.iso.datetime({ offset: true });

export const workspaceApplicationSchema = z.object({
  revision: z.number().int().nonnegative().optional(),
  id: z.string(), roleId: z.string(), company: z.string(), title: z.string(),
  stage: z.string(), nextAction: z.string(), notes: z.string(), updatedAt: z.string().optional(),
});
export const workspaceReviewSchema = z.object({
  cardId: z.string(), rating: z.enum(["again", "good"]), reviewedAt: z.string(), dueAt: z.string(),
  // FSRS state is owned by ts-fsrs and intentionally remains opaque here.
  fsrs: z.unknown().optional(),
});
export const workspaceSessionSchema = z.object({
  id: z.string(), exerciseId: z.string(), mode: z.string(), notes: z.string(), code: z.string(),
  elapsed: z.number().int(), completedAt: z.string(), selfReview: z.string(),
});
export const workspaceActivitySchema = z.object({
  id: z.string(), applicationId: z.string(), kind: z.string(), body: z.string(), createdAt: z.string(),
});
export const workspaceSavedDocumentSchema = z.object({
  id: z.string(), applicationId: z.string(), company: z.string(), title: z.string(), kind: z.string(),
  body: z.string(), sourceUrl: z.string(), sourceDate: z.string(), capturedAt: z.string(),
  techStack: z.array(z.string()), requirements: z.array(z.string()),
});
/** Runtime validation for the current GET /api/workspace response. Read values are not capped. */
export const workspaceStateSchema = z.object({
  commandResult: commandResultSchema.optional(),
  noteRevisions: z.record(z.string(), z.number()).optional(),
  careerRevisions: z.array(recordRevisionSchema).optional(),
  applications: z.array(workspaceApplicationSchema),
  reviews: z.array(workspaceReviewSchema),
  sessions: z.array(workspaceSessionSchema),
  practiceAttempts: z.array(practiceAttemptSchema).optional(),
  activities: z.array(workspaceActivitySchema),
  notes: z.record(z.string(), z.string()),
  settings: z.record(z.string(), z.string()),
  documents: z.array(workspaceSavedDocumentSchema).optional(),
});

export type WorkspaceResponse = z.infer<typeof workspaceStateSchema>;

/** Additive error envelope used by workspace handlers. */
export const workspaceErrorSchema = errorSchema;

const applicationMutationDataSchema = z.object({
  id, roleId: id, company: z.string().min(1).max(500), title: z.string().min(1).max(500),
  stage: z.enum(careerStages), nextAction: short, notes: long, updatedAt: isoTime.optional(),
  revision: z.number().int().nonnegative().optional(),
});

/** Current POST /api/workspace request validation, with meta required on revision-protected writes. */
export const workspaceMutationSchema = z.discriminatedUnion("action", [
  z.object({ meta: commandMetaSchema, action: z.literal("application"), data: applicationMutationDataSchema }),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("activity"), data: z.object({
    id, applicationId: id, kind: short, body: z.string().min(1).max(100_000), createdAt: isoTime,
  }) }),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("review"), data: z.object({
    cardId: id, rating: z.enum(["again", "good"]), reviewedAt: isoTime, dueAt: isoTime.optional(),
  }) }),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("session"), data: z.object({
    id, exerciseId: id, mode: z.enum(["Coach", "Mock"]), notes: long,
    code: z.string().max(1_000_000), elapsed: z.number().int().min(0).max(86_400),
    completedAt: isoTime, selfReview: long,
  }) }),
  z.object({ meta: commandMetaSchema, action: z.literal("note"), data: z.object({ key: id, value: long }) }),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("setting"), data: z.object({ key: id, value: long }).superRefine((data, context) => {
    const message = studySettingError(data.key, data.value);
    if (message) context.addIssue({ code: "custom", path: ["value"], message });
  }) }),
  z.object({ meta: commandMetaSchema.optional(), action: z.literal("document"), data: z.object({
    id, applicationId: id, company: z.string().min(1).max(500), title: z.string().min(1).max(500),
    kind: short, body: z.string().min(1).max(100_000),
    sourceUrl: z.union([z.literal(""), z.url().refine(value => /^https?:\/\//i.test(value))]),
    sourceDate: short, capturedAt: isoTime.optional(), techStack: z.array(z.string().max(150)).max(80),
    requirements: z.array(z.string().max(2_000)).max(80),
  }) }),
]);

export type WorkspaceRequest = z.infer<typeof workspaceMutationSchema>;
