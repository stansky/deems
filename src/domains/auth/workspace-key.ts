import { createHash } from "node:crypto";

export function workspaceSchema(subject: string): string {
  if (!subject || subject.length > 128) throw new Error("Invalid account identity.");
  return `deems_${createHash("sha256").update(subject).digest("hex").slice(0, 56)}`;
}
