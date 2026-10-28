import type { z } from "zod";
import type * as schemas from "@/contracts/career";
import type { commandMetaSchema } from "@/lib/command-validation";
export const careerStages = ["Interested", "Applied", "Recruiter screen", "Interviewing", "Technical interview", "In progress", "Offer", "Rejected", "Withdrawn", "Needs review"] as const;
export type CareerStage = typeof careerStages[number];
export type BoardStage = "prospect" | "active" | "offer" | "rejected" | "withdrawn" | "needs-review";
export function boardStage(stage: string): BoardStage {
  if (stage === "Interested") return "prospect";
  if (["Applied", "Recruiter screen", "Interviewing", "Technical interview", "In progress"].includes(stage)) return "active";
  if (stage === "Offer") return "offer";
  if (stage === "Rejected") return "rejected";
  if (stage === "Withdrawn") return "withdrawn";
  return "needs-review";
}
export type CommandMeta = z.infer<typeof commandMetaSchema>;
export type CareerCandidacy = z.infer<typeof schemas.careerCandidacySchema>;
export type RecordRevision = z.infer<typeof schemas.recordRevisionSchema>;
export type CommandResult = z.infer<typeof schemas.commandResultSchema>;
