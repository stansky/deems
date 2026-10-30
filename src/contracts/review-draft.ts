import { z } from "zod";

// Browser-only drafts use the existing authenticated workspace storage prefix.
export const recallDraftSchema = z.object({
  version:z.literal(1), topic:z.string().max(100), dueOnly:z.boolean(),
  ids:z.array(z.string().min(1).max(80)).max(20), cursor:z.number().int().min(0).max(20),
  answers:z.record(z.string().max(80),z.object({text:z.string().max(12000),revealed:z.boolean()})).refine(value => Object.keys(value).length <= 200),
}).strict().refine(value => value.cursor <= value.ids.length && new Set(value.ids).size === value.ids.length);
export const recallDraftKey = "study-recall-draft-v1";
