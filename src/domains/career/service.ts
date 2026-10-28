import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { boardStage, careerStages, type CareerCandidacy, type CareerStage, type CommandMeta, type CommandResult, type RecordRevision } from "./contracts";

export class CareerError extends Error {
  constructor(message: string, public status: number, public code: string, public currentRevision?: number) {
    super(message);
    this.name = "CareerError";
  }
}

type Mutation = { action: string; data: any; meta: CommandMeta };
type Row = Record<string, any>;
type Db = Pool | PoolClient;

const stageSet = new Set<string>(careerStages);
const roundStatuses = new Set(["target", "scheduled", "completed", "cancelled"]);
const outcomes = new Set(["pending", "passed", "rejected", "practice"]);
const isoNow = () => new Date().toISOString();

function fail(message: string, status: number, code: string): never { throw new CareerError(message, status, code); }
function assertMeta(meta: CommandMeta): void {
  if (!meta || !Number.isInteger(meta.expectedRevision) || meta.expectedRevision < 0 || !meta.producer?.trim() || !meta.key?.trim()) {
    fail("A valid revision and command retry key are required. Reload and retry.", 428, "precondition_required");
  }
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function stage(value: unknown): CareerStage {
  return typeof value === "string" && stageSet.has(value) ? value as CareerStage : "Needs review";
}
function json(value: unknown): any { return typeof value === "string" ? JSON.parse(value) : value; }
function requireString(value: any, field: string): string {
  if (typeof value !== "string" || !value.trim()) fail(`A valid ${field} is required.`, 400, "invalid_input");
  return value;
}
function assertRevision(expected: number, actual: number): void {
  if (expected !== actual) throw new CareerError("This record changed since you opened it. Review the current version before retrying.", 409, "revision_conflict", actual);
}
async function queryOne<T extends Row = Row>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  const result = await db.query<T>(sql, params);
  return result.rows[0];
}

