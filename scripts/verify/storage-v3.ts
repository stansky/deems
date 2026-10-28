import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { applyStorageGuardsMigration } from "../../src/lib/migrations/storage-v3";
import { executeCareerCommand } from "../../src/domains/career/service";

const DATABASE = "interview_predeploy_20261027_185418";
const PREFIX = "qa-storage-v3-";
const EVIDENCE_PREFIX = "/app/private/agent-runs/20261027T181950Z/W7/v3";
let checks = 0;
let syntheticRoleCreated = false;

type Row = Record<string, any>;
type Snapshot = { tables: string[]; rows: Record<string, Row[]> };

function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`FAIL ${label}`);
  checks += 1;
  console.log(`PASS ${label}`);
}
function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
async function transaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
async function capture(client: PoolClient): Promise<Snapshot> {
  const names = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const tables = names.rows.map(row => row.tablename);
  const rows: Record<string, Row[]> = {};
  for (const table of tables) {
    const result = await client.query(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`);
    rows[table] = result.rows.map(row => row.row as Row);
  }
  return { tables, rows };
}
async function saveSnapshot(pool: Pool, filename: string, outputDir: string): Promise<Snapshot> {
  const client = await pool.connect();
  let result: Snapshot;
  try { result = await capture(client); } finally { client.release(); }
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(result)}\n`, { mode: 0o600 });
  return result;
}
function compareSnapshots(before: Snapshot, after: Snapshot, allowedNewMigrationRows: number): string[] {
  if (!same(before.tables, after.tables)) return ["public table inventory changed"];
  const differences: string[] = [];
  for (const table of before.tables) {
    if (table === "schema_migrations" && allowedNewMigrationRows >= 0) {
      const oldRows = before.rows[table];
      const newRows = after.rows[table];
      const retained = oldRows.every(old => newRows.some(next => same(old, next)));
      const addedRows = newRows.filter(next => !oldRows.some(old => same(old, next)));
      if (!retained || newRows.length !== oldRows.length + allowedNewMigrationRows || addedRows.length !== allowedNewMigrationRows) differences.push(table);
    } else if (hash(before.rows[table]) !== hash(after.rows[table])) {
      differences.push(table);
    }
  }
  return differences;
}
async function expectDbError(pool: Pool, sql: string, params: unknown[], code: string, label: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SAVEPOINT qa_storage_v3_probe");
    let received: string | undefined;
    try { await client.query(sql, params); }
    catch (error) { received = String((error as { code?: string }).code ?? ""); }
    await client.query("ROLLBACK TO SAVEPOINT qa_storage_v3_probe");
    await client.query("RELEASE SAVEPOINT qa_storage_v3_probe");
    await client.query("ROLLBACK");
    check(received === code, label);
  } finally { client.release(); }
}
function safeError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  return code ? `DatabaseError:${code}` : error instanceof Error ? error.name : "UnknownError";
}

