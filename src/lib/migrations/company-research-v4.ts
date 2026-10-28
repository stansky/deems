import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const VERSION = "company-research-v4";
const LOCK = "interview-desk-career-v1";
const statements = [
  `CREATE TABLE company_research_profiles (
    company_id text PRIMARY KEY REFERENCES target_companies(id) ON DELETE CASCADE,
    website_host text NOT NULL, careers_host text NOT NULL, linkedin_host text,
    website_url text NOT NULL, careers_url text NOT NULL, linkedin_url text,
    focus jsonb NOT NULL, overview varchar(2000) NOT NULL DEFAULT '', pitch varchar(1000) NOT NULL DEFAULT '', description_source_url text,
    data jsonb NOT NULL, updated_at timestamptz NOT NULL,
    CHECK (char_length(website_host) BETWEEN 1 AND 253),
    CHECK (char_length(careers_host) BETWEEN 1 AND 253),
    CHECK (linkedin_host IS NULL OR char_length(linkedin_host) BETWEEN 1 AND 253),
    CHECK (company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
    CHECK (website_url ~ '^https://[^[:space:]]+$' AND char_length(website_url)<=2048),
    CHECK (careers_url ~ '^https://[^[:space:]]+$' AND char_length(careers_url)<=2048),
    CHECK (linkedin_url IS NULL OR (linkedin_url ~ '^https://[^[:space:]]+$' AND char_length(linkedin_url)<=2048)),
    CHECK (description_source_url IS NULL OR (description_source_url ~ '^https://[^[:space:]]+$' AND char_length(description_source_url)<=2048)),
    CHECK (CASE WHEN jsonb_typeof(focus)='array' THEN jsonb_array_length(focus) BETWEEN 1 AND 6 AND focus <@ '["AI engineering","Full-stack","Forward deployed","Backend","Frontend","Management"]'::jsonb AND NOT jsonb_path_exists(focus,'$[*] ? (@.type() != "string")') ELSE false END),
    CHECK (jsonb_typeof(data)='object' AND octet_length(data::text)<=10000 AND data->>'companyId'=company_id AND data->>'websiteUrl'=website_url AND data->>'careersUrl'=careers_url AND data->>'linkedinUrl' IS NOT DISTINCT FROM linkedin_url AND data->>'descriptionSourceUrl' IS NOT DISTINCT FROM description_source_url AND data->>'overview'=overview AND data->>'pitch'=pitch AND data->'focus'=focus AND jsonb_typeof(data->'updatedAt')='string' AND pg_input_is_valid(data->>'updatedAt','timestamptz') AND (data->>'updatedAt')::timestamptz=updated_at),
    CHECK (char_length(overview)<=2000 AND char_length(pitch)<=1000),
    CONSTRAINT company_research_profiles_website_host_uq UNIQUE(website_host))`,
  `CREATE TABLE company_research_runs (
    id text PRIMARY KEY, company_id text NOT NULL REFERENCES target_companies(id) ON DELETE CASCADE,
    status text NOT NULL CHECK(status IN ('queued','running','complete','partial','failed')),
    requested_at timestamptz NOT NULL, started_at timestamptz, finished_at timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
    lease_token text, lease_until timestamptz, error text NOT NULL DEFAULT '',
    CHECK(id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
    CHECK(char_length(error)<=2000), CHECK((status='running' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR (status<>'running' AND lease_token IS NULL AND lease_until IS NULL)),
    CONSTRAINT company_research_runs_id_company_uq UNIQUE(id,company_id))`,
  `CREATE UNIQUE INDEX company_research_one_active_run ON company_research_runs(company_id) WHERE status IN ('queued','running')`,
  `CREATE INDEX company_research_runs_recent ON company_research_runs(company_id,requested_at DESC)`,
  `CREATE TABLE company_research_sources (
    id text PRIMARY KEY, run_id text NOT NULL,
    company_id text NOT NULL REFERENCES target_companies(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK(kind IN ('website','careers','linkedin','job')),
    url text NOT NULL, final_url text, title text NOT NULL DEFAULT '', status text NOT NULL CHECK(status IN ('fetched','blocked','failed','cached')),
    detail text NOT NULL DEFAULT '', captured_at timestamptz NOT NULL, content_hash text NOT NULL DEFAULT '', excerpt text NOT NULL DEFAULT '', capture jsonb NOT NULL DEFAULT '{}',
    CHECK(id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND run_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
    CHECK(url ~ '^https://[^[:space:]]+$' AND char_length(url)<=2048 AND (final_url IS NULL OR (final_url ~ '^https://[^[:space:]]+$' AND char_length(final_url)<=2048))),
    CHECK(char_length(title)<=500 AND char_length(detail)<=2000 AND (content_hash='' OR content_hash ~ '^[0-9a-f]{64}$') AND char_length(excerpt)<=80000 AND octet_length(capture::text)<=100000 AND jsonb_typeof(capture)='object'),
    CONSTRAINT company_research_sources_id_run_company_uq UNIQUE(id,run_id,company_id),
    CONSTRAINT company_research_sources_run_company_fk FOREIGN KEY(run_id,company_id) REFERENCES company_research_runs(id,company_id) ON DELETE CASCADE)`,
  `CREATE INDEX company_research_sources_cache ON company_research_sources(url,captured_at DESC) WHERE status IN ('fetched','cached')`,
  `CREATE INDEX company_research_sources_run ON company_research_sources(run_id,captured_at)`,
  `CREATE TABLE company_research_suggestions (
    id text PRIMARY KEY, run_id text NOT NULL,
    company_id text NOT NULL REFERENCES target_companies(id) ON DELETE CASCADE,
    source_id text NOT NULL, title text NOT NULL,
    url text NOT NULL, location text NOT NULL DEFAULT '', excerpt text NOT NULL DEFAULT '',
    reasons jsonb NOT NULL DEFAULT '[]', checks jsonb NOT NULL,
    status text NOT NULL CHECK(status IN ('suggested','accepted','dismissed')),
    role_id text REFERENCES target_roles(id), created_at timestamptz NOT NULL,
    CHECK(id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND run_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND source_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND (role_id IS NULL OR role_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$')),
    CHECK(char_length(title) BETWEEN 1 AND 240 AND url ~ '^https://[^[:space:]]+$' AND char_length(url)<=2048 AND char_length(location)<=300 AND char_length(excerpt)<=4000),
    CHECK(jsonb_typeof(reasons)='array' AND jsonb_typeof(checks)='object'),
    CHECK(CASE WHEN jsonb_typeof(reasons)='array' THEN jsonb_array_length(reasons)<=12 AND octet_length(reasons::text)<=12000 ELSE false END AND octet_length(checks::text)<=1000 AND jsonb_typeof(checks->'officialSource')='boolean' AND jsonb_typeof(checks->'detailFetched')='boolean' AND jsonb_typeof(checks->'duplicateRole')='boolean' AND jsonb_typeof(checks->'activePosting')='string' AND checks->>'activePosting' IN ('verified','unverified','closed')),
    CHECK((status='accepted')=(role_id IS NOT NULL)),
    CONSTRAINT company_research_suggestions_run_company_fk FOREIGN KEY(run_id,company_id) REFERENCES company_research_runs(id,company_id) ON DELETE CASCADE,
    CONSTRAINT company_research_suggestions_source_run_company_fk FOREIGN KEY(source_id,run_id,company_id) REFERENCES company_research_sources(id,run_id,company_id) ON DELETE CASCADE,
    CONSTRAINT company_research_suggestions_role_company_fk FOREIGN KEY(role_id,company_id) REFERENCES target_roles(id,company_id))`,
  `CREATE INDEX company_research_suggestions_company ON company_research_suggestions(company_id,created_at DESC)`,
  `CREATE TABLE company_research_command_receipts (
    action text NOT NULL, key text NOT NULL, input_hash text NOT NULL, result jsonb NOT NULL, recorded_at timestamptz NOT NULL,
    PRIMARY KEY(action,key), CHECK(char_length(action) BETWEEN 1 AND 40 AND key ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'),
    CHECK(input_hash ~ '^[0-9a-f]{64}$' AND jsonb_typeof(result)='object'))`,
] as const;
const checksum = createHash("sha256").update(`${VERSION}\n${statements.join(";\n")}`).digest("hex");

export async function applyCompanyResearchMigration(client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [LOCK]);
  const found = await client.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE version=$1", [VERSION]);
  if (found.rows[0]) {
    if (found.rows[0].checksum !== checksum) throw new Error("Company research migration checksum mismatch.");
    return;
  }
  for (const statement of statements) await client.query(statement);
  await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [VERSION, checksum]);
}
