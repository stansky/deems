import { z } from "zod";

export const personalStorySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  company: z.string(),
  summary: z.string(),
  talkingPoints: z.array(z.string()),
  followUps: z.array(z.string()),
  source: z.string(),
}).strict();

export const personalPrepResponseSchema = z.object({
  stories: z.array(personalStorySchema),
}).strict();

export type PersonalStory = z.infer<typeof personalStorySchema>;