async function cleanup(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM target_debriefs WHERE id=$1", [`${PREFIX}debrief-null`]);
    await client.query("DELETE FROM target_interviews WHERE id=$1", [`${PREFIX}interview`]);
    await client.query("DELETE FROM notes WHERE key=$1", [`${PREFIX}note`]);
    await client.query("DELETE FROM command_receipts WHERE producer=$1", [`${PREFIX}service`]);
    await client.query("DELETE FROM career_candidacies WHERE role_id=$1 OR id=$2", [`${PREFIX}role`, `role:${PREFIX}role`]);
    const historyIds = [`role:${PREFIX}role`, `${PREFIX}interview`, `${PREFIX}debrief-null`, `${PREFIX}note`];
    await client.query("DELETE FROM record_revisions WHERE entity_id=ANY($1::text[])", [historyIds]);
    await client.query("DELETE FROM record_heads WHERE entity_id=ANY($1::text[])", [historyIds]);
    await client.query("DELETE FROM target_role_states WHERE role_id=$1", [`${PREFIX}role`]);
    await client.query("DELETE FROM target_roles WHERE id=$1", [`${PREFIX}role`]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const evidenceDir = process.env.STORAGE_V3_EVIDENCE_DIR;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (new URL(connectionString).pathname.replace(/^\//, "") !== DATABASE) throw new Error("Refusing to run outside the authorized predeploy database.");
  if (!evidenceDir || !evidenceDir.startsWith(EVIDENCE_PREFIX)) throw new Error("Evidence path must be the private storage-v3 run directory.");
  await mkdir(evidenceDir, { recursive: true });
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000, query_timeout: 15000, statement_timeout: 15000, max: 4 });
  try {
    const identity = await pool.query<{ database: string; version: string }>("SELECT current_database() AS database, current_setting('server_version') AS version");
    check(identity.rows[0].database === DATABASE && identity.rows[0].version.startsWith("18."), "database and PostgreSQL 18 identity guard");

    const before = await saveSnapshot(pool, "before.json", evidenceDir);
    check(before.tables.length === 23 && before.tables.includes("schema_migrations"), "captured the expected 23-table baseline");
    const v3AlreadyApplied = before.rows.schema_migrations.some(row => row.version === "storage-v3");
    await transaction(pool, client => applyStorageGuardsMigration(client));
    await transaction(pool, client => applyStorageGuardsMigration(client));
    const migration = await pool.query<{ version: string; checksum: string }>("SELECT version,checksum FROM schema_migrations WHERE version='storage-v3'");
    check(migration.rowCount === 1 && migration.rows[0].checksum.length === 64, "storage-v3 applies once and second application is idempotent");

    const afterMigration = await saveSnapshot(pool, v3AlreadyApplied ? "idempotent-after-migration.json" : "after-migration.json", evidenceDir);
    check(afterMigration.tables.length === 23, "migration preserves the 23-table inventory");
    const migrationChanges = compareSnapshots(before, afterMigration, v3AlreadyApplied ? 0 : 1);
    check(migrationChanges.length === 0, v3AlreadyApplied ? "idempotent rerun preserves all 23 table contents exactly" : "all 23 tables remain unchanged except for one migration ledger row");
    const ledgerBefore = before.rows.schema_migrations;
    const ledgerAfter = afterMigration.rows.schema_migrations;
    const addedLedger = ledgerAfter.find(row => !ledgerBefore.some(old => same(old, row)));
    check(v3AlreadyApplied ? addedLedger === undefined : addedLedger?.version === "storage-v3", v3AlreadyApplied ? "idempotent rerun adds no migration ledger rows" : "the only schema_migrations addition is storage-v3");

    const company = await pool.query<{ id: string; data: Row }>("SELECT id,data FROM target_companies WHERE id<>'general' ORDER BY id LIMIT 1");
    const otherCompany = await pool.query<{ id: string }>("SELECT id FROM target_companies WHERE id<>'general' AND id<>$1 ORDER BY id LIMIT 1", [company.rows[0]?.id]);
    const role = await pool.query<{ id: string; company_id: string; data: Row }>("SELECT id,company_id,data FROM target_roles WHERE company_id=$1 ORDER BY id LIMIT 1", [company.rows[0]?.id]);
    const app = await pool.query<{ id: string; company: string; title: string }>("SELECT id,company,title FROM applications ORDER BY id LIMIT 1");
    const algorithm = await pool.query<{ id: string }>("SELECT id FROM algorithm_bank ORDER BY id LIMIT 1");
    check(company.rowCount === 1 && otherCompany.rowCount === 1 && role.rowCount === 1 && app.rowCount === 1 && algorithm.rowCount === 1, "baseline records exist for scoped direct constraint probes");

    const qaRole = `${PREFIX}role`;
    const qaRoleData = { id: qaRole, companyId: company.rows[0].id, title: "Synthetic storage guard role", requirements: [] };
    await pool.query("INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3)", [qaRole, company.rows[0].id, JSON.stringify(qaRoleData)]);
    syntheticRoleCreated = true;
    check(true, "created one exact-ID synthetic role for service-write and row-shape checks");

    await expectDbError(pool,
      "INSERT INTO target_companies(id,data) VALUES($1,$2::jsonb)",
      ["qa storage company", JSON.stringify({ id: "qa storage company", name: "QA" })], "23514", "rejects invalid company ID format");
    await expectDbError(pool,
      "INSERT INTO target_companies(id,data) VALUES($1,$2::jsonb)",
      [`${PREFIX}company-missing-id`, JSON.stringify({ name: "QA" })], "23514", "rejects missing company JSON identity");
    await expectDbError(pool,
      "INSERT INTO target_companies(id,data) VALUES($1,'[]'::jsonb)",
      [`${PREFIX}company-wrong-type`], "23514", "rejects wrong-type company JSON");
    await expectDbError(pool,
      "INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3::jsonb)",
      [`${PREFIX}role-wrong-type`, company.rows[0].id, "[]"], "23514", "rejects wrong-type target role JSON");
    await expectDbError(pool,
      "INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3::jsonb)",
      [`${PREFIX}role-wrong-identity`, company.rows[0].id, JSON.stringify({ id: `${PREFIX}role-wrong-identity`, companyId: otherCompany.rows[0].id })], "23514", "rejects target role JSON company mismatch");
    await expectDbError(pool,
      "INSERT INTO target_sources(id,company_id,data) VALUES($1,$2,$3::jsonb)",
      [`${PREFIX}source-missing-id`, company.rows[0].id, JSON.stringify({ companyId: company.rows[0].id, title: "QA" })], "23514", "rejects missing source JSON identity");
    await expectDbError(pool,
      "INSERT INTO algorithm_bank(id,data) VALUES($1,$2::jsonb)",
      [`${PREFIX}algorithm-wrong-id`, JSON.stringify({ id: "different-id" })], "23514", "rejects algorithm JSON ID mismatch");
    await expectDbError(pool,
      "INSERT INTO knowledge_bank(id,data) VALUES($1,$2::jsonb)",
      [`${PREFIX}knowledge-missing-id`, JSON.stringify({ title: "QA" })], "23514", "rejects missing knowledge JSON ID");
    await expectDbError(pool,
      "INSERT INTO coaching(id,question_id,language,mode,message,model,answer,context) VALUES($1,$2,'python','hint','QA','local','[]'::jsonb,'{}'::jsonb)",
      [`${PREFIX}coach-wrong-answer`, algorithm.rows[0].id], "23514", "rejects wrong-type coaching answer");
    await expectDbError(pool,
      "INSERT INTO coaching(id,question_id,language,mode,message,model,answer,context) VALUES($1,$2,'ruby','hint','QA','local','{}'::jsonb,'{}'::jsonb)",
      [`${PREFIX}coach-wrong-language`, algorithm.rows[0].id], "23514", "rejects invalid coaching language");

    await expectDbError(pool,
      "INSERT INTO applications(id,role_id,company,title,stage,next_action,notes) VALUES($1,$2,'QA','QA','Unknown stage','','')",
      [`${PREFIX}application-invalid-stage`, qaRole], "23514", "rejects invalid application stage");
    await expectDbError(pool,
      "INSERT INTO applications(id,role_id,company,title,stage,next_action,notes) VALUES($1,$2,$3,'QA','Interested','','')",
      [`${PREFIX}application-long-company`, qaRole, "x".repeat(501)], "23514", "rejects overlength application company");
    await expectDbError(pool,
      "INSERT INTO reviews(card_id,rating,reviewed_at,due_at) VALUES($1,'bad','2026-10-27T00:00:00Z','2026-10-28T00:00:00Z')",
      [`${PREFIX}review-invalid-rating`], "23514", "rejects invalid review rating");
    await expectDbError(pool,
      "INSERT INTO sessions(id,exercise_id,mode,notes,code,elapsed,completed_at,self_review) VALUES($1,'qa','Mock','','',86401,now(),'')",
      [`${PREFIX}session-long-elapsed`], "23514", "rejects elapsed time above one day");
    await expectDbError(pool,
      "INSERT INTO sessions(id,exercise_id,mode,notes,code,elapsed,completed_at,self_review) VALUES($1,'qa','Pairing','','',1,now(),'')",
      [`${PREFIX}session-invalid-mode`], "23514", "rejects invalid session mode");
    await expectDbError(pool,
      "INSERT INTO notes(key,value) VALUES($1,$2)",
      [`${PREFIX}note-long`, "x".repeat(100001)], "23514", "rejects overlength note value");
    await expectDbError(pool,
      "INSERT INTO documents(id,application_id,company,title,kind,body,source_url,source_date,tech_stack,requirements) VALUES($1,$2,$3,$4,'JD','Synthetic','javascript:bad','', '[]'::jsonb,'[]'::jsonb)",
      [`${PREFIX}document-bad-url`, app.rows[0].id, app.rows[0].company, app.rows[0].title], "23514", "rejects invalid document source URL");
    await expectDbError(pool,
      "INSERT INTO documents(id,application_id,company,title,kind,body,source_url,source_date,tech_stack,requirements) VALUES($1,$2,$3,$4,'JD','Synthetic','','', '[\"ok\",7]'::jsonb,'[]'::jsonb)",
      [`${PREFIX}document-wrong-array`, app.rows[0].id, app.rows[0].company, app.rows[0].title], "23514", "rejects a non-string document array item");

    await expectDbError(pool,
      "INSERT INTO target_role_states(role_id,data) VALUES($1,$2::jsonb)",
      [qaRole, JSON.stringify({ roleId: qaRole, stage: "unknown", notes: "", updatedAt: "2026-10-27T18:00:00Z" })], "23514", "rejects invalid role state stage");
    await expectDbError(pool,
      "INSERT INTO target_progress(role_id,item_id,data) VALUES($1,$2,$3::jsonb)",
      [qaRole, `${PREFIX}step`, JSON.stringify({ roleId: qaRole, itemId: `${PREFIX}step`, status: "unknown", evidence: "", updatedAt: "2026-10-27T18:00:00Z" })], "23514", "rejects invalid progress status");
    await expectDbError(pool,
      "INSERT INTO target_assessments(role_id,requirement_id,data) VALUES($1,$2,$3::jsonb)",
      [qaRole, `${PREFIX}requirement`, JSON.stringify({ roleId: qaRole, requirementId: `${PREFIX}requirement`, level: "expert", evidence: "", updatedAt: "2026-10-27T18:00:00Z" })], "23514", "rejects invalid assessment level");
    const interviewData = (id: string, roleId: string, companyId: string, status = "target", scheduledAt: string | null = null) => ({ id, roleId, companyId, title: "Synthetic round", scheduledAt, status, format: "Coding", notes: "", updatedAt: "2026-10-27T18:00:00Z" });
    await expectDbError(pool,
      "INSERT INTO target_interviews(id,role_id,company_id,data) VALUES($1,$2,$3,$4::jsonb)",
      [`${PREFIX}interview-invalid-status`, qaRole, company.rows[0].id, JSON.stringify(interviewData(`${PREFIX}interview-invalid-status`, qaRole, company.rows[0].id, "unknown"))], "23514", "rejects invalid interview status");
    await expectDbError(pool,
      "INSERT INTO target_interviews(id,role_id,company_id,data) VALUES($1,$2,$3,$4::jsonb)",
      [`${PREFIX}interview-offset`, qaRole, company.rows[0].id, JSON.stringify(interviewData(`${PREFIX}interview-offset`, qaRole, company.rows[0].id, "scheduled", "2026-10-27T18:00:00"))], "23514", "rejects a scheduled interview without an offset-aware timestamp");
    await expectDbError(pool,
      "INSERT INTO target_interviews(id,role_id,company_id,data) VALUES($1,$2,$3,$4::jsonb)",
      [`${PREFIX}interview-company-mismatch`, qaRole, otherCompany.rows[0].id, JSON.stringify(interviewData(`${PREFIX}interview-company-mismatch`, qaRole, otherCompany.rows[0].id))], "23503", "rejects target interview company-role mismatch");

    const debriefData = (id: string, roleId: string, interviewId: string | null, outcome = "practice") => ({ id, roleId, interviewId, occurredOn: "2026-10-27", outcome, prompt: "", worked: "", struggled: "", feedback: "", nextAction: "", requirementIds: [], createdAt: "2026-10-27T18:00:00Z", resolvedAt: null });
    await expectDbError(pool,
      "INSERT INTO target_debriefs(id,role_id,interview_id,data) VALUES($1,$2,NULL,$3::jsonb)",
      [`${PREFIX}debrief-invalid-outcome`, qaRole, JSON.stringify(debriefData(`${PREFIX}debrief-invalid-outcome`, qaRole, null, "unknown"))], "23514", "rejects invalid debrief outcome");

    const meta = (key: string) => ({ expectedRevision: 0, producer: `${PREFIX}service`, key: `${PREFIX}${key}` });
    const roleResult = await executeCareerCommand(pool, { action: "roleState", data: { roleId: qaRole, stage: "prospect", detailedStage: "Interested", notes: "Synthetic guarded write" }, meta: meta("role") });
    check(roleResult.revision === 1, "service writes valid guarded role state and candidacy");
    const interviewResult = await executeCareerCommand(pool, { action: "interview", data: { id: `${PREFIX}interview`, roleId: qaRole, companyId: company.rows[0].id, title: "Synthetic round", scheduledAt: null, status: "target", format: "Coding", notes: "" }, meta: meta("interview") });
    check(interviewResult.revision === 1, "service writes valid target interview");
    const nullDebrief = await executeCareerCommand(pool, { action: "debrief", data: debriefData(`${PREFIX}debrief-null`, qaRole, null), meta: meta("debrief-null") });
    const nullStored = await pool.query("SELECT interview_id,data->'interviewId' AS json_interview FROM target_debriefs WHERE id=$1", [`${PREFIX}debrief-null`]);
    check(nullDebrief.revision === 1 && nullStored.rows[0]?.interview_id === null && same(nullStored.rows[0]?.json_interview, null), "valid service debrief can remain unlinked with SQL and JSON null");
    await expectDbError(pool,
      "INSERT INTO target_debriefs(id,role_id,interview_id,data) VALUES($1,$2,$3,$4::jsonb)",
      [`${PREFIX}debrief-role-mismatch`, role.rows[0].id, `${PREFIX}interview`, JSON.stringify(debriefData(`${PREFIX}debrief-role-mismatch`, role.rows[0].id, `${PREFIX}interview`))], "23503", "rejects debrief interview-role mismatch");
    await executeCareerCommand(pool, { action: "note", data: { key: `${PREFIX}note`, value: "Synthetic guarded note" }, meta: meta("note") });
    check(true, "service writes a valid bounded note");

    const syntheticCounts = await pool.query<{ count: number }>("SELECT (SELECT count(*) FROM target_roles WHERE id=$1)+(SELECT count(*) FROM target_role_states WHERE role_id=$1)+(SELECT count(*) FROM career_candidacies WHERE id=$2)+(SELECT count(*) FROM target_interviews WHERE id=$3)+(SELECT count(*) FROM target_debriefs WHERE id=$4)+(SELECT count(*) FROM notes WHERE key=$5) AS count", [qaRole, roleResult.entityId, `${PREFIX}interview`, `${PREFIX}debrief-null`, `${PREFIX}note`]);
    check(Number(syntheticCounts.rows[0].count) === 6, "all valid synthetic service writes are present before exact cleanup");

    await cleanup(pool);
    syntheticRoleCreated = false;
    const post = await saveSnapshot(pool, "after-cleanup.json", evidenceDir);
    const cleanupDiffs = compareSnapshots(afterMigration, post, 0);
    check(cleanupDiffs.length === 0, "all 23 tables return to exact post-migration content after synthetic cleanup");
    const residual = await pool.query("SELECT (SELECT count(*) FROM target_roles WHERE id LIKE 'qa-storage-v3-%')+(SELECT count(*) FROM target_interviews WHERE id LIKE 'qa-storage-v3-%')+(SELECT count(*) FROM target_debriefs WHERE id LIKE 'qa-storage-v3-%')+(SELECT count(*) FROM notes WHERE key LIKE 'qa-storage-v3-%')+(SELECT count(*) FROM command_receipts WHERE producer LIKE 'qa-storage-v3-%') AS count");
    check(Number(residual.rows[0].count) === 0, "no storage-v3 synthetic identifiers remain");
    console.log(`RESULT PASS checks=${checks} db=${DATABASE}`);
  } catch (error) {
    console.error(`RESULT FAIL checks=${checks} error=${safeError(error)}`);
    throw error;
  } finally {
    if (syntheticRoleCreated) await cleanup(pool).catch(() => undefined);
    await pool.end();
  }
}

main().catch(() => { process.exitCode = 1; });
