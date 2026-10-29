import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
const version = "coding-v6";
const statements = [
  `CREATE TABLE coding_attempts (
    id uuid PRIMARY KEY,
    question_id text NOT NULL REFERENCES algorithm_bank(id),
    language varchar(10) NOT NULL CHECK(language IN ('javascript','python')),
    mode varchar(8) NOT NULL CHECK(mode IN ('examples','submit')),
    source_code text NOT NULL CHECK(char_length(source_code) BETWEEN 1 AND 32000),
    request_hash char(64) NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
    suite_version char(64) NOT NULL CHECK(suite_version ~ '^[a-f0-9]{64}$'),
    status varchar(20) NOT NULL CHECK(status IN ('queued','passed','wrong_answer','runtime_error','time_limit','runner_error')),
    result jsonb NOT NULL CHECK(jsonb_typeof(result)='object' AND octet_length(result::text)<=256000),
    created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
    CHECK((status='queued' AND finished_at IS NULL) OR (status<>'queued' AND finished_at IS NOT NULL)),
    CHECK(finished_at IS NULL OR finished_at>=created_at)
  )`,
  `CREATE INDEX coding_attempts_question_history ON coding_attempts(question_id,created_at DESC,id)`,
  `CREATE INDEX coding_attempts_recent ON coding_attempts(created_at DESC)`,
  `CREATE INDEX coding_attempts_running ON coding_attempts(created_at) WHERE status='queued'`,
];
const checksum = createHash("sha256").update(`${version}\n${statements.join(";\n")}`).digest("hex");
export async function applyCodingMigration(client: PoolClient) {
  const found = await client.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE version=$1", [version]);
  if (found.rows[0]) {
    if (found.rows[0].checksum !== checksum) throw new Error("Coding migration checksum mismatch.");
    return;
  }
  for (const statement of statements) await client.query(statement);
  await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [version,checksum]);
}
