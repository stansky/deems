import assert from "node:assert/strict";
import { studyProgressKey, type StudyCourse, type StudyLesson, type StudyProgress } from "../../src/contracts/study";
import { workspaceStateSchema } from "../../src/contracts/workspace";
import { studyCourses } from "../../src/data/study-courses";

const expectedDatabase = "interview_brilliant_20261027";
const base = process.env.STUDY_API_BASE;
const databaseAttestation = process.env.STUDY_API_CANDIDATE_DATABASE;
const readyToken = process.env.STUDY_API_READY;
const foundCourse = studyCourses.find(item => item.id === "ai-evaluation");
if (!foundCourse) throw new Error("Reserved API probe course must exist.");
const course: StudyCourse = foundCourse;
const foundLesson = course.lessons.find(item => item.id === "release-evidence");
if (!foundLesson) throw new Error("Reserved API probe lesson must exist.");
const lesson: StudyLesson = foundLesson;
const key = studyProgressKey(lesson.id);
const completedAt = "2026-10-27T20:00:00Z";

function progress(revealedCheckId?: string): StudyProgress {
  return {
    version: 1,
    contentVersion: course.version,
    courseId: course.id,
    lessonId: lesson.id,
    completedAt,
    checks: lesson.checks.map(check => check.id === revealedCheckId
      ? { checkId: check.id, selectedOptionId: null, correct: false, revealed: true, attempts: 0 }
      : { checkId: check.id, selectedOptionId: check.answerId, correct: true, revealed: false, attempts: 1 }),
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(name => `${JSON.stringify(name)}:${canonical(record[name])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function withoutReservedProgress<T>(value: T): T {
  const copy = structuredClone(value) as Record<string, any>;
  delete copy.exportedAt;
  if (copy.workspace?.settings) delete copy.workspace.settings[key];
  return copy as T;
}

async function getJson(path: string): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function workspace() {
  const { response, body } = await getJson("/api/workspace");
  assert.equal(response.status, 200, "workspace read should succeed");
  return workspaceStateSchema.parse(body);
}

async function postRaw(body: string) {
  return fetch(`${base}/api/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
}

async function postProgress(value: unknown) {
  return postRaw(JSON.stringify({ action: "setting", data: { key, value: JSON.stringify(value) } }));
}

async function exportSnapshot() {
  const { response, body } = await getJson("/api/export");
  assert.equal(response.status, 200, "export read should succeed");
  assert.equal(body?.version, 5, "export version remains 5");
  return body;
}

async function main() {
  // Writing is disabled unless the caller explicitly names the isolated candidate.
  assert.equal(base, "http://127.0.0.1:3042", "API base must be the assigned candidate port");
  assert.equal(databaseAttestation, expectedDatabase, "candidate database attestation must match the disposable clone");
  assert.equal(readyToken, `ready:${expectedDatabase}`, "root readiness token is required before API calls");

  const health = await getJson("/api/health");
  assert.equal(health.response.status, 200, "candidate health should be ready");
  assert.deepEqual(health.body, { status: "ok", database: "postgresql" });

  const beforeWorkspace = await workspace();
  assert.equal(beforeWorkspace.settings[key], undefined, "reserved lesson key must be empty before the probe");
  const beforeExport = await exportSnapshot();
  assert.equal(beforeExport.workspace?.settings?.[key], undefined, "reserved lesson key must be absent from the baseline export");

  const malformed = await postRaw('{"action":');
  assert.equal(malformed.status, 400, "malformed JSON must be rejected");
  const incomplete = progress();
  incomplete.checks.pop();
  const incompleteResponse = await postProgress(incomplete);
  assert.equal(incompleteResponse.status, 400, "incomplete lesson progress must be rejected");
  const afterInvalid = await workspace();
  assert.equal(afterInvalid.settings[key], undefined, "malformed and incomplete requests must not create progress");

  const correct = progress();
  const correctResponse = await postProgress(correct);
  assert.equal(correctResponse.status, 200, "checked correct answers should save");
  const savedResponse = workspaceStateSchema.parse(await correctResponse.json());
  assert.equal(savedResponse.settings[key], JSON.stringify(correct), "save response should return the exact progress value");
  const readback = await workspace();
  assert.equal(readback.settings[key], JSON.stringify(correct), "saved progress should survive a fresh workspace read");

  const exported = await exportSnapshot();
  assert.equal(exported.workspace.settings[key], JSON.stringify(correct), "export should include saved study progress");

  const wrong = progress();
  const firstCheck = lesson.checks[0];
  wrong.checks[0] = {
    ...wrong.checks[0],
    selectedOptionId: firstCheck.options.find(option => option.id !== firstCheck.answerId)!.id,
    correct: true,
  };
  const wrongResponse = await postProgress(wrong);
  assert.equal(wrongResponse.status, 400, "wrong answer cannot be marked correct");
  assert.equal((await workspace()).settings[key], JSON.stringify(correct), "rejected wrong answer must preserve the saved correct progress");

  const revealed = progress(firstCheck.id);
  const revealedResponse = await postProgress(revealed);
  assert.equal(revealedResponse.status, 200, "reviewing the explanation should allow completion");
  assert.equal((await workspace()).settings[key], JSON.stringify(revealed), "revealed-answer completion should persist");

  const afterExport = await exportSnapshot();
  assert.equal(canonical(withoutReservedProgress(afterExport)), canonical(withoutReservedProgress(beforeExport)),
    "the reserved study setting is the only exported state change");
  const afterWorkspace = await workspace();
  const beforeComparable = { ...beforeWorkspace, settings: { ...beforeWorkspace.settings } };
  const afterComparable = { ...afterWorkspace, settings: { ...afterWorkspace.settings } };
  delete beforeComparable.settings[key];
  delete afterComparable.settings[key];
  assert.equal(canonical(afterComparable), canonical(beforeComparable),
    "workspace reviews, sessions, applications, career data, notes and unrelated settings remain unchanged");

  console.log(JSON.stringify({
    result: "passed",
    candidateDatabaseAttestation: expectedDatabase,
    reservedKey: key,
    checks: [
      "candidate health and empty reserved key",
      "malformed JSON rejected with no row write",
      "incomplete progress rejected with no row write",
      "correct completion save response and workspace readback",
      "saved progress appears in export",
      "wrong answer rejection preserves the good record",
      "revealed-answer completion persists",
      "all unrelated workspace and export state is unchanged",
    ],
    providerCalls: 0,
    codeExecution: 0,
    persistenceRequests: 2,
    uniqueStudyRows: 1,
    retainedDisposableRecord: key,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
