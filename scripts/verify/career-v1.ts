import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { applyCareerMigration } from "../../src/lib/migrations/career-v1";
import { CareerError, executeCareerCommand } from "../../src/domains/career/service";

const EXPECTED_DATABASE = "interview_phase0_20261027_181950";
const PREFIX = "qa-phase1-";
const LEGACY_TABLES = [
  "activities", "algorithm_bank", "applications", "coaching", "documents", "knowledge_bank",
  "notes", "reviews", "sessions", "settings", "target_assessments", "target_companies",
  "target_debriefs", "target_interviews", "target_progress", "target_role_states", "target_roles", "target_sources",
] as const;

type Row = Record<string, any>;
type Snapshot = Record<string, Row[]>;

let checks = 0;
function check(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${label}`);
  checks += 1;
  console.log(`PASS ${label}`);
}
function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function sha(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
function safeError(error: unknown): string {
  if (error instanceof CareerError) return `${error.name}:${error.status}:${error.code}`;
  if (error instanceof Error) return error.name;
  return "UnknownError";
}
async function snapshot(client: PoolClient): Promise<Snapshot> {
  const result: Snapshot = {};
  for (const table of LEGACY_TABLES) {
    const rows = await client.query(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`);
    result[table] = rows.rows.map(item => item.row as Row);
  }
  return result;
}
function compareSnapshots(before: Snapshot, after: Snapshot): string[] {
  return LEGACY_TABLES.filter(table => sha(before[table]) !== sha(after[table]));
}
async function transaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Keep the original failure. */ }
    throw error;
  } finally { client.release(); }
}
async function expectCareerError(fn: () => Promise<unknown>, status: number, code: string, label: string): Promise<CareerError> {
  try { await fn(); }
  catch (error) {
    check(error instanceof CareerError && error.status === status && error.code === code, label);
    return error as CareerError;
  }
  throw new Error(`FAIL ${label}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(connectionString);
  if (parsed.pathname.replace(/^\//, "") !== EXPECTED_DATABASE) throw new Error("Refusing to run outside the explicitly authorized disposable database.");
  const evidenceDir = process.env.CAREER_EVIDENCE_DIR;
  if (!evidenceDir || !evidenceDir.startsWith("/app/private/agent-runs/20261027T181950Z/W7")) {
    throw new Error("CAREER_EVIDENCE_DIR must point to the assigned private W7 evidence directory.");
  }
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, query_timeout: 15000, statement_timeout: 15000, max: 4 });
  let testRoleIds: string[] = [];
  let testAppIds: string[] = [];
  let triggerInstalled = false;
  try {
    const identity = await pool.query<{ db: string }>("SELECT current_database() AS db");
    check(identity.rows[0]?.db === EXPECTED_DATABASE, "database identity guard");

    const beforeClient = await pool.connect();
    let before: Snapshot;
    try { before = await snapshot(beforeClient); } finally { beforeClient.release(); }
    const beforePath = path.join(evidenceDir, "career-v1-before.json");
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(beforePath, `${JSON.stringify(before)}\n`, { mode: 0o600 });
    check(LEGACY_TABLES.every(table => Array.isArray(before[table])), "captured 18 legacy tables before migration");

    await transaction(pool, client => applyCareerMigration(client));
    await transaction(pool, client => applyCareerMigration(client));
    const ledger = await pool.query("SELECT version, checksum FROM schema_migrations WHERE version='career-v1'");
    check(ledger.rowCount === 1, "migration applies once and second application is idempotent");

    const [candidateRows, revisionRows, headRows, links, conflicts] = await Promise.all([
      pool.query<{ data: Row; current: boolean; revision: number }>("SELECT data,current,revision FROM career_candidacies ORDER BY id"),
      pool.query("SELECT entity_type,entity_id,revision,previous_revision,producer,reason,content FROM record_revisions"),
      pool.query("SELECT entity_type,entity_id,revision FROM record_heads"),
      pool.query("SELECT id,data FROM target_roles WHERE data ? 'applicationId'"),
      pool.query("SELECT count(*)::int AS count FROM career_candidacies WHERE jsonb_array_length(data->'reconciliation') > 0"),
    ]);
    check(candidateRows.rowCount === 17 && candidateRows.rows.every(row => row.current && row.revision === 1), "17 baseline candidacies at revision 1");
    check(candidateRows.rows.filter(row => row.data.applicationId != null).length === 7, "seven candidacies use explicit application links");
    check(candidateRows.rows.filter(row => row.data.roleId != null && row.data.applicationId == null).length === 10, "ten target-only candidacies keep submittedAt null");
    check(links.rowCount === 7, "seven raw target role application links retained");
    check(Number(conflicts.rows[0]?.count) === 0, "zero ambiguous baseline stage mappings");
    check(revisionRows.rowCount === 20 && headRows.rowCount === 20, "baseline heads and revision 1 snapshots include all candidacies, interview, debrief, and note");

    const [roleStateSnapshots, applicationSnapshots] = await Promise.all([
      pool.query<{ role_id: string; data: Row }>("SELECT role_id,data FROM target_role_states"),
      pool.query<{ id: string; role_id: string; company: string; title: string; stage: string; next_action: string; notes: string; updated_at: Date }>("SELECT id,role_id,company,title,stage,next_action,notes,updated_at FROM applications"),
    ]);
    const roleStateById = new Map(roleStateSnapshots.rows.map(row => [row.role_id, { role_id: row.role_id, data: row.data }]));
    const applicationById = new Map(applicationSnapshots.rows.map(row => [row.id, {
      ...row,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    }]));
    // Preserve original target records and explicit links as raw snapshots.
    for (const role of links.rows) {
      const candidate = candidateRows.rows.find(row => row.data.roleId === role.id);
      check(Boolean(candidate && candidate.data.applicationId === role.data.applicationId), "explicit role application link preserved");
      check(Boolean(candidate && same(candidate.data.legacy?.roleState, roleStateById.get(role.id))), "raw legacy role state snapshot preserved");
      check(Boolean(candidate && same(candidate.data.legacy?.application, applicationById.get(String(role.data.applicationId)))), "raw legacy application snapshot preserved");
    }
    check(candidateRows.rows.every(row => !row.data.roleId || same(row.data.legacy?.roleState, roleStateById.get(row.data.roleId))), "all 17 raw role state snapshots preserved");
    const preservedDebrief = await pool.query("SELECT count(*)::int AS count FROM target_debriefs WHERE id='qa-phase0-debrief-20261027'");
    const preservedInterview = await pool.query("SELECT count(*)::int AS count FROM target_interviews WHERE id='qa-phase0-interview-20261027'");
    const preservedNote = await pool.query("SELECT count(*)::int AS count FROM notes WHERE key='qa-phase0-note-20261027'");
    const preservedProgress = await pool.query("SELECT count(*)::int AS count FROM target_progress WHERE data->>'evidence'='qa-phase0 synthetic evidence'");
    const preservedAssessment = await pool.query("SELECT count(*)::int AS count FROM target_assessments WHERE data->>'evidence'='qa-phase0 synthetic assessment'");
    const preservedReview = await pool.query("SELECT count(*)::int AS count FROM reviews WHERE card_id='qa-phase0-review-20261027' AND fsrs->>'reps'='3'");
    const preservedSession = await pool.query("SELECT count(*)::int AS count FROM sessions WHERE id='qa-phase0-session-20261027' AND elapsed=73");
    check([preservedDebrief, preservedInterview, preservedNote, preservedProgress, preservedAssessment, preservedReview, preservedSession].every(result => Number(result.rows[0].count) === 1), "all seven Phase 0 preservation fixtures remain readable");

    const postMigrationClient = await pool.connect();
    let after: Snapshot;
    try { after = await snapshot(postMigrationClient); } finally { postMigrationClient.release(); }
    const afterPath = path.join(evidenceDir, "career-v1-after-migration.json");
    await writeFile(afterPath, `${JSON.stringify(after)}\n`, { mode: 0o600 });
    const legacyDifferences = compareSnapshots(before, after);
    check(legacyDifferences.length === 0, "all 18 legacy tables are byte-equivalent after migration and retry");
    console.log(`LEGACY_TABLE_ROWS ${JSON.stringify(Object.fromEntries(LEGACY_TABLES.map(table => [table, before[table].length])))}`);

    const roleTemplate = await pool.query<{ id: string; company_id: string; data: Row }>("SELECT id,company_id,data FROM target_roles WHERE company_id <> 'general' ORDER BY id LIMIT 1");
    if (!roleTemplate.rowCount) throw new Error("No non-General role is available for synthetic verification.");
    const roleA = `${PREFIX}role-a`;
    const roleB = `${PREFIX}role-b`;
    const appA = `${PREFIX}application-a`;
    const appB = `${PREFIX}application-b`;
    const unlinkedApp = `${PREFIX}application-unlinked`;
    const testInterview = `${PREFIX}interview`;
    const testDebrief = `${PREFIX}debrief`;
    const noteKey = `${PREFIX}note`;
    testRoleIds = [roleA, roleB];
    testAppIds = [appA, appB, unlinkedApp];
    const template = roleTemplate.rows[0];
    for (const [id, applicationId] of [[roleA, appA], [roleB, appB]] as const) {
      const data = { ...template.data, id, companyId: template.company_id, applicationId };
      await pool.query("INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3)", [id, template.company_id, JSON.stringify(data)]);
    }
    check(true, "created two uniquely named disposable target roles");

    const producer = `${PREFIX}commands`;
    const meta = (expectedRevision: number, key: string) => ({ expectedRevision, producer, key });
    const roleState = async (roleId: string, stage: string, detailedStage: string, key: string) => executeCareerCommand(pool, {
      action: "roleState", data: { roleId, stage, detailedStage, notes: "Synthetic verification." }, meta: meta(0, key),
    });
    const initialA = await roleState(roleA, "rejected", "Rejected", `${PREFIX}role-a-create`);
    check(initialA.revision === 1 && initialA.entityId === `application:${appA}`, "roleState creates an identity that application update can reuse");
    const identityA = initialA.content as Row;
    const rejected = await executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Rejected", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: meta(1, `${PREFIX}app-a-rejected`),
    });
    check(rejected.revision === 2 && rejected.entityId === initialA.entityId, "application command updates the same candidacy after roleState");

    const initialB = await roleState(roleB, "active", "In progress", `${PREFIX}role-b-create`);
    check(initialB.revision === 1, "second role has an independent candidacy");
    const withdrawn = await executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Withdrawn", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: meta(2, `${PREFIX}app-a-withdrawn`),
    });
    check(withdrawn.revision === 3, "new command advances rejected candidacy");
    const retry = await executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Rejected", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: meta(1, `${PREFIX}app-a-rejected`),
    });
    check(same(retry, rejected), "identical retry returns original result after head changed");
    await expectCareerError(() => executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Offer", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: meta(1, `${PREFIX}app-a-rejected`),
    }), 409, "idempotency_key_reused", "changed input with the same retry key is rejected");
    const stale = await expectCareerError(() => executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Offer", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: meta(2, `${PREFIX}app-a-stale`),
    }), 409, "revision_conflict", "stale application edit is rejected");
    check(stale.currentRevision === 3, "stale edit reports current revision");
    const isolated = await pool.query<{ a: Row; b: Row }>("SELECT (SELECT data FROM career_candidacies WHERE id=$1) AS a,(SELECT data FROM career_candidacies WHERE id=$2) AS b", [`application:${appA}`, `application:${appB}`]);
    check(isolated.rows[0].a.stage === "Withdrawn" && isolated.rows[0].b.stage === "In progress", "rejecting one role does not alter a second role at the same company");

    const general = await pool.query<{ id: string }>("SELECT id FROM target_roles WHERE company_id='general' ORDER BY id LIMIT 1");
    if (general.rowCount) {
      await expectCareerError(() => executeCareerCommand(pool, { action: "roleState", data: { roleId: general.rows[0].id, stage: "rejected", detailedStage: "Rejected" }, meta: meta(0, `${PREFIX}general-reject`) }), 400, "invalid_candidacy", "General preparation cannot become a candidacy");
    } else {
      check(false, "General role exists for rejection check");
    }

    const unlinked = await executeCareerCommand(pool, {
      action: "application", data: { id: unlinkedApp, roleId: null, company: "QA Synthetic", title: "Unlinked application", stage: "Interested", notes: "", nextAction: "" }, meta: meta(0, `${PREFIX}unlinked-create`),
    });
    const unlinkedStored = await pool.query("SELECT c.role_id,c.application_id,a.id AS application_record FROM career_candidacies c LEFT JOIN applications a ON a.id=c.application_id WHERE c.id=$1", [`application:${unlinkedApp}`]);
    check((unlinked.content as Row).roleId === null && (unlinked.content as Row).applicationId === unlinkedApp && unlinkedStored.rows[0]?.role_id === null && unlinkedStored.rows[0]?.application_record === unlinkedApp, "new unlinked application has no role FK and retains its application FK");

    const interview = await executeCareerCommand(pool, {
      action: "interview", data: { id: testInterview, roleId: roleA, companyId: template.company_id, title: "Synthetic interview", scheduledAt: null, status: "target", format: "synthetic", notes: "" }, meta: meta(0, `${PREFIX}interview-create`),
    });
    check(interview.revision === 1, "synthetic interview baseline revision created");
    const debriefInput = { id: testDebrief, roleId: roleA, interviewId: testInterview, occurredOn: "2026-10-27", outcome: "practice", prompt: "Synthetic", worked: "Synthetic", struggled: "Synthetic", feedback: "Before", nextAction: "Synthetic", requirementIds: [] };
    const debriefCreated = await executeCareerCommand(pool, { action: "debrief", data: debriefInput, meta: meta(0, `${PREFIX}debrief-create`) });
    const createdAt = (debriefCreated.content as Row).createdAt;
    const resolved = await executeCareerCommand(pool, { action: "resolve", data: { id: testDebrief, resolved: true }, meta: meta(1, `${PREFIX}debrief-resolve`) });
    const resolvedAt = (resolved.content as Row).resolvedAt;
    const debriefEdited = await executeCareerCommand(pool, { action: "debrief", data: { ...debriefInput, feedback: "After" }, meta: meta(2, `${PREFIX}debrief-edit`) });
    const editedContent = debriefEdited.content as Row;
    check(editedContent.createdAt === createdAt && editedContent.interviewId === testInterview && editedContent.roleId === roleA && editedContent.resolvedAt === resolvedAt, "debrief edit preserves creation time, round link, role, and resolved state");

    await executeCareerCommand(pool, { action: "note", data: { key: noteKey, value: "Initial" }, meta: meta(0, `${PREFIX}note-create`) });
    await executeCareerCommand(pool, { action: "note", data: { key: noteKey, value: "Updated" }, meta: meta(1, `${PREFIX}note-update`) });
    const noteStale = await expectCareerError(() => executeCareerCommand(pool, { action: "note", data: { key: noteKey, value: "Stale overwrite" }, meta: meta(1, `${PREFIX}note-stale`) }), 409, "revision_conflict", "stale note edit is rejected");
    const noteCheck = await pool.query("SELECT value FROM notes WHERE key=$1", [noteKey]);
    check(noteStale.currentRevision === 2 && noteCheck.rows[0]?.value === "Updated", "note conflict preserves current value and revision");

    await pool.query(`CREATE OR REPLACE FUNCTION qa_phase1_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.producer='qa-phase1-rollback' THEN RAISE EXCEPTION 'synthetic history failure'; END IF; RETURN NEW; END $$`);
    await pool.query("CREATE TRIGGER qa_phase1_reject_history BEFORE INSERT ON record_revisions FOR EACH ROW EXECUTE FUNCTION qa_phase1_reject_history()");
    triggerInstalled = true;
    await expectCareerError(() => executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Offer", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: { expectedRevision: 3, producer: "qa-phase1-rollback", key: `${PREFIX}rollback` },
    }), 503, "save_unconfirmed", "history insertion failure returns unconfirmed failure");
    const rollbackState = await pool.query<{ data: Row; revision: number }>("SELECT data,revision FROM career_candidacies WHERE id=$1", [`application:${appA}`]);
    const rollbackHeads = await pool.query("SELECT revision FROM record_heads WHERE entity_type='candidacy' AND entity_id=$1", [`application:${appA}`]);
    const rollbackRevisions = await pool.query("SELECT count(*)::int AS count FROM record_revisions WHERE entity_type='candidacy' AND entity_id=$1", [`application:${appA}`]);
    const rollbackReceipts = await pool.query("SELECT count(*)::int AS count FROM command_receipts WHERE producer='qa-phase1-rollback'");
    const rollbackApp = await pool.query("SELECT stage FROM applications WHERE id=$1", [appA]);
    const rollbackStateRow = await pool.query("SELECT data->>'stage' AS stage FROM target_role_states WHERE role_id=$1", [roleA]);
    const rollbackActivities = await pool.query("SELECT count(*)::int AS count FROM activities WHERE application_id=$1", [appA]);
    check(rollbackState.rows[0].revision === 3 && rollbackState.rows[0].data.stage === "Withdrawn" && Number(rollbackHeads.rows[0].revision) === 3 && Number(rollbackRevisions.rows[0].count) === 3 && Number(rollbackReceipts.rows[0].count) === 0 && rollbackApp.rows[0].stage === "Withdrawn" && rollbackStateRow.rows[0].stage === "withdrawn" && Number(rollbackActivities.rows[0].count) === 1, "history insertion failure rolls back head, candidacy, projections, receipt, revision, and activity");

    await pool.query("DROP TRIGGER qa_phase1_reject_history ON record_revisions");
    await pool.query("DROP FUNCTION qa_phase1_reject_history()");
    triggerInstalled = false;
    await cleanup(pool, testRoleIds, testAppIds, [testInterview, testDebrief, noteKey]);
    const cleanupCheck = await pool.query("SELECT (SELECT count(*) FROM target_roles WHERE id LIKE 'qa-phase1-%') + (SELECT count(*) FROM applications WHERE id LIKE 'qa-phase1-%') + (SELECT count(*) FROM career_candidacies WHERE id LIKE '%qa-phase1-%') + (SELECT count(*) FROM command_receipts WHERE producer LIKE 'qa-phase1-%') + (SELECT count(*) FROM record_revisions WHERE entity_id LIKE '%qa-phase1-%') AS count");
    check(Number(cleanupCheck.rows[0].count) === 0, "synthetic command verification data cleaned from disposable database");

    const finalClient = await pool.connect();
    let finalSnapshot: Snapshot;
    try { finalSnapshot = await snapshot(finalClient); } finally { finalClient.release(); }
    const finalSnapshotPath = path.join(evidenceDir, "career-v1-after-command-cleanup.json");
    await writeFile(finalSnapshotPath, `${JSON.stringify(finalSnapshot)}\n`, { mode: 0o600 });
    const finalDeltas = compareSnapshots(before, finalSnapshot);
    check(finalDeltas.length === 0, "legacy tables return to pre-migration fixture state after command cleanup");
    console.log(`RESULT PASS checks=${checks} db=${EXPECTED_DATABASE}`);
  } catch (error) {
    console.error(`RESULT FAIL checks=${checks} error=${safeError(error)}`);
    throw error;
  } finally {
    if (triggerInstalled) {
      await pool.query("DROP TRIGGER IF EXISTS qa_phase1_reject_history ON record_revisions").catch(() => undefined);
      await pool.query("DROP FUNCTION IF EXISTS qa_phase1_reject_history()").catch(() => undefined);
    }
    if (testRoleIds.length || testAppIds.length) {
      await cleanup(pool, testRoleIds, testAppIds, [`${PREFIX}interview`, `${PREFIX}debrief`, `${PREFIX}note`]).catch(() => undefined);
    }
    await pool.end();
  }
}

async function cleanup(pool: Pool, roleIds: string[], appIds: string[], otherIds: string[]) {
  const candidacyIds = appIds.map(id => `application:${id}`);
  const entityIds = [...candidacyIds, ...otherIds];
  await pool.query("DELETE FROM target_debriefs WHERE id=ANY($1::text[])", [[`${PREFIX}debrief`]]);
  await pool.query("DELETE FROM target_interviews WHERE id=ANY($1::text[])", [[`${PREFIX}interview`]]);
  await pool.query("DELETE FROM activities WHERE application_id=ANY($1::text[])", [appIds]);
  await pool.query("DELETE FROM notes WHERE key=ANY($1::text[])", [[`${PREFIX}note`]]);
  await pool.query("DELETE FROM command_receipts WHERE producer LIKE 'qa-phase1-%'");
  await pool.query("DELETE FROM career_candidacies WHERE role_id=ANY($1::text[]) OR application_id=ANY($2::text[]) OR id=ANY($3::text[])", [roleIds, appIds, candidacyIds]);
  await pool.query("DELETE FROM record_revisions WHERE entity_id=ANY($1::text[])", [entityIds]);
  await pool.query("DELETE FROM record_heads WHERE entity_id=ANY($1::text[])", [entityIds]);
  await pool.query("DELETE FROM applications WHERE id=ANY($1::text[])", [appIds]);
  await pool.query("DELETE FROM target_role_states WHERE role_id=ANY($1::text[])", [roleIds]);
  await pool.query("DELETE FROM target_roles WHERE id=ANY($1::text[])", [roleIds]);
}

main().catch(() => { process.exitCode = 1; });
