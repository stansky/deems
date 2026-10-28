import { studyCourses } from "@/data/study-courses";
import { studyProgressKey, studyProgressSchema, learningSelectionKey, learningSelectionSchema } from "@/contracts/study";
import { studyPaths } from "@/data/study-catalog";

// Learning selections and progress have bounded contracts within existing settings.
export function studySettingError(key: string, value: string): string | null {
  if (!key.startsWith("study:")) return null;
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { return "Study progress must be valid JSON."; }
  if (key.startsWith("study:learning:")) {
    const parsed = learningSelectionSchema.safeParse(raw);
    if (!parsed.success) return "Learning selection fields are invalid.";
    const selection = parsed.data;
    const course = studyCourses.find(item => item.id === selection.id);
    if (key !== learningSelectionKey(selection.kind, selection.id) || (selection.kind === "course" ? !course : !studyPaths.some(path => path.id === selection.id))) return "Choose an existing course or path.";
    if (selection.kind === "path" && (selection.lessonId || selection.mode || selection.lastOpenedAt)) return "A path selection cannot contain a course activity.";
    if (selection.lessonId && !course?.lessons.some(lesson => lesson.id === selection.lessonId)) return "The current module must belong to this course.";
    if ((selection.mode || selection.lastOpenedAt) && !selection.lessonId) return "A current module is required for resume details.";
    return null;
  }
  const parsed = studyProgressSchema.safeParse(raw);
  if (!parsed.success) return "Study progress fields are invalid.";
  const progress = parsed.data;
  const course = studyCourses.find(item => item.id === progress.courseId);
  const lesson = course?.lessons.find(item => item.id === progress.lessonId);
  if (!course || !lesson || key !== studyProgressKey(lesson.id) || course.version !== progress.contentVersion) {
    return "Study progress must refer to the current course and lesson.";
  }
  if (progress.checks.length !== lesson.checks.length || new Set(progress.checks.map(check => check.checkId)).size !== lesson.checks.length) {
    return "Review each lesson check once before finishing.";
  }
  for (const result of progress.checks) {
    const check = lesson.checks.find(item => item.id === result.checkId);
    if (!check || (result.selectedOptionId !== null && !check.options.some(option => option.id === result.selectedOptionId))) {
      return "The selected answer does not belong to this lesson check.";
    }
    if (result.correct && (result.selectedOptionId !== check.answerId || result.attempts < 1)) {
      return "A correct answer needs a matching checked response.";
    }
    if (!result.correct && !result.revealed) return "Answer the check or review its explanation before finishing.";
  }
  return null;
}
