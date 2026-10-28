import { z } from "zod";

const id = z.string().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
export const publicUrlSchema = z.url().max(2048).refine(value => {
  const u = new URL(value);
  return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443");
}, "Use a public HTTPS URL without credentials or a custom port.");
export const researchFocusSchema = z.enum(["AI engineering", "Full-stack", "Forward deployed", "Backend", "Frontend", "Management"]);
export const researchProfileSchema = z.object({
  companyId: id, websiteUrl: publicUrlSchema, careersUrl: publicUrlSchema,
  linkedinUrl: publicUrlSchema.nullable(), focus: z.array(researchFocusSchema).min(1).max(6),
  overview: z.string().max(2000), pitch: z.string().max(1000),
  descriptionSourceUrl: publicUrlSchema.nullable(), updatedAt: z.string(),
});
export const researchRunSchema = z.object({
  id, companyId: id, status: z.enum(["queued", "running", "complete", "partial", "failed"]),
  requestedAt: z.string(), startedAt: z.string().nullable(), finishedAt: z.string().nullable(),
  attempts: z.number().int().min(0).max(3), error: z.string().max(2000),
});
export const researchSourceSchema = z.object({
  id, runId: id, companyId: id, kind: z.enum(["website", "careers", "linkedin", "job"]),
  url: publicUrlSchema, finalUrl: publicUrlSchema.nullable(), title: z.string().max(500),
  status: z.enum(["fetched", "blocked", "failed", "cached"]), detail: z.string().max(2000),
  capturedAt: z.string(), contentHash: z.string().max(64), excerpt: z.string().max(80000),
});
export const suggestionChecksSchema = z.object({
  officialSource: z.boolean(), detailFetched: z.boolean(), duplicateRole: z.boolean(),
  activePosting: z.enum(["verified", "unverified", "closed"]),
});
export const roleSuggestionSchema = z.object({
  id, runId: id, companyId: id, sourceId: id, title: z.string().min(1).max(240),
  url: publicUrlSchema, location: z.string().max(300), excerpt: z.string().max(4000),
  reasons: z.array(z.string().max(400)).max(12), checks: suggestionChecksSchema,
  status: z.enum(["suggested", "accepted", "dismissed"]), roleId: id.nullable(),
});
export const researchStateSchema = z.object({
  profiles: z.array(researchProfileSchema), runs: z.array(researchRunSchema),
  sources: z.array(researchSourceSchema), suggestions: z.array(roleSuggestionSchema),
});
export const researchCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createCompany"), key: id, data: z.object({
    name: z.string().trim().min(1).max(160), websiteUrl: publicUrlSchema,
    careersUrl: publicUrlSchema, linkedinUrl: publicUrlSchema.nullable(),
    focus: z.array(researchFocusSchema).min(1).max(6),
  }).strict() }).strict(),
  z.object({ action: z.literal("researchCompany"), key: id, data: z.object({
    companyId: id, websiteUrl: publicUrlSchema, careersUrl: publicUrlSchema,
    linkedinUrl: publicUrlSchema.nullable(), focus: z.array(researchFocusSchema).min(1).max(6),
  }).strict() }).strict(),
  z.object({ action: z.literal("reviewSuggestion"), key: id, data: z.object({
    suggestionId: id, decision: z.enum(["accept", "dismiss"]),
  }).strict() }).strict(),
]);
export type ResearchProfile = z.infer<typeof researchProfileSchema>;
export type ResearchRun = z.infer<typeof researchRunSchema>;
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type RoleSuggestion = z.infer<typeof roleSuggestionSchema>;
export type ResearchState = z.infer<typeof researchStateSchema>;
export type ResearchCommand = z.infer<typeof researchCommandSchema>;