async function commitRecord(client: PoolClient, input: {
  entityType: string; entityId: string; expected: number; producer: string; key: string; reason: string; content: unknown;
  write: (revision: number) => Promise<void>;
}): Promise<CommandResult> {
  const head = await queryOne<{ revision: number }>(client, "SELECT revision FROM record_heads WHERE entity_type=$1 AND entity_id=$2 FOR UPDATE", [input.entityType, input.entityId]);
  const actual = head?.revision ?? 0;
  if (input.expected !== actual) throw new CareerError("This record changed since you opened it. Review the current version before retrying.", 409, "revision_conflict", actual);
  const revision = actual + 1;
  const versionedContent = input.content && typeof input.content === "object" && !Array.isArray(input.content) ? { ...input.content as Row, revision } : input.content;
  await input.write(revision);
  await client.query("INSERT INTO record_heads(entity_type,entity_id,revision) VALUES($1,$2,$3) ON CONFLICT(entity_type,entity_id) DO UPDATE SET revision=EXCLUDED.revision", [input.entityType, input.entityId, revision]);
  await client.query("INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [input.entityType, input.entityId, revision, actual || null, isoNow(), input.producer, input.reason, input.key, JSON.stringify(versionedContent)]);
  return { entityType: input.entityType, entityId: input.entityId, revision, content: versionedContent };
}

async function targetRole(client: PoolClient, id: string): Promise<Row> {
  const row = await queryOne<{ id: string; company_id: string; data: Row }>(client, "SELECT id,company_id,data FROM target_roles WHERE id=$1 FOR SHARE", [id]);
  if (!row) fail("This target role was not found.", 404, "not_found");
  return { ...row, data: json(row.data) };
}

function storedDate(value: unknown, empty = false): string | null {
  if (value === null || value === undefined || value === "") return empty ? "" : null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? (empty ? "" : null) : parsed.toISOString();
}
function candidacyFromRow(row: Row): CareerCandidacy {
  const snapshot = json(row.data) ?? {};
  return {
    id: row.id, roleId: row.role_id, applicationId: row.application_id, revision: row.revision,
    stage: stage(row.stage), company: row.company, title: row.title, pipelineNotes: row.pipeline_notes,
    notes: row.notes, nextAction: row.next_action, submittedAt: storedDate(row.submitted_at),
    updatedAt: storedDate(row.updated_at, true) ?? "", legacy: snapshot.legacy ?? { application: null, roleState: null },
    reconciliation: Array.isArray(row.reconciliation) ? row.reconciliation : [],
  };
}
async function existingCandidacy(client: PoolClient, id: string): Promise<CareerCandidacy | undefined> {
  const row = await queryOne<Row>(client, "SELECT id,role_id,application_id,revision,data,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation FROM career_candidacies WHERE id=$1 FOR UPDATE", [id]);
  return row ? candidacyFromRow(row) : undefined;
}

async function writeCandidacy(client: PoolClient, old: CareerCandidacy | undefined, content: CareerCandidacy, revision: number, legacyRoleId: string | null, checkLegacyRoleId: boolean): Promise<void> {
  const stored = { ...content, revision };
  if (stored.applicationId) {
    const oldApp = await queryOne<Row>(client, "SELECT id,role_id,company,title FROM applications WHERE id=$1 FOR UPDATE", [stored.applicationId]);
    if (oldApp && old && (oldApp.id !== old.applicationId || oldApp.company !== old.company || oldApp.title !== old.title || (checkLegacyRoleId && oldApp.role_id !== (legacyRoleId ?? "")))) fail("Application identity fields cannot be changed.", 409, "identity_immutable");
    if (oldApp) {
      await client.query("UPDATE applications SET stage=$2,next_action=$3,notes=$4,updated_at=$5 WHERE id=$1", [stored.applicationId, stored.stage, stored.nextAction, stored.notes, stored.updatedAt]);
    } else {
      await client.query("INSERT INTO applications(id,role_id,company,title,stage,next_action,notes,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [stored.applicationId, legacyRoleId ?? "", stored.company, stored.title, stored.stage, stored.nextAction, stored.notes, stored.updatedAt]);
    }
  }
  if (stored.roleId) {
    const broad = boardStage(stored.stage);
    const state = { roleId: stored.roleId, stage: broad, detailedStage: stored.stage, notes: stored.pipelineNotes, updatedAt: stored.updatedAt };
    await client.query("INSERT INTO target_role_states(role_id,data) VALUES($1,$2) ON CONFLICT(role_id) DO UPDATE SET data=EXCLUDED.data", [stored.roleId, JSON.stringify(state)]);
  }
  if (old && old.stage !== stored.stage && stored.applicationId) {
    await client.query("INSERT INTO activities(id,application_id,kind,body) VALUES($1,$2,'Stage change',$3)", [randomUUID(), stored.applicationId, `${old.stage} → ${stored.stage}`]);
  }
  await client.query(`INSERT INTO career_candidacies
    (id,role_id,application_id,current,revision,data,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation)
    VALUES($1,$2,$3,true,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT(id) DO UPDATE SET role_id=EXCLUDED.role_id,application_id=EXCLUDED.application_id,current=EXCLUDED.current,
      revision=EXCLUDED.revision,stage=EXCLUDED.stage,company=EXCLUDED.company,title=EXCLUDED.title,
      pipeline_notes=EXCLUDED.pipeline_notes,notes=EXCLUDED.notes,next_action=EXCLUDED.next_action,
      submitted_at=EXCLUDED.submitted_at,updated_at=EXCLUDED.updated_at,reconciliation=EXCLUDED.reconciliation`,
    [stored.id, stored.roleId, stored.applicationId, revision, JSON.stringify(stored), stored.stage, stored.company,
      stored.title, stored.pipelineNotes, stored.notes, stored.nextAction, stored.submittedAt, stored.updatedAt || null,
      JSON.stringify(stored.reconciliation)]);
}

async function updateCandidacy(client: PoolClient, mutation: Mutation): Promise<CommandResult> {
  const d = mutation.data;
  const isApp = mutation.action === "application";
  const suppliedRoleId = isApp ? (typeof d.roleId === "string" && d.roleId ? d.roleId : null) : requireString(d.roleId, "role");
  const appId = isApp ? requireString(d.id, "application id") : undefined;
  let role: Row | undefined;
  if (suppliedRoleId) {
    const found = await queryOne<{ id: string; company_id: string; data: Row }>(client, "SELECT id,company_id,data FROM target_roles WHERE id=$1 FOR SHARE", [suppliedRoleId]);
    if (found) role = { ...found, data: json(found.data) };
    else if (!isApp) fail("This target role was not found.", 404, "not_found");
  }
  if (!isApp && role?.company_id === "general") fail("General preparation is not a candidacy.", 400, "invalid_candidacy");
  const linkedApp = isApp ? appId! : role?.data.applicationId ?? null;
  const id = isApp ? `application:${appId}` : linkedApp ? `application:${linkedApp}` : `role:${suppliedRoleId}`;
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-entity:candidacy:${id}`]);
  const old = await existingCandidacy(client, id);
  const roleId = old ? old.roleId : (!isApp ? suppliedRoleId : role?.data.applicationId === appId ? suppliedRoleId : null);
  const broadToDetailed: Record<string, CareerStage> = { prospect: "Interested", active: "In progress", offer: "Offer", rejected: "Rejected", withdrawn: "Withdrawn" };
  const validBoardStages = new Set(["prospect", "active", "offer", "rejected", "withdrawn", "needs-review"]);
  if (!isApp && !validBoardStages.has(d.stage)) fail("Unknown candidacy board stage.", 400, "invalid_stage");
  const actualStage = isApp ? d.stage : d.detailedStage ?? (old?.stage && boardStage(old.stage) === d.stage ? old.stage : broadToDetailed[d.stage] ?? "Needs review");
  const newStage = stage(actualStage);
  if (isApp && !stageSet.has(d.stage)) fail("Unknown candidacy stage.", 400, "invalid_stage");
  if (!isApp && d.detailedStage && (!stageSet.has(d.detailedStage) || boardStage(d.detailedStage) !== d.stage)) fail("The detailed stage does not match its board projection.", 400, "invalid_stage_projection");
  if (mutation.meta.expectedRevision === 0 && old) assertRevision(0, old.revision);
  if (mutation.meta.expectedRevision > 0 && !old) assertRevision(mutation.meta.expectedRevision, 0);
  const companyRecord = !isApp && !old ? await queryOne<{ data: Row }>(client, "SELECT data FROM target_companies WHERE id=$1", [role!.company_id]) : undefined;
  const company = isApp ? requireString(d.company, "company") : old?.company ?? json(companyRecord?.data)?.name ?? role!.company_id;
  const title = isApp ? requireString(d.title, "title") : old?.title ?? role!.data.title;
  const content: CareerCandidacy = {
    id, roleId, applicationId: linkedApp, stage: newStage,
    pipelineNotes: isApp ? old?.pipelineNotes ?? "" : d.notes ?? old?.pipelineNotes ?? "",
    notes: isApp ? d.notes ?? old?.notes ?? "" : old?.notes ?? "",
    nextAction: isApp ? d.nextAction ?? old?.nextAction ?? "" : old?.nextAction ?? "",
    company, title, submittedAt: old?.submittedAt ?? null, updatedAt: isoNow(), revision: old?.revision ?? 0,
    legacy: old?.legacy ?? { application: null, roleState: null }, reconciliation: old?.reconciliation ?? [],
  };
  if (old && (old.roleId !== content.roleId || old.applicationId !== content.applicationId || old.company !== company || old.title !== title)) fail("Candidacy identity fields cannot be changed.", 409, "identity_immutable");
  const result = await commitRecord(client, { entityType: "candidacy", entityId: id, expected: mutation.meta.expectedRevision, producer: mutation.meta.producer, key: mutation.meta.key, reason: mutation.action, content, write: revision => writeCandidacy(client, old, content, revision, suppliedRoleId, isApp) });
  result.content = { ...content, revision: result.revision };
  return result;
}

async function updateInterview(client: PoolClient, mutation: Mutation): Promise<CommandResult> {
  const d = mutation.data; const id = requireString(d.id, "interview id");
  const role = await targetRole(client, requireString(d.roleId, "role"));
  if (d.companyId !== role.company_id) fail("The interview company must match the selected role.", 400, "invalid_relationship");
  if (!roundStatuses.has(d.status)) fail("Unknown interview status.", 400, "invalid_input");
  const validDateTime = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
  if (d.status === "scheduled" && !validDateTime(d.scheduledAt)) fail("A scheduled interview needs a valid date and time.", 400, "invalid_input");
  if (d.scheduledAt !== null && d.scheduledAt !== undefined && !validDateTime(d.scheduledAt)) fail("Use a valid interview date and time.", 400, "invalid_input");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-entity:interview:${id}`]);
  const old = await queryOne<{ role_id: string; company_id: string; data: Row }>(client, "SELECT role_id,company_id,data FROM target_interviews WHERE id=$1 FOR UPDATE", [id]);
  const previous = old && json(old.data);
  if (previous && (old!.role_id !== d.roleId || old!.company_id !== d.companyId)) fail("An existing interview cannot be moved to another role or company.", 409, "identity_immutable");
  const content = { ...d, scheduledAt: d.scheduledAt ? new Date(d.scheduledAt).toISOString() : null, updatedAt: isoNow() };
  return commitRecord(client, { entityType: "interview", entityId: id, expected: mutation.meta.expectedRevision, producer: mutation.meta.producer, key: mutation.meta.key, reason: "interview.save", content, write: async revision => {
    await client.query("INSERT INTO target_interviews(id,role_id,company_id,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data", [id, d.roleId, d.companyId, JSON.stringify({ ...content, revision })]);
  } });
}

