import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const VERSION = "career-v1";
const LOCK_NAME = "interview-desk-career-v1";
const PRODUCER = "migration:career-v1";
const BACKFILL_SPEC = [
  "target_roles.data.applicationId is the only role/application association",
  "target-only role states become candidacies with submittedAt null",
  "unlinked applications remain candidacies with roleId null",
  "stage conflict or unknown maps to Needs review and preserves raw rows",
  "revision 1 baseline for candidacy, interview, debrief, and note",
].join("\n");

const DDL = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now(),
    checksum text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS career_candidacies (
    id text PRIMARY KEY,
    role_id text REFERENCES target_roles(id),
    application_id text REFERENCES applications(id),
    current boolean NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    data jsonb NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS career_candidacies_current_role_uq
    ON career_candidacies(role_id) WHERE current AND role_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS career_candidacies_current_application_uq
    ON career_candidacies(application_id) WHERE current AND application_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS record_heads (
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    CHECK (entity_type IN ('candidacy', 'interview', 'debrief', 'note')),
    PRIMARY KEY (entity_type, entity_id)
  )`,
  `CREATE TABLE IF NOT EXISTS record_revisions (
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    previous_revision integer,
    recorded_at timestamptz NOT NULL,
    producer text NOT NULL,
    reason text NOT NULL,
    command_key text,
    content jsonb NOT NULL,
    CHECK (entity_type IN ('candidacy', 'interview', 'debrief', 'note')),
    PRIMARY KEY (entity_type, entity_id, revision)
  )`,
  `CREATE TABLE IF NOT EXISTS command_receipts (
    producer text NOT NULL,
    command text NOT NULL,
    key text NOT NULL,
    input_hash text NOT NULL,
    result jsonb NOT NULL,
    recorded_at timestamptz NOT NULL,
    PRIMARY KEY (producer, command, key)
  )`,
] as const;

const CHECKSUM = createHash("sha256")
  .update(`${VERSION}\n${DDL.join(";\n")}\n${PRODUCER}\n${BACKFILL_SPEC}`)
  .digest("hex");

const detailedStages = new Set([
  "Interested",
  "Applied",
  "Recruiter screen",
  "Interviewing",
  "Technical interview",
  "In progress",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Needs review",
]);

type JsonObject = Record<string, any>;
type TargetRoleRow = { id: string; company_id: string; data: JsonObject };
type RoleStateRow = { role_id: string; data: JsonObject };
type ApplicationRow = {
  id: string;
  role_id: string;
  company: string;
  title: string;
  stage: string;
  next_action: string;
  notes: string;
  updated_at: Date | string;
};
type BaselineCandidate = {
  id: string;
  roleId: string | null;
  applicationId: string | null;
  stage: string;
  pipelineNotes: string;
  notes: string;
  nextAction: string;
  company: string;
  title: string;
  submittedAt: null;
  updatedAt: string;
  revision: 1;
  legacy: { application: ApplicationRow | null; roleState: JsonObject | null };
  reconciliation: string[];
};

function derivedBoard(stage: string): string {
  if (stage === "Interested") return "prospect";
  if (["Applied", "Recruiter screen", "Interviewing", "Technical interview", "In progress"].includes(stage)) return "active";
  if (stage === "Offer") return "offer";
  if (stage === "Rejected") return "rejected";
  if (stage === "Withdrawn") return "withdrawn";
  return "needs-review";
}

function broadToDetailed(stage: unknown): string | null {
  switch (stage) {
    case "prospect": return "Interested";
    case "active": return "In progress";
    case "offer": return "Offer";
    case "rejected": return "Rejected";
    case "withdrawn": return "Withdrawn";
    default: return null;
  }
}

function jsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function timestamp(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function buildCandidacy(input: {
  role: TargetRoleRow | null;
  roleState: RoleStateRow | null;
  application: ApplicationRow | null;
  companyName: string;
}): BaselineCandidate {
  const { role, roleState, application, companyName } = input;
  const roleId = role?.id ?? roleState?.role_id ?? null;
  const applicationId = application?.id ?? null;
  const rawDetailed = application?.stage ?? "";
  const rawBroad = roleState?.data?.stage;
  const mappedBroad = roleState ? broadToDetailed(rawBroad) : null;
  const reconciliation: string[] = [];
  let stage: string;

  if (application) {
    if (!detailedStages.has(rawDetailed)) {
      stage = "Needs review";
      reconciliation.push(`Unrecognized application stage: ${String(rawDetailed)}`);
    } else if (roleState && (!mappedBroad || derivedBoard(rawDetailed) !== derivedBoard(mappedBroad))) {
      stage = "Needs review";
      reconciliation.push(`Stage conflict: application=${rawDetailed}; targetRoleState=${String(rawBroad)}`);
    } else {
      stage = rawDetailed;
    }
  } else if (roleState) {
    if (mappedBroad) {
      stage = mappedBroad;
    } else {
      stage = "Needs review";
      reconciliation.push(`Unrecognized target role stage: ${String(rawBroad)}`);
    }
  } else {
    stage = "Needs review";
    reconciliation.push("No stage source was available during baseline import.");
  }

  const updatedAt = timestamp(application?.updated_at) ?? timestamp(roleState?.data?.updatedAt);
  if (!updatedAt) reconciliation.push("No source update timestamp was available; left blank.");
  const data: BaselineCandidate = {
    id: application ? `application:${application.id}` : `role:${roleId}`,
    roleId,
    applicationId,
    stage,
    pipelineNotes: typeof roleState?.data?.notes === "string" ? roleState.data.notes : "",
    notes: application?.notes ?? "",
    nextAction: application?.next_action ?? "",
    company: application?.company ?? companyName,
    title: application?.title ?? role?.data?.title ?? "",
    submittedAt: null,
    updatedAt: updatedAt ?? "",
    revision: 1,
    legacy: {
      application: application ? jsonValue(application) as ApplicationRow : null,
      roleState: roleState ? jsonValue({ role_id: roleState.role_id, data: roleState.data }) as JsonObject : null,
    },
    reconciliation,
  };
  return data;
}

async function insertBaselineRecord(client: PoolClient, entityType: string, entityId: string, content: unknown): Promise<void> {
  await client.query(
    `INSERT INTO record_heads (entity_type, entity_id, revision)
     VALUES ($1, $2, 1) ON CONFLICT (entity_type, entity_id) DO NOTHING`,
    [entityType, entityId],
  );
  await client.query(
    `INSERT INTO record_revisions
       (entity_type, entity_id, revision, previous_revision, recorded_at, producer, reason, command_key, content)
     VALUES ($1, $2, 1, NULL, now(), $3, 'baseline_import', NULL, $4::jsonb)
     ON CONFLICT (entity_type, entity_id, revision) DO NOTHING`,
    [entityType, entityId, PRODUCER, JSON.stringify(content)],
  );
}

/**
 * Applies the career-v1 additive migration and baseline import.
 * The caller must run this function inside a transaction. It intentionally does
 * not begin, commit, or roll back that transaction.
 */
export async function applyCareerMigration(client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [LOCK_NAME]);
  await client.query(DDL[0]);

  const existing = await client.query<{ checksum: string }>(
    "SELECT checksum FROM schema_migrations WHERE version = $1",
    [VERSION],
  );
  if (existing.rowCount) {
    if (existing.rows[0].checksum !== CHECKSUM) {
      throw new Error(`Migration ${VERSION} checksum does not match the applied ledger entry.`);
    }
    return;
  }
  for (const statement of DDL.slice(1)) await client.query(statement);

  const rolesResult = await client.query<TargetRoleRow>("SELECT id, company_id, data FROM target_roles ORDER BY id");
  const statesResult = await client.query<RoleStateRow>("SELECT role_id, data FROM target_role_states ORDER BY role_id");
  const applicationsResult = await client.query<ApplicationRow>("SELECT id, role_id, company, title, stage, next_action, notes, updated_at FROM applications ORDER BY id");
  const companiesResult = await client.query<{ id: string; data: JsonObject }>("SELECT id, data FROM target_companies ORDER BY id");
  const roles = new Map(rolesResult.rows.map(row => [row.id, row]));
  const states = new Map(statesResult.rows.map(row => [row.role_id, row]));
  const applications = new Map(applicationsResult.rows.map(row => [row.id, row]));
  const companyNames = new Map(companiesResult.rows.map(row => [row.id, String(row.data?.name ?? "")]));
  const roleForApplication = new Map<string, TargetRoleRow>();

  for (const role of roles.values()) {
    if (role.data?.id != null && role.data.id !== role.id) {
      throw new Error(`Target role row ${role.id} conflicts with its JSON identity.`);
    }
    const linkedApplicationId = role.data?.applicationId;
    if (linkedApplicationId == null || linkedApplicationId === "") continue;
    if (role.company_id === "general") throw new Error(`General role ${role.id} cannot own a candidacy.`);
    if (typeof linkedApplicationId !== "string" || !applications.has(linkedApplicationId)) {
      throw new Error(`Role ${role.id} has an unresolved applicationId link.`);
    }
    if (roleForApplication.has(linkedApplicationId)) {
      throw new Error(`Application ${linkedApplicationId} is linked to multiple target roles.`);
    }
    roleForApplication.set(linkedApplicationId, role);
  }

  const candidacies: BaselineCandidate[] = [];
  const handledApplications = new Set<string>();
  for (const state of states.values()) {
    const role = roles.get(state.role_id);
    if (!role) throw new Error(`Role state ${state.role_id} has no target role.`);
    if (state.data?.roleId != null && state.data.roleId !== state.role_id) {
      throw new Error(`Role state row ${state.role_id} conflicts with its JSON identity.`);
    }
    if (role.company_id === "general") throw new Error("The general preparation track cannot become a candidacy.");
    const linkedId = role.data?.applicationId;
    const application = linkedId ? applications.get(linkedId) ?? null : null;
    if (linkedId && !application) throw new Error(`Role ${role.id} has an unresolved applicationId link.`);
    if (application) handledApplications.add(application.id);
    candidacies.push(buildCandidacy({
      role,
      roleState: state,
      application,
      companyName: companyNames.get(role.company_id) ?? "",
    }));
  }

  // An explicit role applicationId can exist without a role-state row. It is still
  // an identity link, so retain it as a linked candidacy instead of dropping it.
  for (const [applicationId, role] of roleForApplication) {
    if (handledApplications.has(applicationId)) continue;
    const application = applications.get(applicationId)!;
    candidacies.push(buildCandidacy({
      role,
      roleState: null,
      application,
      companyName: companyNames.get(role.company_id) ?? "",
    }));
    handledApplications.add(applicationId);
  }

  // Applications without explicit target-role applicationId evidence remain
  // independent candidacies. Their legacy role_id is preserved in the raw row.
  for (const application of applications.values()) {
    if (handledApplications.has(application.id)) continue;
    candidacies.push(buildCandidacy({
      role: null,
      roleState: null,
      application,
      companyName: application.company,
    }));
  }

  const existingNewRows = await client.query<{ occupied: boolean }>(`
    SELECT EXISTS (SELECT 1 FROM career_candidacies)
        OR EXISTS (SELECT 1 FROM record_heads)
        OR EXISTS (SELECT 1 FROM record_revisions)
        OR EXISTS (SELECT 1 FROM command_receipts) AS occupied
  `);
  if (existingNewRows.rows[0]?.occupied) {
    throw new Error("Career tables contain rows but the career-v1 migration ledger entry is missing; refusing to overwrite or adopt them.");
  }

  for (const candidacy of candidacies) {
    const content = jsonValue(candidacy) as BaselineCandidate;
    await client.query(
      `INSERT INTO career_candidacies (id, role_id, application_id, current, revision, data)
       VALUES ($1, $2, $3, true, 1, $4::jsonb)`,
      [content.id, content.roleId, content.applicationId, JSON.stringify(content)],
    );
    await insertBaselineRecord(client, "candidacy", content.id, content);
  }

  const interviewRows = await client.query<{ id: string; data: JsonObject }>(
    "SELECT id, data FROM target_interviews ORDER BY id",
  );
  for (const row of interviewRows.rows) {
    await insertBaselineRecord(client, "interview", row.id, jsonValue(row.data));
  }

  const debriefRows = await client.query<{ id: string; data: JsonObject }>(
    "SELECT id, data FROM target_debriefs ORDER BY id",
  );
  for (const row of debriefRows.rows) {
    await insertBaselineRecord(client, "debrief", row.id, jsonValue(row.data));
  }

  const noteRows = await client.query<{ key: string; value: string }>(
    "SELECT key, value FROM notes ORDER BY key",
  );
  for (const row of noteRows.rows) {
    await insertBaselineRecord(client, "note", row.key, { key: row.key, value: row.value });
  }

  await client.query(
    "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
    [VERSION, CHECKSUM],
  );
}
