import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { exercises } from "../../src/data/prep";
import { PracticeError, executePracticeCommand, readPracticeAttempts } from "../../src/domains/practice/service";
import { snapshotExercise } from "../../src/domains/practice/content";
import type { PracticeCommand, PracticeSave } from "../../src/contracts/practice";

const EXPECTED_DATABASE = "deems_practice_20261027";
const PREFIX = "verification-practice-r5-";
const EVIDENCE_DIR = process.env.PRACTICE_EVIDENCE_DIR;
const exercise = exercises.find(item => item.id === "code-idempotency") ?? (() => {
  throw new Error("Canonical FDE exercise code-idempotency is missing.");
})();
const otherExercise = exercises.find(item => item.id === "code-events") ?? (() => {
  throw new Error("Canonical exercise code-events is missing.");
})();
const exerciseContent = snapshotExercise(exercise, "python");

let checks = 0;
function check(condition: unknown, label: string): asserts condition {
  assert.ok(condition, label);
  checks += 1;
  console.log(`PASS ${label}`);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${canonical(row[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

async function expectPracticeError(
  work: () => Promise<unknown>, status: number, code: string, label: string,
): Promise<PracticeError> {
  try {
    await work();
  } catch (error) {
    check(error instanceof PracticeError && error.status === status && error.code === code,
      `${label} (expected ${status}:${code}, received ${error instanceof PracticeError ? `${error.status}:${error.code}` : error instanceof Error ? error.name : "unknown error"})`);
    return error as PracticeError;
  }
  throw new Error(`FAIL ${label}: command unexpectedly succeeded`);
}

async function snapshotTables(pool: Pool, tables: string[]): Promise<Record<string, unknown[]>> {
  const snapshot: Record<string, unknown[]> = {};
  const client = await pool.connect();
  try {
    for (const table of tables) {
      const result = await client.query(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`);
      snapshot[table] = result.rows.map(row => row.row);
    }
    return snapshot;
  } finally {
    client.release();
  }
}

async function installRoleFixtures(pool: Pool, companyId: string) {
  const roleId = `${PREFIX}role`;
  const wrongRoleId = `${PREFIX}other-role`;
  const makeRole = (id: string, stepId: string, resourceId: string, requirementId: string) => ({
    id, companyId, title: "Verification only", priority: "Explore", rationale: "Synthetic verification fixture.",
    sourceUrl: "", checkedAt: "2026-10-27T00:00:00.000Z", publishedProcess: [], stack: [],
    requirements: [
      { id: requirementId, title: "Verification requirement", detail: "Synthetic fixture.", evidence: "", gap: "", sourceUrl: "" },
      { id: `${PREFIX}alternate-requirement`, title: "Alternate verification requirement", detail: "Synthetic fixture.", evidence: "", gap: "", sourceUrl: "" },
      { id: `${PREFIX}rollback-fail`, title: "Rollback trigger requirement", detail: "Synthetic fixture.", evidence: "", gap: "", sourceUrl: "" },
    ],
    steps: [{ id: stepId, phase: "Practice", title: "Verification step", detail: "Synthetic fixture.", doneWhen: "Attempt linked.", minutes: 10,
      resources: [{ kind: "exercise", id: resourceId, title: exercise.title }] }],
  });
  const fixtures = [
    [roleId, makeRole(roleId, `${PREFIX}step`, exercise.id, `${PREFIX}requirement`)],
    [wrongRoleId, makeRole(wrongRoleId, `${PREFIX}other-step`, "design-agent-run", `${PREFIX}other-requirement`)],
  ] as const;
  for (const [id, data] of fixtures) {
    const existing = await pool.query<{ data: unknown }>("SELECT data FROM target_roles WHERE id=$1", [id]);
    if (existing.rowCount) {
      check(canonical(existing.rows[0].data) === canonical(data), `existing ${id} is the unchanged W7 fixture`);
    } else {
      await pool.query("INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3::jsonb)", [id, companyId, JSON.stringify(data)]);
      check(true, `created owned role fixture ${id}`);
    }
  }
  return { roleId, wrongRoleId, stepId: `${PREFIX}step`, requirementId: `${PREFIX}requirement`, otherRequirementId: `${PREFIX}alternate-requirement` };
}

function makeSave(input: {
  id: string; roleId?: string | null; planStepId?: string; exerciseId?: string;
  content?: typeof exerciseContent; language?: PracticeSave["language"]; notes?: string;
}): PracticeSave {
  return {
    id: input.id, exerciseId: input.exerciseId ?? exercise.id, mode: "Mock", notes: input.notes ?? "verification notes",
    code: "def accept(tenant_id, key, prompt):\n    return key, prompt\n", elapsed: 41,
    completedAt: "2026-10-27T20:00:00.000Z", selfReview: "The stable key behavior is clear.",
    language: input.language ?? "python",
    origin: input.roleId === null ? null : { roleId: input.roleId ?? `${PREFIX}role`, planStepId: input.planStepId ?? `${PREFIX}step` },
    content: input.content ?? exerciseContent,
    assistance: { hintsRevealed: 1, referenceSolutionViewed: false, otherHelp: "unknown", note: "" },
    assessment: { source: "self_report", rubricVersion: 1, checkedItems: [exercise.rubric[0]], observedResult: "Manual review only.", limitations: "No code executed.", execution: "not_run" },
    nextAction: "Test the duplicate key case with two tenants.",
  };
}

function command(action: "save" | "attach", data: any, key: string, expectedRevision: number): PracticeCommand {
  return { action, data, meta: { producer: "verification-practice-w7", key, expectedRevision } } as PracticeCommand;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (!EVIDENCE_DIR || !EVIDENCE_DIR.startsWith("/app/private/agent-runs/practice-20261027/W7")) {
    throw new Error("PRACTICE_EVIDENCE_DIR must point to the assigned private W7 evidence directory.");
  }
  const parsed = new URL(connectionString);
  if (parsed.pathname.replace(/^\//, "") !== EXPECTED_DATABASE) {
    throw new Error("Refusing to run outside the explicitly authorized disposable database.");
  }
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, query_timeout: 15000, statement_timeout: 15000, max: 4 });
  let rollbackTriggerInstalled = false;
  try {
    const identity = await pool.query<{ db: string }>("SELECT current_database() AS db");
    check(identity.rows[0]?.db === EXPECTED_DATABASE, "database identity guard");
    const company = await pool.query<{ id: string }>("SELECT id FROM target_companies ORDER BY id LIMIT 1");
    if (!company.rowCount) throw new Error("Disposable database has no company for isolated role fixtures.");
    const fixture = await installRoleFixtures(pool, company.rows[0].id);

    const unaffectedTables = ["reviews", "target_progress", "target_assessments", "target_role_states", "career_candidacies", "record_heads", "record_revisions", "sessions"];
    const before = await snapshotTables(pool, unaffectedTables);
    const beforeReviews = hash(before.reviews);
    const beforeProgress = hash(before.target_progress);
    const beforeAssessments = hash(before.target_assessments);
    const beforeSessions = before.sessions;

    const initialRead = await readPracticeAttempts(pool);
    const initialIds = initialRead.map(item => item.sessionId);
    check(initialIds.every(id => !id.startsWith(PREFIX)), "no prior W7 attempt fixture is present at baseline");

    const base = makeSave({ id: `${PREFIX}attempt`, roleId: fixture.roleId });
    const saveKey = `${PREFIX}save`;
    const saved = await executePracticeCommand(pool, command("save", base, saveKey, 0));
    check(saved.sessionId === base.id && saved.exerciseId === exercise.id, "save creates a linked attempt with the legacy session ID");
    check(saved.origin?.roleId === fixture.roleId && saved.origin.planStepId === fixture.stepId, "saved attempt retains the exact role and plan step origin");
    check(saved.assistance.otherHelp === "unknown" && saved.assistance.hintsRevealed === 1 && !saved.assistance.referenceSolutionViewed, "assistance records hints and keeps unreported help unknown");
    check(saved.assessment.source === "self_report" && saved.assessment.execution === "not_run" && saved.assessment.rubricVersion === 1, "assessment records self-report provenance and no code execution");
    check(saved.contentVersion === createHash("sha256").update(canonical(base.content)).digest("hex"), "saved prompt and rubric snapshot has its SHA-256 content version");
    check(saved.revision === 1 && saved.attachment === null, "new attempt starts at revision 1 with no attachment");
    check(canonical(await executePracticeCommand(pool, command("save", base, saveKey, 0)) ) === canonical(saved), "identical save retry returns its original result");
    await expectPracticeError(() => executePracticeCommand(pool, command("save", { ...base, code: `${base.code}# changed` }, saveKey, 0)), 409, "idempotency_key_reused", "changed input under save key is rejected");

    const wrongRole = makeSave({ id: `${PREFIX}bad-role`, roleId: fixture.wrongRoleId, planStepId: `${PREFIX}other-step` });
    await expectPracticeError(() => executePracticeCommand(pool, command("save", wrongRole, `${PREFIX}bad-role`, 0)), 400, "invalid_origin", "role step without the attempted exercise is rejected");
    const wrongStep = makeSave({ id: `${PREFIX}bad-step`, roleId: fixture.roleId, planStepId: `${PREFIX}missing-step` });
    await expectPracticeError(() => executePracticeCommand(pool, command("save", wrongStep, `${PREFIX}bad-step`, 0)), 400, "invalid_origin", "unknown plan step is rejected");
    const missingRole = makeSave({ id: `${PREFIX}missing-role`, roleId: `${PREFIX}missing-role-row` });
    await expectPracticeError(() => executePracticeCommand(pool, command("save", missingRole, `${PREFIX}missing-role`, 0)), 404, "origin_not_found", "missing role origin is rejected");
    const wrongExerciseBase = makeSave({ id: `${PREFIX}bad-exercise`, roleId: fixture.roleId, exerciseId: otherExercise.id, content: snapshotExercise(otherExercise, "python") });
    const wrongExercise = { ...wrongExerciseBase, assessment: { ...wrongExerciseBase.assessment, checkedItems: [] } };
    await expectPracticeError(() => executePracticeCommand(pool, command("save", wrongExercise, `${PREFIX}bad-exercise`, 0)), 400, "invalid_origin", "origin step cannot authorize a different exercise");
    await expectPracticeError(() => executePracticeCommand(pool, command("save", { ...base, id: `${PREFIX}bad-content`, content: { ...base.content, rubric: ["changed rubric"] } }, `${PREFIX}bad-content`, 0)), 409, "exercise_snapshot_mismatch", "forged exercise content snapshot is rejected");
    await expectPracticeError(() => executePracticeCommand(pool, command("save", { ...base, id: `${PREFIX}bad-rubric-assessment`, assessment: { ...base.assessment, checkedItems: ["not in this rubric"] } }, `${PREFIX}bad-rubric-assessment`, 0)), 400, "invalid_assessment", "assessment items outside the saved exercise rubric are rejected");
    await expectPracticeError(() => executePracticeCommand(pool, command("save", { ...base, id: `${PREFIX}bad-language`, language: "ruby" }, `${PREFIX}bad-language`, 0)), 400, "invalid_input", "unsupported language is rejected by command validation");
    await expectPracticeError(() => executePracticeCommand(pool, command("save", { ...base, id: `${PREFIX}bad-language-kind`, language: "design" }, `${PREFIX}bad-language-kind`, 0)), 400, "invalid_language", "design language is rejected for a coding exercise");

    const collisionId = `${PREFIX}legacy-collision`;
    await pool.query("INSERT INTO sessions(id,exercise_id,mode,notes,code,elapsed,completed_at,self_review) VALUES($1,$2,'Mock','preexisting legacy session','legacy code',9,$3,'legacy review') ON CONFLICT(id) DO NOTHING", [collisionId, exercise.id, "2026-10-27T19:00:00Z"]);
    const collisionBefore = await pool.query("SELECT to_jsonb(s) AS row FROM sessions s WHERE id=$1", [collisionId]);
    await expectPracticeError(() => executePracticeCommand(pool, command("save", makeSave({ id: collisionId, roleId: fixture.roleId }), `${PREFIX}collision-save`, 0)), 409, "session_id_reused", "legacy session collision cannot overwrite the session");
    const collisionAfter = await pool.query("SELECT to_jsonb(s) AS row FROM sessions s WHERE id=$1", [collisionId]);
    check(hash(collisionAfter.rows[0]?.row) === hash(collisionBefore.rows[0]?.row), "colliding legacy session remains byte-equivalent");

    const attemptRow = (await readPracticeAttempts(pool)).find(item => item.sessionId === saved.sessionId);
    check(Boolean(attemptRow), "saved attempt is readable through the practice service");
    const attached = await executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: fixture.requirementId }, `${PREFIX}attach`, 1));
    check(attached.attachment?.requirementId === fixture.requirementId && attached.revision === 2, "explicit attach links the attempt to the origin requirement and advances revision");
    const attachRetry = await executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: fixture.requirementId }, `${PREFIX}attach`, 1));
    check(canonical(attachRetry) === canonical(attached), "identical attach retry returns original result after later state changes");
    const revisionsAfterAttach = await pool.query("SELECT revision,previous_requirement_id,requirement_id FROM practice_evidence_revisions WHERE session_id=$1 ORDER BY revision", [saved.sessionId]);
    check(revisionsAfterAttach.rowCount === 1 && revisionsAfterAttach.rows[0].revision === 2 && revisionsAfterAttach.rows[0].previous_requirement_id === null && revisionsAfterAttach.rows[0].requirement_id === fixture.requirementId, "attachment history records the null-to-requirement transition");

    const beforeStale = await readPracticeAttempts(pool);
    const stale = await expectPracticeError(() => executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: fixture.otherRequirementId }, `${PREFIX}stale-attach`, 1)), 409, "revision_conflict", "stale attach is rejected with current revision");
    check(stale.currentRevision === 2, "stale attach exposes current revision for explicit review");
    check(canonical(await readPracticeAttempts(pool)) === canonical(beforeStale), "stale attach makes no attempt or history mutation");

    const replaced = await executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: fixture.otherRequirementId }, `${PREFIX}replace-attach`, 2));
    check(replaced.attachment?.requirementId === fixture.otherRequirementId && replaced.revision === 3, "explicit attach replaces the current requirement");
    const detached = await executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: null }, `${PREFIX}detach`, 3));
    check(detached.attachment === null && detached.revision === 4, "explicit null requirement detaches the evidence");
    const history = await pool.query("SELECT revision,previous_requirement_id,requirement_id FROM practice_evidence_revisions WHERE session_id=$1 ORDER BY revision", [saved.sessionId]);
    check(history.rowCount === 3 && history.rows[0].requirement_id === fixture.requirementId && history.rows[1].previous_requirement_id === fixture.requirementId && history.rows[1].requirement_id === fixture.otherRequirementId && history.rows[2].previous_requirement_id === fixture.otherRequirementId && history.rows[2].requirement_id === null, "replace and detach both append explicit prior/current history");

    await pool.query(`CREATE OR REPLACE FUNCTION ${PREFIX.replaceAll("-", "_")}reject_evidence_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.requirement_id='${PREFIX}rollback-fail' THEN RAISE EXCEPTION 'synthetic practice history failure'; END IF; RETURN NEW; END $$`);
    await pool.query(`CREATE TRIGGER ${PREFIX.replaceAll("-", "_")}reject_evidence_revision BEFORE INSERT ON practice_evidence_revisions FOR EACH ROW EXECUTE FUNCTION ${PREFIX.replaceAll("-", "_")}reject_evidence_revision()`);
    rollbackTriggerInstalled = true;
    const beforeRollback = await readPracticeAttempts(pool);
    await expectPracticeError(() => executePracticeCommand(pool, command("attach", { sessionId: saved.sessionId, requirementId: `${PREFIX}rollback-fail` }, `${PREFIX}rollback-attach`, 4)), 503, "save_unconfirmed", "injected history failure is reported as an unconfirmed save");
    check(canonical(await readPracticeAttempts(pool)) === canonical(beforeRollback), "history write failure rolls back attachment state and revision");
    const rolledBackReceipt = await pool.query("SELECT count(*)::int AS count FROM practice_command_receipts WHERE producer='verification-practice-w7' AND action='attach' AND key=$1", [`${PREFIX}rollback-attach`]);
    check(rolledBackReceipt.rows[0].count === 0, "history write failure rolls back the command receipt");

    const after = await snapshotTables(pool, unaffectedTables);
    check(hash(after.reviews) === beforeReviews, "existing FSRS review state is unchanged");
    check(hash(after.target_progress) === beforeProgress, "role step progress is unchanged by attempts and evidence attachment");
    check(hash(after.target_assessments) === beforeAssessments, "requirement assessments and readiness are unchanged by evidence attachment");
    const legacySessionsAfter = after.sessions.filter(row => !String((row as any).id).startsWith(PREFIX));
    check(hash(legacySessionsAfter) === hash(beforeSessions), "all pre-existing legacy sessions remain byte-equivalent");
    const unrelatedBefore = { ...before };
    const unrelatedAfter = { ...after, sessions: legacySessionsAfter };
    check(hash(unrelatedAfter) === hash(unrelatedBefore), "career state, revision history, reviews, and unrelated tables are unchanged");

    const allAttempts = await readPracticeAttempts(pool);
    const finalAttempt = allAttempts.find(item => item.sessionId === saved.sessionId);
    check(finalAttempt?.attachment === null && finalAttempt.revision === 4, "final attempt remains saved and detached after rejected rollback probe");
    await mkdir(EVIDENCE_DIR, { recursive: true, mode: 0o700 });
    await writeFile(path.join(EVIDENCE_DIR, "practice-service.json"), `${JSON.stringify({
      result: "passed", database: EXPECTED_DATABASE, checks,
      fixturePrefix: PREFIX, attemptId: saved.sessionId, exerciseId: exercise.id,
      finalRevision: finalAttempt.revision, finalAttachment: finalAttempt.attachment,
      preserved: { reviewsSha256: beforeReviews, targetProgressSha256: beforeProgress, assessmentsSha256: beforeAssessments },
      providerCalls: 0, codeExecution: 0,
    }, null, 2)}\n`, { mode: 0o600 });
    console.log(`RESULT passed checks=${checks}`);
  } finally {
    if (rollbackTriggerInstalled) {
      const suffix = PREFIX.replaceAll("-", "_");
      await pool.query(`DROP TRIGGER IF EXISTS ${suffix}reject_evidence_revision ON practice_evidence_revisions`).catch(() => undefined);
      await pool.query(`DROP FUNCTION IF EXISTS ${suffix}reject_evidence_revision()`).catch(() => undefined);
    }
    await pool.end();
  }
}

main().catch(error => {
  if (error instanceof PracticeError) console.error(`${error.name}:${error.status}:${error.code}`);
  else console.error(error);
  process.exitCode = 1;
});
