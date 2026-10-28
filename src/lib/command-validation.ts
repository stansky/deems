import { z } from "zod";
export const commandMetaSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  producer: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/),
  key: z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_-]+$/),
}).strict();
