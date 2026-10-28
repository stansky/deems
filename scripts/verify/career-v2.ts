import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { applyCareerMigration } from "../../src/lib/migrations/career-v1";
import { applyCareerTypedMigration } from "../../src/lib/migrations/career-v2";
import { CareerError, executeCareerCommand } from "../../src/domains/career/service";

const EXPECTED_DATABASE = "interview_phase0_20261027_181950";
const PREFIX = "qa-phase2-";
const LEGACY_TABLES = [
  "activities", "algorithm_bank", "applications", "coaching", "documents", "knowledge_bank",
  "notes", "reviews", "sessions", "settings", "target_assessments", "target_companies",
  "target_debriefs", "target_interviews", "target_progress", "target_role_states", "target_roles", "target_sources",
] as const;

type Row = Record<string, any>;
type Snapshot = Record<string, Row[]>;

let checks = 0;
const observedFailures: string[] = [];
function check(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${label}`);
  checks += 1;
  console.log(`PASS ${label}`);
}
function observe(condition: unknown, label: string) {
  if (condition) {
    checks += 1;
    console.log(`PASS ${label}`);
  } else {
    observedFailures.push(label);
    console.log(`FAIL ${label}`);
  }
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

async function expectDbError(pool: Pool, sql: string, params: unknown[], code: string, label: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SAVEPOINT qa_v2_constraint");
    let received: string | undefined;
    try { await client.query(sql, params); }
    catch (error) { received = String((error as { code?: string }).code ?? ""); }
    await client.query("ROLLBACK TO SAVEPOINT qa_v2_constraint");
    await client.query("RELEASE SAVEPOINT qa_v2_constraint");
    await client.query("ROLLBACK");
    check(received === code, label);
  } finally { client.release(); }
}

async function expectDeferredCommitError(pool: Pool, statements: Array<[string, unknown[]]>, code: string, label: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [sql, params] of statements) await client.query(sql, params);
    let received: string | undefined;
    try { await client.query("COMMIT"); }
    catch (error) { received = String((error as { code?: string }).code ?? ""); }
    if (received) await client.query("ROLLBACK").catch(() => undefined);
    check(received === code, label);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

const candidateInsertSql = `INSERT INTO career_candidacies
  (id,role_id,application_id,current,revision,data,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation)
  VALUES($1,$2,$3,$4,1,$5::jsonb,$6,$7,$8,$9,$10,$11,NULL,now(),'[]'::jsonb)`;

async function testTypedConstraints(pool: Pool, validRoleId: string | undefined, validApplicationId: string | undefined) {
  if (!validRoleId) throw new Error("No existing role is available for typed constraint probes.");
  const makeCandidate = (overrides: Row = {}) => {
    const id = overrides.id ?? `${PREFIX}constraint-row`;
    const data = overrides.data ?? { id, roleId: validRoleId, applicationId: null, stage: "Interested", company: "QA", title: "QA", pipelineNotes: "", notes: "", nextAction: "", submittedAt: null, updatedAt: "", revision: 1, legacy: { application: null, roleState: null }, reconciliation: [] };
    return [id, overrides.role_id === undefined ? validRoleId : overrides.role_id, overrides.application_id ?? null, overrides.current ?? false, JSON.stringify(data), overrides.stage ?? "Interested", overrides.company ?? "QA", overrides.title ?? "QA", overrides.pipeline_notes ?? "", overrides.notes ?? "", overrides.next_action ?? ""];
  };
  const invalid = async (label: string, overrides: Row, code: string) => expectDbError(pool, candidateInsertSql, makeCandidate(overrides), code, label);

  await invalid("database rejects overlength candidacy ID", { id: "x".repeat(245) }, "23514");
  await invalid("database rejects invalid canonical stage", { stage: "Not a stage" }, "23514");
  await invalid("database rejects overlength company", { company: "x".repeat(501) }, "22001");
  await invalid("database rejects overlength title", { title: "x".repeat(501) }, "22001");
  await invalid("database rejects overlength next action", { next_action: "x".repeat(501) }, "22001");
  await invalid("database rejects overlength notes", { notes: "x".repeat(100001) }, "23514");
  await invalid("database rejects overlength pipeline notes", { pipeline_notes: "x".repeat(16001) }, "23514");
  await invalid("database rejects orphan role foreign key", { role_id: `${PREFIX}missing-role` }, "23503");
  await invalid("database rejects orphan application foreign key", { role_id: null, application_id: `${PREFIX}missing-application` }, "23503");
  await invalid("database rejects duplicate current role episode", { current: true }, "23505");
  if (!validApplicationId) throw new Error("No existing application is available for episode uniqueness probes.");
  await invalid("database rejects duplicate current application episode", { role_id: null, application_id: validApplicationId, current: true }, "23505");

  await expectDbError(pool, "INSERT INTO record_heads(entity_type,entity_id,revision) VALUES('note',$1,1)", ["x".repeat(245)], "23514", "database rejects overlength history entity ID");
  await expectDbError(pool,
    "INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES('note',$1,2,0,now(),'qa','test',NULL,'{}'::jsonb)",
    [`${PREFIX}broken-chain`], "23514", "database rejects an invalid revision chain");
  await expectDbError(pool,
    "INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES('note',$1,1,NULL,now(),$2,'test',NULL,'{}'::jsonb)",
    [`${PREFIX}long-producer`, "x".repeat(101)], "23514", "database rejects overlength revision producer");
  await expectDbError(pool,
    "INSERT INTO command_receipts(producer,command,key,input_hash,result,recorded_at) VALUES('qa','test',$1,'invalid-hash','{}'::jsonb,now())",
    [`${PREFIX}bad-hash`], "23514", "database rejects an invalid command hash");
  await expectDbError(pool,
    "INSERT INTO command_receipts(producer,command,key,input_hash,result,recorded_at) VALUES('qa','test',$1,$2,'{}'::jsonb,now())",
    ["x".repeat(201), "0".repeat(64)], "23514", "database rejects overlength receipt key");
}

async function testDeferredHistoryConstraints(pool: Pool) {
  const headId = `${PREFIX}deferred-missing-snapshot`;
  await expectDeferredCommitError(pool, [[
    "INSERT INTO record_heads(entity_type,entity_id,revision) VALUES('note',$1,1)", [headId],
  ]], "23503", "deferred head-to-snapshot FK rejects an incomplete commit");

  const revisionId = `${PREFIX}deferred-missing-head`;
  await expectDeferredCommitError(pool, [[
    "INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES('note',$1,1,NULL,now(),'qa-v2','verify',NULL,'{}'::jsonb)", [revisionId],
  ]], "23503", "deferred snapshot-to-head FK rejects an incomplete commit");

  const previousId = `${PREFIX}deferred-missing-previous`;
  await expectDeferredCommitError(pool, [
    ["INSERT INTO record_heads(entity_type,entity_id,revision) VALUES('note',$1,2)", [previousId]],
    ["INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES('note',$1,2,1,now(),'qa-v2','verify',NULL,'{}'::jsonb)", [previousId]],
  ], "23503", "deferred previous-revision FK rejects a broken chain at commit");

  const residue = await pool.query("SELECT (SELECT count(*) FROM record_heads WHERE entity_id LIKE 'qa-phase2-deferred-%') + (SELECT count(*) FROM record_revisions WHERE entity_id LIKE 'qa-phase2-deferred-%') AS count");
  check(Number(residue.rows[0].count) === 0, "deferred FK failures roll back all history rows");
}

async function inspectIndexes(pool: Pool, outputPath: string) {
  const expected = [
    "career_candidacies_current_role_uq", "career_candidacies_current_application_uq", "career_candidacies_current_stage_idx",
    "career_candidacies_role_history_idx", "career_candidacies_application_history_idx", "record_revisions_recorded_idx",
    "target_sources_company_idx", "target_interviews_company_idx", "target_debriefs_interview_idx", "documents_application_idx",
  ];
  const found = await pool.query<{ indexname: string; indexdef: string }>("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname=ANY($1::text[]) ORDER BY indexname", [expected]);
  check(expected.every(name => found.rows.some(row => row.indexname === name)), "all expected uniqueness, stage, history, and foreign-key indexes exist");

  const role = await pool.query<{ id: string }>("SELECT role_id AS id FROM career_candidacies WHERE current=true AND role_id IS NOT NULL ORDER BY role_id LIMIT 1");
  const candidacy = await pool.query<{ id: string }>("SELECT id FROM career_candidacies WHERE current=true ORDER BY id LIMIT 1");
  if (!role.rowCount || !candidacy.rowCount) throw new Error("No rows available for EXPLAIN plans.");
  const specs: Array<[string, string, unknown[]]> = [
    ["current_stage", "EXPLAIN (FORMAT JSON) SELECT id FROM career_candidacies WHERE current=true AND stage=$1 ORDER BY stage,id", ["Interested"]],
    ["role_lookup", "EXPLAIN (FORMAT JSON) SELECT id FROM career_candidacies WHERE role_id=$1 ORDER BY id", [role.rows[0].id]],
    ["application_lookup", "EXPLAIN (FORMAT JSON) SELECT id FROM career_candidacies WHERE application_id=$1 ORDER BY id", ["qa-nonexistent-app"]],
    ["record_history", "EXPLAIN (FORMAT JSON) SELECT revision,recorded_at FROM record_revisions WHERE entity_type='candidacy' AND entity_id=$1 ORDER BY recorded_at,entity_type,entity_id,revision", [candidacy.rows[0].id]],
    ["source_company", "EXPLAIN (FORMAT JSON) SELECT id FROM target_sources WHERE company_id=$1", ["general"]],
    ["interview_company", "EXPLAIN (FORMAT JSON) SELECT id FROM target_interviews WHERE company_id=$1", ["general"]],
    ["debrief_interview", "EXPLAIN (FORMAT JSON) SELECT id FROM target_debriefs WHERE interview_id=$1", ["qa-nonexistent-interview"]],
    ["documents_application", "EXPLAIN (FORMAT JSON) SELECT id FROM documents WHERE application_id=$1 ORDER BY captured_at DESC", ["qa-nonexistent-app"]],
  ];
  const plans: Record<string, unknown> = {};
  for (const [key, query, params] of specs) plans[key] = (await pool.query(query, params)).rows[0]["QUERY PLAN"];
  await writeFile(outputPath, `${JSON.stringify({ note: "Sequential scans are acceptable for small disposable tables; plans are evidence of query validity, not a latency benchmark.", plans }, null, 2)}\n`, { mode: 0o600 });
  check(Object.keys(plans).length === specs.length, "EXPLAIN plans captured for stage, FK, and history lookups");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const parsed = new URL(connectionString);
  if (parsed.pathname.replace(/^\//, "") !== EXPECTED_DATABASE) throw new Error("Refusing to run outside the explicitly authorized disposable database.");
  const evidenceDir = process.env.CAREER_EVIDENCE_DIR;
  if (!evidenceDir || !evidenceDir.startsWith("/app/private/agent-runs/20261027T181950Z/W7/v2")) {
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
    const beforePath = path.join(evidenceDir, "career-v2-before.json");
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(beforePath, `${JSON.stringify(before)}\n`, { mode: 0o600 });
    check(LEGACY_TABLES.every(table => Array.isArray(before[table])), "captured 18 legacy tables before migration");

    await transaction(pool, client => applyCareerMigration(client));
    await transaction(pool, client => applyCareerTypedMigration(client));
    await transaction(pool, client => applyCareerTypedMigration(client));
    const ledger = await pool.query("SELECT version, checksum FROM schema_migrations WHERE version='career-v2-typed'");
    check(ledger.rowCount === 1, "migration applies once and second application is idempotent");

    const [candidateRows, revisionRows, headRows, links, conflicts] = await Promise.all([
      pool.query<{ data: Row; current: boolean; revision: number; stage: string; company: string; title: string; pipeline_notes: string; notes: string; next_action: string; submitted_at: Date | null; updated_at: Date | null; reconciliation: string[] }>("SELECT data,current,revision,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation FROM career_candidacies ORDER BY id"),
      pool.query("SELECT entity_type,entity_id,revision,previous_revision,producer,reason,content FROM record_revisions"),
      pool.query("SELECT entity_type,entity_id,revision FROM record_heads"),
      pool.query("SELECT id,data FROM target_roles WHERE data ? 'applicationId'"),
      pool.query("SELECT count(*)::int AS count FROM career_candidacies WHERE jsonb_array_length(data->'reconciliation') > 0"),
    ]);
    check(candidateRows.rowCount === 17 && candidateRows.rows.every(row => row.current && row.revision === 1), "17 baseline candidacies at revision 1");
    check(candidateRows.rows.filter(row => row.data.applicationId != null).length === 7, "seven candidacies use explicit application links");
    check(candidateRows.rows.filter(row => row.data.roleId != null && row.data.applicationId == null).length === 10, "ten target-only candidacies keep submittedAt null");
    check(candidateRows.rows.every(row => row.stage === row.data.stage && row.company === row.data.company && row.title === row.data.title && row.pipeline_notes === row.data.pipelineNotes && row.notes === row.data.notes && row.next_action === row.data.nextAction && same(row.reconciliation, row.data.reconciliation) && (row.data.submittedAt == null ? row.submitted_at == null : new Date(row.data.submittedAt).getTime() === new Date(row.submitted_at!).getTime()) && (row.data.updatedAt ? new Date(row.data.updatedAt).getTime() === new Date(row.updated_at!).getTime() : row.updated_at == null)), "typed current columns backfill from the frozen v1 snapshots");
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
    const afterPath = path.join(evidenceDir, "career-v2-after-migration.json");
    await writeFile(afterPath, `${JSON.stringify(after)}\n`, { mode: 0o600 });
    const legacyDifferences = compareSnapshots(before, after);
    check(legacyDifferences.length === 0, "all 18 legacy tables are byte-equivalent after migration and retry");
    console.log(`LEGACY_TABLE_ROWS ${JSON.stringify(Object.fromEntries(LEGACY_TABLES.map(table => [table, before[table].length])))}`);

    await testTypedConstraints(pool, candidateRows.rows.find(row => row.data.roleId)?.data.roleId, candidateRows.rows.find(row => row.data.applicationId)?.data.applicationId);
    await testDeferredHistoryConstraints(pool);
    await inspectIndexes(pool, path.join(evidenceDir, "career-v2-index-plans.json"));

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
    const roleAProvenance = await pool.query<{ data: Row }>("SELECT data FROM career_candidacies WHERE id=$1", [initialA.entityId]);
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
    const isolated = await pool.query<{ a: Row; b: Row }>("SELECT (SELECT to_jsonb(c) FROM career_candidacies c WHERE id=$1) AS a,(SELECT to_jsonb(c) FROM career_candidacies c WHERE id=$2) AS b", [`application:${appA}`, `application:${appB}`]);
    check(isolated.rows[0].a.stage === "Withdrawn" && isolated.rows[0].b.stage === "In progress" && isolated.rows[0].a.notes === "Synthetic note" && isolated.rows[0].a.next_action === "Synthetic action" && isolated.rows[0].a.pipeline_notes === "Synthetic verification.", "typed columns are canonical for current values after service writes");
    observe(same(isolated.rows[0].a.data, roleAProvenance.rows[0].data), "JSONB remains the frozen initial provenance snapshot after typed writes");

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

    await pool.query(`CREATE OR REPLACE FUNCTION qa_phase2_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.producer='qa-phase2-rollback' THEN RAISE EXCEPTION 'synthetic history failure'; END IF; RETURN NEW; END $$`);
    await pool.query("CREATE TRIGGER qa_phase2_reject_history BEFORE INSERT ON record_revisions FOR EACH ROW EXECUTE FUNCTION qa_phase2_reject_history()");
    triggerInstalled = true;
    await expectCareerError(() => executeCareerCommand(pool, {
      action: "application", data: { id: appA, roleId: roleA, company: identityA.company, title: identityA.title, stage: "Offer", notes: "Synthetic note", nextAction: "Synthetic action" }, meta: { expectedRevision: 3, producer: "qa-phase2-rollback", key: `${PREFIX}rollback` },
    }), 503, "save_unconfirmed", "history insertion failure returns unconfirmed failure");
    const rollbackState = await pool.query<{ data: Row; revision: number; stage: string; notes: string; pipeline_notes: string; next_action: string }>("SELECT data,revision,stage,notes,pipeline_notes,next_action FROM career_candidacies WHERE id=$1", [`application:${appA}`]);
    const rollbackHeads = await pool.query("SELECT revision FROM record_heads WHERE entity_type='candidacy' AND entity_id=$1", [`application:${appA}`]);
    const rollbackRevisions = await pool.query("SELECT count(*)::int AS count FROM record_revisions WHERE entity_type='candidacy' AND entity_id=$1", [`application:${appA}`]);
    const rollbackReceipts = await pool.query("SELECT count(*)::int AS count FROM command_receipts WHERE producer='qa-phase2-rollback'");
    const rollbackApp = await pool.query("SELECT stage FROM applications WHERE id=$1", [appA]);
    const rollbackStateRow = await pool.query("SELECT data->>'stage' AS stage FROM target_role_states WHERE role_id=$1", [roleA]);
    const rollbackActivities = await pool.query("SELECT count(*)::int AS count FROM activities WHERE application_id=$1", [appA]);
    check(rollbackState.rows[0].revision === 3 && rollbackState.rows[0].stage === "Withdrawn" && same(rollbackState.rows[0].data, roleAProvenance.rows[0].data) && Number(rollbackHeads.rows[0].revision) === 3 && Number(rollbackRevisions.rows[0].count) === 3 && Number(rollbackReceipts.rows[0].count) === 0 && rollbackApp.rows[0].stage === "Withdrawn" && rollbackStateRow.rows[0].stage === "withdrawn" && Number(rollbackActivities.rows[0].count) === 1, "history insertion failure rolls back typed head, snapshots, projections, receipt, revision, and activity");

    await pool.query("DROP TRIGGER qa_phase2_reject_history ON record_revisions");
    await pool.query("DROP FUNCTION qa_phase2_reject_history()");
    triggerInstalled = false;
    await cleanup(pool, testRoleIds, testAppIds, [testInterview, testDebrief, noteKey]);
    const cleanupCheck = await pool.query("SELECT (SELECT count(*) FROM target_roles WHERE id LIKE 'qa-phase2-%') + (SELECT count(*) FROM applications WHERE id LIKE 'qa-phase2-%') + (SELECT count(*) FROM career_candidacies WHERE id LIKE '%qa-phase2-%') + (SELECT count(*) FROM command_receipts WHERE producer LIKE 'qa-phase2-%') + (SELECT count(*) FROM record_revisions WHERE entity_id LIKE '%qa-phase2-%') AS count");
    check(Number(cleanupCheck.rows[0].count) === 0, "synthetic command verification data cleaned from disposable database");

    const finalClient = await pool.connect();
    let finalSnapshot: Snapshot;
    try { finalSnapshot = await snapshot(finalClient); } finally { finalClient.release(); }
    const finalSnapshotPath = path.join(evidenceDir, "career-v2-after-command-cleanup.json");
    await writeFile(finalSnapshotPath, `${JSON.stringify(finalSnapshot)}\n`, { mode: 0o600 });
    const finalDeltas = compareSnapshots(before, finalSnapshot);
    check(finalDeltas.length === 0, "legacy tables return to pre-migration fixture state after command cleanup");
    if (observedFailures.length) throw new Error(`Observed assertion failures: ${observedFailures.length}`);
    console.log(`RESULT PASS checks=${checks} db=${EXPECTED_DATABASE}`);
  } catch (error) {
    console.error(`RESULT FAIL checks=${checks} error=${safeError(error)}`);
    throw error;
  } finally {
    if (triggerInstalled) {
      await pool.query("DROP TRIGGER IF EXISTS qa_phase2_reject_history ON record_revisions").catch(() => undefined);
      await pool.query("DROP FUNCTION IF EXISTS qa_phase2_reject_history()").catch(() => undefined);
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM target_debriefs WHERE id=ANY($1::text[])", [[`${PREFIX}debrief`]]);
    await client.query("DELETE FROM target_interviews WHERE id=ANY($1::text[])", [[`${PREFIX}interview`]]);
    await client.query("DELETE FROM activities WHERE application_id=ANY($1::text[])", [appIds]);
    await client.query("DELETE FROM notes WHERE key=ANY($1::text[])", [[`${PREFIX}note`]]);
    await client.query("DELETE FROM command_receipts WHERE producer LIKE 'qa-phase2-%'");
    await client.query("DELETE FROM career_candidacies WHERE role_id=ANY($1::text[]) OR application_id=ANY($2::text[]) OR id=ANY($3::text[])", [roleIds, appIds, candidacyIds]);
    // The history tables reference one another through deferred foreign keys. Delete them together.
    await client.query("DELETE FROM record_revisions WHERE entity_id=ANY($1::text[])", [entityIds]);
    await client.query("DELETE FROM record_heads WHERE entity_id=ANY($1::text[])", [entityIds]);
    await client.query("DELETE FROM applications WHERE id=ANY($1::text[])", [appIds]);
    await client.query("DELETE FROM target_role_states WHERE role_id=ANY($1::text[])", [roleIds]);
    await client.query("DELETE FROM target_roles WHERE id=ANY($1::text[])", [roleIds]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

main().catch(() => { process.exitCode = 1; });
