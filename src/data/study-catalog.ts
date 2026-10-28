import { z } from "zod";
import { studyCourses } from "./study-courses";
import { exercises } from "./prep";

export const learningTopics = ["Coding", "AI & systems", "Frameworks & tools", "Team management", "Interview skills"] as const;
export const courseDetailsSchema = z.object({
  topic: z.enum(learningTopics), level: z.enum(["Foundations", "Intermediate"]),
  outcomes: z.array(z.string().min(1).max(300)).min(1).max(5),
  practiceIds: z.array(z.string().min(1).max(80)).max(3),
  deliverable: z.string().min(1).max(400),
});
export const studyPathSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/), version: z.literal(1),
  title: z.string().min(1).max(160), description: z.string().min(1).max(400),
  topic: z.enum(learningTopics), theme: z.enum(["blue", "purple", "green", "gold"]),
  level: z.enum(["Foundations", "Intermediate"]),
  courseIds: z.array(z.string().min(1).max(80)).min(2).max(10),
  outcomes: z.array(z.string().min(1).max(300)).min(1).max(5),
});
export type StudyPath = z.infer<typeof studyPathSchema>;
export type CourseDetails = z.infer<typeof courseDetailsSchema>;

export const courseDetails: Record<string, CourseDetails> = z.record(z.string(), courseDetailsSchema).parse({
  "reliable-systems": { topic: "AI & systems", level: "Intermediate", outcomes: ["Trace a durable agent workflow", "Handle uncertain writes and retries", "Recover streaming state after a disconnect"], practiceIds: ["design-agent-run", "code-events"], deliverable: "A system sketch and failure-recovery plan, or a reducer that handles duplicate and missing events." },
  "trusted-agents": { topic: "AI & systems", level: "Intermediate", outcomes: ["Trace identity and tenant boundaries", "Keep tool authorization in trusted code"], practiceIds: ["design-agent-run"], deliverable: "An architecture sketch that identifies tenant boundaries, tool permissions, and approval checks." },
  "ai-evaluation": { topic: "AI & systems", level: "Intermediate", outcomes: ["Define success before comparing changes", "Separate observations from release claims"], practiceIds: ["design-agent-run"], deliverable: "A written evaluation and rollout plan for the agent-workbench scenario." },
  "coding-reasoning": { topic: "Coding", level: "Foundations", outcomes: ["Clarify a problem with a concrete example", "Explain algorithm growth", "Check useful boundary cases"], practiceIds: ["code-idempotency", "algo-intervals"], deliverable: "An implementation with example inputs, expected outcomes, and a short explanation of its limits." },
});

export const studyPaths: StudyPath[] = studyPathSchema.array().parse([
  { id: "reliable-ai-apps", version: 1, title: "Build reliable AI applications", description: "Design the workflow, protect its authority, and evaluate what changed.", topic: "AI & systems", theme: "purple", level: "Intermediate", courseIds: ["reliable-systems", "trusted-agents", "ai-evaluation"], outcomes: ["Design for retries and recovery", "Constrain data access and tool authority", "Make a release decision using evidence"] },
  { id: "dependable-software", version: 1, title: "Ship dependable software", description: "Work from a clear coding contract to systems that recover when something fails.", topic: "Coding", theme: "blue", level: "Intermediate", courseIds: ["coding-reasoning", "reliable-systems"], outcomes: ["Reason through examples before implementation", "Choose a simple algorithm", "Connect code behavior to durable system boundaries"] },
]);

for (const course of studyCourses) {
  const details = courseDetails[course.id];
  if (!details || details.practiceIds.some(id => !exercises.some(exercise => exercise.id === id))) throw new Error(`Course ${course.id} has invalid catalog references`);
}
for (const path of studyPaths) {
  if (new Set(path.courseIds).size !== path.courseIds.length || path.courseIds.some(id => !studyCourses.some(course => course.id === id))) throw new Error(`Path ${path.id} has invalid course membership`);
}
