import { studyCourses } from "@/data/study-courses";
import { studyProgressKey, studyProgressSchema } from "@/contracts/study";

// Generic settings stay unchanged. Course progress has a separate, bounded contract.
export function studySettingError(key: string, value: string): string | null {
  if (!key.startsWith("study:")) return null;
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { return "Study progress must be valid JSON."; }
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