async function updateDebrief(client: PoolClient, mutation: Mutation): Promise<CommandResult> {
  const d = mutation.data; const id = requireString(d.id, "debrief id"); const role = await targetRole(client, requireString(d.roleId, "role"));
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-entity:debrief:${id}`]);
  const old = await queryOne<{ role_id: string; interview_id: string | null; data: Row }>(client, "SELECT role_id,interview_id,data FROM target_debriefs WHERE id=$1 FOR UPDATE", [id]);
  const previous = old && json(old.data);
  if (previous && (old!.role_id !== d.roleId || old!.interview_id !== (d.interviewId ?? null))) fail("An existing debrief cannot be moved to another role or interview.", 409, "identity_immutable");
  if (d.interviewId) {
    const interview = await queryOne<{ role_id: string }>(client, "SELECT role_id FROM target_interviews WHERE id=$1 FOR SHARE", [d.interviewId]);
    if (!interview || interview.role_id !== d.roleId) fail("The linked interview must belong to this role.", 400, "invalid_relationship");
  }
  const allowed = new Set(role.data.requirements?.map((r: Row) => r.id) ?? []);
  if (!Array.isArray(d.requirementIds) || d.requirementIds.some((id: string) => !allowed.has(id))) fail("Every selected requirement must belong to this role.", 400, "invalid_relationship");
  if (!outcomes.has(d.outcome)) fail("Unknown interview outcome.", 400, "invalid_input");
  const content = { ...d, interviewId: d.interviewId ?? null, createdAt: previous?.createdAt ?? isoNow(), resolvedAt: previous?.resolvedAt ?? null };
  return commitRecord(client, { entityType: "debrief", entityId: id, expected: mutation.meta.expectedRevision, producer: mutation.meta.producer, key: mutation.meta.key, reason: "interview.debrief.save", content, write: async revision => {
    await client.query("INSERT INTO target_debriefs(id,role_id,interview_id,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data", [id, d.roleId, content.interviewId, JSON.stringify({ ...content, revision })]);
  } });
}

async function resolveDebrief(client: PoolClient, mutation: Mutation): Promise<CommandResult> {
  const id = requireString(mutation.data.id, "debrief id");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-entity:debrief:${id}`]);
  const row = await queryOne<{ data: Row }>(client, "SELECT data FROM target_debriefs WHERE id=$1 FOR UPDATE", [id]);
  if (!row) fail("This interview debrief was not found.", 404, "not_found");
  const previous = json(row.data); const content = { ...previous, resolvedAt: mutation.data.resolved ? previous.resolvedAt ?? isoNow() : null };
  return commitRecord(client, { entityType: "debrief", entityId: id, expected: mutation.meta.expectedRevision, producer: mutation.meta.producer, key: mutation.meta.key, reason: "interview.followup.resolve", content, write: async revision => {
    await client.query("UPDATE target_debriefs SET data=$2 WHERE id=$1", [id, JSON.stringify({ ...content, revision })]);
  } });
}

