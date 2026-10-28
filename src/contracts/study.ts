import { z } from "zod";

const id = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
export const studyCheckSchema = z.object({
  id, prompt: z.string().min(1).max(2000),
  options: z.array(z.object({ id, text: z.string().min(1).max(1000) })).min(2).max(5),
  answerId: id, explanation: z.string().min(1).max(4000), sourceSectionTitle: z.string().min(1),
}).refine(check => new Set(check.options.map(option => option.id)).size === check.options.length && check.options.some(option => option.id === check.answerId), "Check options need unique IDs and a matching answer.");
export const studyLessonSchema = z.object({
  id, guideId: id, title: z.string().min(1), description: z.string().min(1),
  checks: z.array(studyCheckSchema).min(1).max(5),
});
export const studyCourseSchema = z.object({
  id, version: z.literal(1), title: z.string().min(1), description: z.string().min(1),
  theme: z.enum(["blue", "purple", "green", "gold"]), illustration: z.number().int().min(0).max(3),
  lessons: z.array(studyLessonSchema).min(1),
});
export const studyCheckResultSchema = z.object({
  checkId: id, selectedOptionId: id.nullable(), correct: z.boolean(), revealed: z.boolean(),
  attempts: z.number().int().min(0).max(100),
}).strict();
export const studyProgressSchema = z.object({
  version: z.literal(1), contentVersion: z.literal(1), courseId: id, lessonId: id,
  completedAt: z.iso.datetime({ offset: true }),
  checks: z.array(studyCheckResultSchema).min(1).max(5),
}).strict();
export type StudyCourse = z.infer<typeof studyCourseSchema>;
export type StudyLesson = z.infer<typeof studyLessonSchema>;
export type StudyCheck = z.infer<typeof studyCheckSchema>;
export type StudyCheckResult = z.infer<typeof studyCheckResultSchema>;
export type StudyProgress = z.infer<typeof studyProgressSchema>;
export type StudyTab = "My learning" | "Courses" | "Quizzes" | "Guides" | "Flashcards";
export const studyRouteKey = "interview-study-course-route-v1";
export type StudyLaunch = { courseId?: string; pathId?: string; lessonId?: string; mode?: "course" | "quiz" };
export const learningSelectionSchema = z.object({
  version: z.literal(1), kind: z.enum(["course", "path"]), id,
  saved: z.boolean(), addedAt: z.iso.datetime({ offset: true }),
  lastOpenedAt: z.iso.datetime({ offset: true }).optional(),
  lessonId: id.optional(), mode: z.enum(["course", "quiz"]).optional(),
}).strict();
export type LearningSelection = z.infer<typeof learningSelectionSchema>;
export const learningSelectionKey = (kind: LearningSelection["kind"], itemId: string) => `study:learning:${kind}:${itemId}`;
export function readLearningSelection(settings: Record<string, string>, kind: LearningSelection["kind"], itemId: string): LearningSelection | null {
  try {
    const parsed = learningSelectionSchema.safeParse(JSON.parse(settings[learningSelectionKey(kind, itemId)] ?? "null"));
    return parsed.success && parsed.data.kind === kind && parsed.data.id === itemId ? parsed.data : null;
  } catch { return null; }
}
export const studyProgressKey = (lessonId: string) => `study:lesson:${lessonId}`;
export function readStudyProgress(settings: Record<string, string>, lessonId: string): StudyProgress | null {
  try {
    const parsed = studyProgressSchema.safeParse(JSON.parse(settings[studyProgressKey(lessonId)] ?? "null"));
    return parsed.success && parsed.data.lessonId === lessonId ? parsed.data : null;
  } catch { return null; }
}
