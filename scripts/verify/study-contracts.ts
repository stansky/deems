import assert from "node:assert/strict";
import { cheatSheets } from "../../src/data/prep";
import { studyCourses } from "../../src/data/study-courses";
import { studyProgressKey, type StudyProgress } from "../../src/contracts/study";
import { studySettingError } from "../../src/lib/study-progress-validation";
import { workspaceMutationSchema } from "../../src/contracts/workspace";

const checked: string[] = [];
function pass(name: string) {
  checked.push(name);
}
function validProgress(courseIndex = 0) {
  const course = studyCourses[courseIndex];
  const lesson = course.lessons[0];
  const progress: StudyProgress = {
    version: 1 as const,
    contentVersion: course.version,
    courseId: course.id,
    lessonId: lesson.id,
    completedAt: "2026-10-27T18:00:00Z",
    checks: lesson.checks.map(check => ({
      checkId: check.id,
      selectedOptionId: check.answerId,
      correct: true,
      revealed: false,
      attempts: 1,
    })),
  };
  return progress;
}
function accepted(name: string, key: string, value: unknown) {
  assert.equal(studySettingError(key, JSON.stringify(value)), null, name);
  pass(name);
}
function rejected(name: string, key: string, value: unknown) {
  assert.notEqual(studySettingError(key, JSON.stringify(value)), null, name);
  pass(name);
}

function verifyCatalog() {
  assert.ok(studyCourses.length > 0, "course catalog is not empty");
  const courseIds = new Set<string>();
  const lessonIds = new Set<string>();
  const checkIds = new Set<string>();
  for (const course of studyCourses) {
    assert.ok(!courseIds.has(course.id), `duplicate course ID ${course.id}`);
    courseIds.add(course.id);
    for (const lesson of course.lessons) {
      assert.ok(!lessonIds.has(lesson.id), `duplicate lesson ID ${lesson.id}`);
      lessonIds.add(lesson.id);
      const guide = cheatSheets.find(item => item.id === lesson.guideId);
      assert.ok(guide, `lesson ${lesson.id} references missing guide ${lesson.guideId}`);
      for (const check of lesson.checks) {
        assert.ok(!checkIds.has(check.id), `duplicate check ID ${check.id}`);
        checkIds.add(check.id);
        assert.ok(guide.sections.some(section => section.title === check.sourceSectionTitle),
          `check ${check.id} references missing section ${check.sourceSectionTitle} in ${lesson.guideId}`);
      }
    }
  }
  pass(`catalog identities and guide sections (${courseIds.size} courses, ${lessonIds.size} lessons, ${checkIds.size} checks)`);
}

function verifySettingValidation() {
  const progress = validProgress();
  const key = studyProgressKey(progress.lessonId);
  accepted("correct checked answers can complete a lesson", key, progress);

  const revealed = validProgress();
  revealed.checks[0] = {
    ...revealed.checks[0],
    selectedOptionId: null,
    correct: false,
    revealed: true,
    attempts: 0,
  };
  accepted("reviewing a revealed answer can complete a lesson", key, revealed);

  const incomplete = validProgress();
  incomplete.checks.pop();
  rejected("incomplete check set is rejected", key, incomplete);

  const wrong = validProgress();
  const firstCheck = studyCourses[0].lessons[0].checks[0];
  wrong.checks[0] = {
    ...wrong.checks[0],
    selectedOptionId: firstCheck.options.find(option => option.id !== firstCheck.answerId)!.id,
    correct: true,
    attempts: 1,
  };
  rejected("incorrect selected answer cannot be marked correct", key, wrong);

  const foreign = validProgress(1);
  foreign.courseId = studyCourses[0].id;
  rejected("lesson cannot be saved under a different course", studyProgressKey(foreign.lessonId), foreign);

  rejected("progress cannot be written under an unknown setting key", "study:lesson:unknown-lesson", progress);
  assert.notEqual(studySettingError(key, "{not json"), null, "malformed JSON is rejected");
  pass("malformed JSON is rejected");

  const unknownOption = validProgress();
  unknownOption.checks[0].selectedOptionId = "not-an-option";
  rejected("answer IDs must belong to the referenced check", key, unknownOption);

  const duplicateChecks = validProgress();
  duplicateChecks.checks[1] = { ...duplicateChecks.checks[1], checkId: duplicateChecks.checks[0].checkId };
  rejected("duplicate check results are rejected", key, duplicateChecks);

  const unknownField = { ...validProgress(), extra: "unknown" };
  rejected("unknown progress fields are rejected", key, unknownField);
}

function verifyUnrelatedMutationContracts() {
  const setting = workspaceMutationSchema.safeParse({
    action: "setting",
    data: { key: "learning-profile", value: "{}" },
  });
  assert.ok(setting.success, "existing learning-profile setting request remains accepted");
  pass("existing unrelated setting mutation remains accepted");

  const review = workspaceMutationSchema.safeParse({
    action: "review",
    data: {
      cardId: "f01",
      rating: "good",
      reviewedAt: "2026-10-27T18:00:00Z",
      dueAt: "2026-10-28T18:00:00Z",
    },
  });
  assert.ok(review.success, "existing FSRS review request remains accepted");
  pass("existing FSRS review mutation remains accepted");
}

verifyCatalog();
verifySettingValidation();
verifyUnrelatedMutationContracts();
console.log(JSON.stringify({ result: "passed", checks: checked }, null, 2));