async function updateNote(client: PoolClient, mutation: Mutation): Promise<CommandResult> {
  const key = requireString(mutation.data.key, "note key"); const value = mutation.data.value;
  if (typeof value !== "string") fail("A note value is required.", 400, "invalid_input");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-entity:note:${key}`]);
  const old = await queryOne<{ value: string }>(client, "SELECT value FROM notes WHERE key=$1 FOR UPDATE", [key]);
  const content = { key, value };
  return commitRecord(client, { entityType: "note", entityId: key, expected: mutation.meta.expectedRevision, producer: mutation.meta.producer, key: mutation.meta.key, reason: "note.save", content, write: async () => {
    await client.query("INSERT INTO notes(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value", [key, value]);
  } });
}

export async function executeCareerCommand(pool: Pool, mutation: { action: string; data: any; meta: CommandMeta }): Promise<CommandResult> {
  assertMeta(mutation.meta);
  const action = mutation.action;
  if (!["application", "roleState", "interview", "debrief", "resolve", "note"].includes(action)) fail("This command is not handled by the career service.", 400, "unsupported_command");
  const validated = canonical({ action, data: mutation.data, expectedRevision: mutation.meta.expectedRevision });
  const inputHash = createHash("sha256").update(JSON.stringify(validated)).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`career-command:${mutation.meta.producer}:${action}:${mutation.meta.key}`]);
    const receipt = await queryOne<{ input_hash: string; result: CommandResult }>(client, "SELECT input_hash,result FROM command_receipts WHERE producer=$1 AND command=$2 AND key=$3 FOR UPDATE", [mutation.meta.producer, action, mutation.meta.key]);
    if (receipt) {
      if (receipt.input_hash !== inputHash) fail("This retry key was already used for different input.", 409, "idempotency_key_reused");
      await client.query("COMMIT");
      return json(receipt.result);
    }
    let result: CommandResult;
    if (action === "application" || action === "roleState") result = await updateCandidacy(client, mutation);
    else if (action === "interview") result = await updateInterview(client, mutation);
    else if (action === "debrief") result = await updateDebrief(client, mutation);
    else if (action === "resolve") result = await resolveDebrief(client, mutation);
    else result = await updateNote(client, mutation);
    await client.query("INSERT INTO command_receipts(producer,command,key,input_hash,result,recorded_at) VALUES($1,$2,$3,$4,$5,$6)", [mutation.meta.producer, action, mutation.meta.key, inputHash, JSON.stringify(result), isoNow()]);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof CareerError) throw error;
    throw new CareerError("Your change has not been confirmed. Retry with the same command key when your workspace is available.", 503, "save_unconfirmed");
  } finally { client.release(); }
}

export async function readCareer(pool: Pool): Promise<{ candidacies: CareerCandidacy[]; revisions: RecordRevision[] }> {
  const [candidacies, revisions] = await Promise.all([
    pool.query<Row>("SELECT id,role_id,application_id,revision,data,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation FROM career_candidacies WHERE current=true ORDER BY company,title,id"),
    pool.query<Row>("SELECT entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content FROM record_revisions ORDER BY recorded_at,entity_type,entity_id,revision"),
  ]);
  return {
    candidacies: candidacies.rows.map(candidacyFromRow),
    revisions: revisions.rows.map(row => ({ entityType: row.entity_type, entityId: row.entity_id, revision: row.revision, previousRevision: row.previous_revision, recordedAt: new Date(row.recorded_at).toISOString(), producer: row.producer, reason: row.reason, commandKey: row.command_key, content: json(row.content) })),
  };
}
