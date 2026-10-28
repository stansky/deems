import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const VERSION = "practice-v5";
const statements = [
  `CREATE TABLE practice_attempts (
    session_id text PRIMARY KEY REFERENCES sessions(id),
    role_id text REFERENCES target_roles(id), plan_step_id text,
    exercise_id text NOT NULL, data jsonb NOT NULL,
    revision integer NOT NULL CHECK(revision >= 1), saved_at timestamptz NOT NULL,
    CHECK(char_length(session_id) BETWEEN 1 AND 120 AND char_length(exercise_id) BETWEEN 1 AND 120),
    CHECK((role_id IS NULL AND plan_step_id IS NULL) OR (role_id IS NOT NULL AND plan_step_id IS NOT NULL AND char_length(plan_step_id) BETWEEN 1 AND 120)),
    CHECK(COALESCE(jsonb_typeof(data)='object' AND octet_length(data::text)<=1000000
      AND data->>'sessionId'=session_id AND data->>'exerciseId'=exercise_id
      AND jsonb_typeof(data->'revision')='number' AND (data->>'revision')::integer=revision
      AND data->>'contentVersion' ~ '^[0-9a-f]{64}$'
      AND pg_input_is_valid(data->>'savedAt','timestamptz') AND (data->>'savedAt')::timestamptz=saved_at
      AND jsonb_typeof(data->'content')='object' AND jsonb_typeof(data->'assistance')='object'
      AND data->'assessment'->>'source'='self_report' AND data->'assessment'->>'execution'='not_run'
      AND ((role_id IS NULL AND data->'origin'='null'::jsonb) OR (role_id IS NOT NULL AND data->'origin'->>'roleId'=role_id AND data->'origin'->>'planStepId'=plan_step_id))
      AND (data->'attachment'='null'::jsonb OR (role_id IS NOT NULL AND jsonb_typeof(data->'attachment')='object' AND char_length(data->'attachment'->>'requirementId') BETWEEN 1 AND 120 AND pg_input_is_valid(data->'attachment'->>'attachedAt','timestamptz'))), false))
  )`,
  `CREATE INDEX practice_attempts_role ON practice_attempts(role_id, saved_at DESC) WHERE role_id IS NOT NULL`,
  `CREATE TABLE practice_evidence_revisions (
    session_id text NOT NULL REFERENCES practice_attempts(session_id), revision integer NOT NULL CHECK(revision >= 2),
    previous_requirement_id text, requirement_id text, recorded_at timestamptz NOT NULL,
    PRIMARY KEY(session_id,revision),
    CHECK(previous_requirement_id IS NULL OR char_length(previous_requirement_id) BETWEEN 1 AND 120),
    CHECK(requirement_id IS NULL OR char_length(requirement_id) BETWEEN 1 AND 120)
  )`,
  `CREATE TABLE practice_command_receipts (
    producer text NOT NULL, action text NOT NULL CHECK(action IN ('save','attach')), key text NOT NULL,
    input_hash text NOT NULL CHECK(input_hash ~ '^[0-9a-f]{64}$'), result jsonb NOT NULL,
    recorded_at timestamptz NOT NULL, PRIMARY KEY(producer,action,key),
    CHECK(char_length(producer) BETWEEN 1 AND 100 AND producer ~ '^[a-zA-Z0-9:_-]+$'),
    CHECK(char_length(key) BETWEEN 1 AND 200 AND key ~ '^[a-zA-Z0-9:_-]+$'),
    CHECK(jsonb_typeof(result)='object' AND octet_length(result::text)<=1000000)
  )`,
] as const;
const checksum = createHash("sha256").update(`${VERSION}\n${statements.join(";\n")}`).digest("hex");
export async function applyPracticeMigration(client: PoolClient) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["interview-desk-career-v1"]);
  const found = await client.query<{ checksum: string }>("SELECT checksum FROM schema_migrations WHERE version=$1", [VERSION]);
  if (found.rows[0]) {
    if (found.rows[0].checksum !== checksum) throw new Error("Practice migration checksum mismatch.");
    return;
  }
  for (const statement of statements) await client.query(statement);
  await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [VERSION, checksum]);
}
