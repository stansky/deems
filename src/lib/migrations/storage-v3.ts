import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

const VERSION = "storage-v3";
const LOCK_NAME = "interview-desk-career-v1";

// NOT VALID defers row scans until explicit validation. The caller transaction holds locks through validation; violations fail without changing rows.
// Zod remains responsible for individual document-array item string lengths because PostgreSQL JSONPath has no supported string-length method.
const statements = [
  `ALTER TABLE target_companies
    ADD CONSTRAINT target_companies_id_contract CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_companies_data_object CHECK (jsonb_typeof(data)='object') NOT VALID,
    ADD CONSTRAINT target_companies_data_id CHECK (coalesce(jsonb_typeof(data->'id')='string' AND data->>'id'=id,false)) NOT VALID`,
  `ALTER TABLE target_roles
    ADD CONSTRAINT target_roles_id_contract CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_roles_data_object CHECK (jsonb_typeof(data)='object') NOT VALID,
    ADD CONSTRAINT target_roles_data_identity CHECK (coalesce(jsonb_typeof(data->'id')='string' AND jsonb_typeof(data->'companyId')='string' AND data->>'id'=id AND data->>'companyId'=company_id,false)) NOT VALID`,
  `ALTER TABLE target_sources
    ADD CONSTRAINT target_sources_id_contract CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_sources_data_object CHECK (jsonb_typeof(data)='object') NOT VALID,
    ADD CONSTRAINT target_sources_data_identity CHECK (coalesce(jsonb_typeof(data->'id')='string' AND jsonb_typeof(data->'companyId')='string' AND data->>'id'=id AND data->>'companyId'=company_id,false)) NOT VALID`,
  `ALTER TABLE algorithm_bank
    ADD CONSTRAINT algorithm_bank_data_identity CHECK (jsonb_typeof(data)='object' AND jsonb_typeof(data->'id')='string' AND coalesce(data->>'id'=id,false)) NOT VALID`,
  `ALTER TABLE knowledge_bank
    ADD CONSTRAINT knowledge_bank_data_identity CHECK (jsonb_typeof(data)='object' AND jsonb_typeof(data->'id')='string' AND coalesce(data->>'id'=id,false)) NOT VALID`,
  `ALTER TABLE algorithm_bank ADD CONSTRAINT algorithm_bank_id_contract CHECK (char_length(id) BETWEEN 1 AND 120) NOT VALID`,
  `ALTER TABLE knowledge_bank ADD CONSTRAINT knowledge_bank_id_contract CHECK (char_length(id) BETWEEN 1 AND 120) NOT VALID`,
  `ALTER TABLE coaching
    ADD CONSTRAINT coaching_field_contract CHECK (
      char_length(id) BETWEEN 1 AND 120 AND char_length(question_id) BETWEEN 1 AND 120 AND
      language IN ('python','javascript','go','php') AND mode IN ('rephrase','explain','hint') AND
      char_length(message)<=4000 AND jsonb_typeof(answer)='object' AND jsonb_typeof(context)='object') NOT VALID`,

  `ALTER TABLE applications
    ADD CONSTRAINT applications_field_limits CHECK (
      char_length(id) BETWEEN 1 AND 120 AND char_length(role_id) BETWEEN 1 AND 120 AND
      char_length(company) BETWEEN 1 AND 500 AND char_length(title) BETWEEN 1 AND 500 AND
      stage IN ('Interested','Applied','Recruiter screen','Interviewing','Technical interview','In progress','Offer','Rejected','Withdrawn','Needs review') AND
      char_length(next_action)<=500 AND char_length(notes)<=100000) NOT VALID`,
  `ALTER TABLE activities
    ADD CONSTRAINT activities_field_limits CHECK (
      char_length(id) BETWEEN 1 AND 120 AND char_length(application_id) BETWEEN 1 AND 120 AND
      char_length(kind)<=500 AND char_length(body) BETWEEN 1 AND 100000) NOT VALID`,
  `ALTER TABLE reviews
    ADD CONSTRAINT reviews_field_limits CHECK (
      char_length(card_id) BETWEEN 1 AND 120 AND rating IN ('again','good')) NOT VALID`,
  `ALTER TABLE sessions
    ADD CONSTRAINT sessions_field_limits CHECK (
      char_length(id) BETWEEN 1 AND 120 AND char_length(exercise_id) BETWEEN 1 AND 120 AND
      mode IN ('Coach','Mock') AND char_length(notes)<=100000 AND char_length(code)<=1000000 AND
      elapsed BETWEEN 0 AND 86400 AND char_length(self_review)<=100000) NOT VALID`,
  `ALTER TABLE notes
    ADD CONSTRAINT notes_field_limits CHECK (char_length(key) BETWEEN 1 AND 120 AND char_length(value)<=100000) NOT VALID`,
  `ALTER TABLE settings
    ADD CONSTRAINT settings_field_limits CHECK (char_length(key) BETWEEN 1 AND 120 AND char_length(value)<=100000) NOT VALID`,
  `ALTER TABLE documents
    ADD CONSTRAINT documents_field_limits CHECK (
      char_length(id) BETWEEN 1 AND 120 AND char_length(application_id) BETWEEN 1 AND 120 AND
      char_length(company) BETWEEN 1 AND 500 AND char_length(title) BETWEEN 1 AND 500 AND
      char_length(kind)<=500 AND char_length(body) BETWEEN 1 AND 100000 AND char_length(source_date)<=500 AND
      (source_url='' OR source_url ~* '^https?://[^[:space:]]+$') AND
      CASE WHEN jsonb_typeof(tech_stack)='array' THEN jsonb_array_length(tech_stack)<=80 AND
        NOT jsonb_path_exists(tech_stack,'$[*] ? (@.type() != "string")') ELSE false END AND
      CASE WHEN jsonb_typeof(requirements)='array' THEN jsonb_array_length(requirements)<=80 AND
        NOT jsonb_path_exists(requirements,'$[*] ? (@.type() != "string")') ELSE false END) NOT VALID`,

  `ALTER TABLE target_role_states
    ADD CONSTRAINT target_role_states_json_contract CHECK (coalesce((
      jsonb_typeof(data)='object' AND jsonb_typeof(data->'roleId')='string' AND coalesce(data->>'roleId'=role_id,false) AND
      coalesce(data->>'stage' IN ('prospect','active','offer','rejected','withdrawn','needs-review'),false) AND
      (NOT (data ? 'detailedStage') OR coalesce(data->>'detailedStage' IN ('Interested','Applied','Recruiter screen','Interviewing','Technical interview','In progress','Offer','Rejected','Withdrawn','Needs review'),false)) AND
      (NOT (data ? 'detailedStage') OR coalesce(
        CASE data->>'detailedStage'
          WHEN 'Interested' THEN data->>'stage'='prospect'
          WHEN 'Applied' THEN data->>'stage'='active'
          WHEN 'Recruiter screen' THEN data->>'stage'='active'
          WHEN 'Interviewing' THEN data->>'stage'='active'
          WHEN 'Technical interview' THEN data->>'stage'='active'
          WHEN 'In progress' THEN data->>'stage'='active'
          WHEN 'Offer' THEN data->>'stage'='offer'
          WHEN 'Rejected' THEN data->>'stage'='rejected'
          WHEN 'Withdrawn' THEN data->>'stage'='withdrawn'
          WHEN 'Needs review' THEN data->>'stage'='needs-review'
          ELSE false END,false)) AND
      jsonb_typeof(data->'notes')='string' AND char_length(data->>'notes')<=16000 AND
      jsonb_typeof(data->'updatedAt')='string'),false)) NOT VALID`,
  `ALTER TABLE target_progress
    ADD CONSTRAINT target_progress_id_contract CHECK (
      role_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND item_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_progress_json_contract CHECK (coalesce((
      jsonb_typeof(data)='object' AND jsonb_typeof(data->'roleId')='string' AND jsonb_typeof(data->'itemId')='string' AND coalesce(data->>'roleId'=role_id AND data->>'itemId'=item_id,false) AND
      coalesce(data->>'status' IN ('todo','working','done'),false) AND jsonb_typeof(data->'evidence')='string' AND
      char_length(data->>'evidence')<=16000 AND jsonb_typeof(data->'updatedAt')='string'),false)) NOT VALID`,
  `ALTER TABLE target_assessments
    ADD CONSTRAINT target_assessments_id_contract CHECK (
      role_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND requirement_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_assessments_json_contract CHECK (coalesce((
      jsonb_typeof(data)='object' AND jsonb_typeof(data->'roleId')='string' AND jsonb_typeof(data->'requirementId')='string' AND coalesce(data->>'roleId'=role_id AND data->>'requirementId'=requirement_id,false) AND
      coalesce(data->>'level' IN ('unassessed','strength','developing','gap'),false) AND jsonb_typeof(data->'evidence')='string' AND
      char_length(data->>'evidence')<=16000 AND jsonb_typeof(data->'updatedAt')='string'),false)) NOT VALID`,
  `ALTER TABLE target_interviews
    ADD CONSTRAINT target_interviews_id_contract CHECK (
      id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND role_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND company_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$') NOT VALID,
    ADD CONSTRAINT target_interviews_json_contract CHECK (coalesce((
      jsonb_typeof(data)='object' AND jsonb_typeof(data->'id')='string' AND jsonb_typeof(data->'roleId')='string' AND jsonb_typeof(data->'companyId')='string' AND
      coalesce(data->>'id'=id AND data->>'roleId'=role_id AND data->>'companyId'=company_id,false) AND
      jsonb_typeof(data->'title')='string' AND char_length(data->>'title') BETWEEN 1 AND 240 AND coalesce(data->>'status' IN ('target','scheduled','completed','cancelled'),false) AND
      jsonb_typeof(data->'format')='string' AND char_length(data->>'format')<=240 AND jsonb_typeof(data->'notes')='string' AND char_length(data->>'notes')<=16000 AND
      ((jsonb_typeof(data->'scheduledAt')='null') OR
       (jsonb_typeof(data->'scheduledAt')='string' AND coalesce(data->>'scheduledAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' AND pg_input_is_valid(data->>'scheduledAt','timestamptz'),false))) AND
      (data->>'status'<>'scheduled' OR jsonb_typeof(data->'scheduledAt')='string') AND
      jsonb_typeof(data->'updatedAt')='string'),false)) NOT VALID`,
  `ALTER TABLE target_debriefs
    ADD CONSTRAINT target_debriefs_id_contract CHECK (
      id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND role_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$' AND
      (interview_id IS NULL OR interview_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$')) NOT VALID,
    ADD CONSTRAINT target_debriefs_json_contract CHECK (coalesce((
      jsonb_typeof(data)='object' AND jsonb_typeof(data->'id')='string' AND jsonb_typeof(data->'roleId')='string' AND coalesce(data->>'id'=id AND data->>'roleId'=role_id,false) AND
      ((interview_id IS NULL AND data ? 'interviewId' AND data->'interviewId'='null'::jsonb) OR
       (interview_id IS NOT NULL AND coalesce(data->>'interviewId'=interview_id,false))) AND
      coalesce(data->>'outcome' IN ('pending','passed','rejected','practice'),false) AND
      jsonb_typeof(data->'occurredOn')='string' AND char_length(data->>'occurredOn')=10 AND
      coalesce(data->>'occurredOn' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND pg_input_is_valid(data->>'occurredOn','date'),false) AND
      jsonb_typeof(data->'prompt')='string' AND char_length(data->>'prompt')<=16000 AND
      jsonb_typeof(data->'worked')='string' AND char_length(data->>'worked')<=16000 AND
      jsonb_typeof(data->'struggled')='string' AND char_length(data->>'struggled')<=16000 AND
      jsonb_typeof(data->'feedback')='string' AND char_length(data->>'feedback')<=16000 AND
      jsonb_typeof(data->'nextAction')='string' AND char_length(data->>'nextAction')<=4000 AND jsonb_typeof(data->'requirementIds')='array' AND
      CASE WHEN jsonb_typeof(data->'requirementIds')='array' THEN jsonb_array_length(data->'requirementIds')<=30 AND
        NOT jsonb_path_exists(data->'requirementIds','$[*] ? (@.type() != "string")') ELSE false END AND
      jsonb_typeof(data->'createdAt')='string' AND jsonb_typeof(data->'resolvedAt') IN ('string','null')),false)) NOT VALID`,

  `CREATE UNIQUE INDEX target_roles_id_company_uq ON target_roles(id,company_id)`,
  `CREATE UNIQUE INDEX target_interviews_id_role_uq ON target_interviews(id,role_id)`,
  `ALTER TABLE target_interviews ADD CONSTRAINT target_interviews_role_company_fk
    FOREIGN KEY(role_id,company_id) REFERENCES target_roles(id,company_id) NOT VALID`,
  `ALTER TABLE target_debriefs ADD CONSTRAINT target_debriefs_interview_role_fk
    FOREIGN KEY(interview_id,role_id) REFERENCES target_interviews(id,role_id) NOT VALID`,
  `ALTER TABLE career_candidacies
    ADD CONSTRAINT career_candidacies_link_id_bounds CHECK (coalesce((
      (role_id IS NULL OR char_length(role_id) BETWEEN 1 AND 120) AND
      (application_id IS NULL OR char_length(application_id) BETWEEN 1 AND 120) AND
      char_length(company) BETWEEN 1 AND 500 AND char_length(title) BETWEEN 1 AND 500),false)) NOT VALID`,

  `ALTER TABLE target_companies VALIDATE CONSTRAINT target_companies_id_contract`,
  `ALTER TABLE target_companies VALIDATE CONSTRAINT target_companies_data_object`,
  `ALTER TABLE target_companies VALIDATE CONSTRAINT target_companies_data_id`,
  `ALTER TABLE target_roles VALIDATE CONSTRAINT target_roles_id_contract`,
  `ALTER TABLE target_roles VALIDATE CONSTRAINT target_roles_data_object`,
  `ALTER TABLE target_roles VALIDATE CONSTRAINT target_roles_data_identity`,
  `ALTER TABLE target_sources VALIDATE CONSTRAINT target_sources_id_contract`,
  `ALTER TABLE target_sources VALIDATE CONSTRAINT target_sources_data_object`,
  `ALTER TABLE target_sources VALIDATE CONSTRAINT target_sources_data_identity`,
  `ALTER TABLE algorithm_bank VALIDATE CONSTRAINT algorithm_bank_data_identity`,
  `ALTER TABLE knowledge_bank VALIDATE CONSTRAINT knowledge_bank_data_identity`,
  `ALTER TABLE algorithm_bank VALIDATE CONSTRAINT algorithm_bank_id_contract`,
  `ALTER TABLE knowledge_bank VALIDATE CONSTRAINT knowledge_bank_id_contract`,
  `ALTER TABLE coaching VALIDATE CONSTRAINT coaching_field_contract`,
  `ALTER TABLE applications VALIDATE CONSTRAINT applications_field_limits`,
  `ALTER TABLE activities VALIDATE CONSTRAINT activities_field_limits`,
  `ALTER TABLE reviews VALIDATE CONSTRAINT reviews_field_limits`,
  `ALTER TABLE sessions VALIDATE CONSTRAINT sessions_field_limits`,
  `ALTER TABLE notes VALIDATE CONSTRAINT notes_field_limits`,
  `ALTER TABLE settings VALIDATE CONSTRAINT settings_field_limits`,
  `ALTER TABLE documents VALIDATE CONSTRAINT documents_field_limits`,
  `ALTER TABLE target_role_states VALIDATE CONSTRAINT target_role_states_json_contract`,
  `ALTER TABLE target_progress VALIDATE CONSTRAINT target_progress_id_contract`,
  `ALTER TABLE target_progress VALIDATE CONSTRAINT target_progress_json_contract`,
  `ALTER TABLE target_assessments VALIDATE CONSTRAINT target_assessments_id_contract`,
  `ALTER TABLE target_assessments VALIDATE CONSTRAINT target_assessments_json_contract`,
  `ALTER TABLE target_interviews VALIDATE CONSTRAINT target_interviews_id_contract`,
  `ALTER TABLE target_interviews VALIDATE CONSTRAINT target_interviews_json_contract`,
  `ALTER TABLE target_debriefs VALIDATE CONSTRAINT target_debriefs_id_contract`,
  `ALTER TABLE target_debriefs VALIDATE CONSTRAINT target_debriefs_json_contract`,
  `ALTER TABLE career_candidacies VALIDATE CONSTRAINT career_candidacies_link_id_bounds`,
  `ALTER TABLE target_interviews VALIDATE CONSTRAINT target_interviews_role_company_fk`,
  `ALTER TABLE target_debriefs VALIDATE CONSTRAINT target_debriefs_interview_role_fk`,
] as const;

const checksum = createHash("sha256").update(`${VERSION}\n${statements.join(";\n")}`).digest("hex");

export async function applyStorageGuardsMigration(client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [LOCK_NAME]);
  const existing = await client.query<{ checksum: string }>("SELECT checksum FROM schema_migrations WHERE version=$1", [VERSION]);
  if (existing.rows.length) {
    if (existing.rows[0].checksum !== checksum) throw new Error("Storage guards migration checksum mismatch.");
    return;
  }
  for (const statement of statements) await client.query(statement);
  await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)", [VERSION, checksum]);
}
