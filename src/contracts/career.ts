import { z } from "zod";
import { careerStages } from "@/domains/career/contracts";

/** Canonical shared command result. Content remains opaque for legacy snapshot compatibility. */
export const commandResultSchema = z.object({
  entityType: z.string(), entityId: z.string(), revision: z.number().int(), content: z.unknown(),
});

/** Canonical history row. Historical content is intentionally not interpreted here. */
export const recordRevisionSchema = z.object({
  entityType: z.string(), entityId: z.string(), revision: z.number().int(),
  previousRevision: z.number().int().nullable(), recordedAt: z.string(), producer: z.string(),
  reason: z.string(), commandKey: z.string().nullable(), content: z.unknown(),
});

export const careerCandidacySchema = z.object({
  id: z.string(), roleId: z.string().nullable(), applicationId: z.string().nullable(),
  stage: z.enum(careerStages), pipelineNotes: z.string(), notes: z.string(), nextAction: z.string(),
  company: z.string(), title: z.string(), submittedAt: z.string().nullable(), updatedAt: z.string(),
  revision: z.number().int(),
  legacy: z.object({ application: z.unknown(), roleState: z.unknown() }),
  reconciliation: z.array(z.string()),
});

export const careerStateSchema = z.object({
  candidacies: z.array(careerCandidacySchema),
  revisions: z.array(recordRevisionSchema),
});

export const errorSchema = z.object({
  error: z.string(), code: z.string().optional(), currentRevision: z.number().int().optional(),
  details: z.object({ formErrors: z.array(z.string()), fieldErrors: z.record(z.string(), z.array(z.string())) }).optional(),
});

export type CareerResponse = z.infer<typeof careerStateSchema>;
export type CareerCandidacy = z.infer<typeof careerCandidacySchema>;
export type CareerRevision = z.infer<typeof recordRevisionSchema>;
export type CareerCommandResult = z.infer<typeof commandResultSchema>;
