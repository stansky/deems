import { learningSelectionSchema, readLearningSelection, readStudyProgress, type LearningSelection, type StudyCourse } from "@/contracts/study";
import { studyCourses } from "@/data/study-courses";
import { courseDetails, studyPaths, type StudyPath } from "@/data/study-catalog";

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
  if (selection) return selection.saved;
  return entry.kind === "course" && (courseProgress(entry.item, settings) > 0 || studyPaths.some(path => path.courseIds.includes(entry.item.id) && readLearningSelection(settings, "path", path.id)?.saved));
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

export function learningSnapshot(settings: Record<string, string>) {
  const courses = studyCourses.map(course => ({ course, done: courseProgress(course, settings) }));
  const selected = courses.filter(({ course, done }) => done > 0 || isInLearning({ kind: "course", item: course }, settings) || studyPaths.some(path => path.courseIds.includes(course.id) && readLearningSelection(settings, "path", path.id)?.saved));
  const completedModules = courses.reduce((sum, item) => sum + item.done, 0);
  const completedCourses = courses.filter(({ course, done }) => done === course.lessons.length).length;
  const completedPaths = studyPaths.filter(path => {
    const progress = itemProgress({ kind: "path", item: path }, settings);
    return progress.done === progress.total;
  }).length;
  const completedLessons = courses.flatMap(({ course }) => course.lessons.flatMap(lesson => {
    const progress = readStudyProgress(settings, lesson.id);
    return progress?.courseId === course.id ? [{ course, lesson, completedAt: progress.completedAt }] : [];
  }));
  const firstCompletion = (predicate: (item: typeof completedLessons[number]) => boolean) => completedLessons.filter(predicate).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))[0]?.completedAt;
  const earliestCompletionAcross = (groups: StudyCourse[][]) => {
    const completionDates = groups.map(group => Math.max(...group.flatMap(course => course.lessons.map(lesson => Date.parse(readStudyProgress(settings, lesson.id)?.completedAt ?? "") || 0)))).filter(value => value > 0);
    return completionDates.length ? new Date(Math.min(...completionDates)).toISOString() : undefined;
  };
  const completedCourseGroups = studyCourses.filter(course => courseProgress(course, settings) === course.lessons.length).map(course => [course]);
  const completedPathGroups = studyPaths.filter(path => itemProgress({ kind: "path", item: path }, settings).done === itemProgress({ kind: "path", item: path }, settings).total).map(path => itemCourses({ kind: "path", item: path }));
  return {
    completedModules, completedCourses, completedPaths,
    selectedModules: selected.reduce((sum, item) => sum + item.course.lessons.length, 0),
    skills: [...new Set(selected.map(({ course }) => courseDetails[course.id].topic))].map(topic => {
      const related = selected.filter(({ course }) => courseDetails[course.id].topic === topic);
      return { topic, done: related.reduce((sum, item) => sum + item.done, 0), total: related.reduce((sum, item) => sum + item.course.lessons.length, 0) };
    }),
    milestones: [
      { id: "first-module", title: "First module", detail: "Complete one module’s knowledge checks.", earned: completedModules > 0, earnedAt: firstCompletion(() => true) },
      { id: "first-course", title: "First course", detail: "Complete every module in one course.", earned: completedCourses > 0, earnedAt: earliestCompletionAcross(completedCourseGroups) },
      { id: "first-path", title: "First path", detail: "Complete every module in one learning path.", earned: completedPaths > 0, earnedAt: earliestCompletionAcross(completedPathGroups) },
    ],
  };
}

export function nextLearning(settings: Record<string, string>) {
  const mine = myLearning(settings);
  const entry = mine.find(entry => entry.kind === "course" && courseProgress(entry.item, settings) < entry.item.lessons.length);
  if (entry?.kind === "course") return { course: entry.item, ...nextCourseLesson(entry.item, settings), started: itemStarted(entry, settings) };
  const path = mine.find(entry => entry.kind === "path" && itemProgress(entry, settings).done < itemProgress(entry, settings).total);
  const course = path?.kind === "path" ? nextPathCourse(path.item, settings) : undefined;
  return course ? { course, ...nextCourseLesson(course, settings), started: itemStarted({ kind: "course", item: course }, settings) } : null;
}
