import { z } from "zod";

const recallContextSchema = z.object({
  title:z.string().min(1).max(160), description:z.string().min(1).max(1000),
  steps:z.array(z.string().min(1).max(80)).min(2).max(4),
}).strict();

// Fictional teaching context does not change the card, answer, or review schedule.
export const recallContexts = z.record(z.string().min(1).max(80), recallContextSchema).parse({
  f01: {
    title:"Design an AI research assistant.",
    description:"A small team wants research briefs that link back to their sources. What would you clarify before choosing the architecture?",
    steps:["Research request","Find sources","Draft brief"],
  },
});
