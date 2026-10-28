import { learningSelectionSchema, readLearningSelection, readStudyProgress, type LearningSelection, type StudyCourse } from "@/contracts/study";
import { studyCourses } from "@/data/study-courses";
import { studyPaths, type StudyPath } from "@/data/study-catalog";

export type LearningItem = { kind: "course"; item: StudyCourse } | { kind: "path"; item: StudyPath };
export const catalogItems: LearningItem[] = [...studyPaths.map(item => ({ kind: "path" as const, item })), ...studyCourses.map(item => ({ kind: "course" as const, item }))];
export function itemCourses(entry: LearningItem): StudyCourse[] {
  return entry.kind === "course" ? [entry.item] : entry.item.courseIds.flatMap(id => studyCourses.find(course => course.id === id) ?? []);
}
export function courseProgress(course: StudyCourse, settings: Record<string, string>) {
  return course.lessons.filter(lesson => readStudyProgress(settings, lesson.id)?.courseId === course.id).length;
}
export function itemProgress(entry: LearningItem, settings: Record<string, string>) {
  const courses = itemCourses(entry);
  return { done: courses.reduce((sum, course) => sum + courseProgress(course, settings), 0), total: courses.reduce((sum, course) => sum + course.lessons.length, 0) };
}
export function isInLearning(entry: LearningItem, settings: Record<string, string>) {
  const selection = readLearningSelection(settings, entry.kind, entry.item.id);
  return selection ? selection.saved : entry.kind === "course" && courseProgress(entry.item, settings) > 0;
}
export function itemLastActivity(entry: LearningItem, settings: Record<string, string>) {
  const selection = readLearningSelection(settings, entry.kind, entry.item.id);
  return Math.max(Date.parse(selection?.lastOpenedAt ?? selection?.addedAt ?? "") || 0, ...itemCourses(entry).flatMap(course => course.lessons.map(lesson => Date.parse(readStudyProgress(settings, lesson.id)?.completedAt ?? "") || 0)));
}
export function itemStarted(entry: LearningItem, settings: Record<string, string>) {
  return itemProgress(entry, settings).done > 0 || itemCourses(entry).some(course => Boolean(readLearningSelection(settings, "course", course.id)?.lastOpenedAt));
}
export function myLearning(settings: Record<string, string>) {
  return catalogItems.filter(entry => isInLearning(entry, settings)).sort((a, b) => itemLastActivity(b, settings) - itemLastActivity(a, settings));
}
export function nextCourseLesson(course: StudyCourse, settings: Record<string, string>) {
  const selection = readLearningSelection(settings, "course", course.id);
  const current = course.lessons.find(lesson => lesson.id === selection?.lessonId && !readStudyProgress(settings, lesson.id));
  return { lesson: current ?? course.lessons.find(lesson => !readStudyProgress(settings, lesson.id)) ?? course.lessons[0], mode: current && selection?.mode === "quiz" ? "quiz" as const : "course" as const };
}
export function nextPathCourse(path: StudyPath, settings: Record<string, string>) {
  const courses = itemCourses({ kind: "path", item: path });
  return courses.find(course => courseProgress(course, settings) < course.lessons.length) ?? courses[0];
}
export function learningSelection(settings: Record<string, string>, kind: LearningSelection["kind"], id: string, saved: boolean, launch?: { lessonId: string; mode: "course" | "quiz" }): LearningSelection {
  const previous = readLearningSelection(settings, kind, id);
  const now = new Date().toISOString();
  return learningSelectionSchema.parse({ version: 1, kind, id, saved, addedAt: previous?.addedAt ?? now, ...(previous?.lastOpenedAt ? { lastOpenedAt: previous.lastOpenedAt } : {}), ...(previous?.lessonId ? { lessonId: previous.lessonId, mode: previous.mode } : {}), ...(launch ? { lastOpenedAt: now, ...launch } : {}) });
}
