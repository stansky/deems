import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

// Keep the original JSON snapshot for provenance. Current fields use typed columns.
const statements = [
  `ALTER TABLE career_candidacies
    ADD COLUMN stage varchar(40),
    ADD COLUMN company varchar(500),
    ADD COLUMN title varchar(500),
    ADD COLUMN pipeline_notes text,
    ADD COLUMN notes text,
    ADD COLUMN next_action varchar(500),
    ADD COLUMN submitted_at timestamptz,
    ADD COLUMN updated_at timestamptz,
    ADD COLUMN reconciliation jsonb`,
  `UPDATE career_candidacies SET
    stage=data->>'stage', company=data->>'company', title=data->>'title',
    pipeline_notes=data->>'pipelineNotes', notes=data->>'notes', next_action=data->>'nextAction',
    submitted_at=NULLIF(data->>'submittedAt','')::timestamptz,
    updated_at=NULLIF(data->>'updatedAt','')::timestamptz,
    reconciliation=coalesce(data->'reconciliation','[]'::jsonb)`,
  `ALTER TABLE career_candidacies
    ALTER COLUMN stage SET NOT NULL, ALTER COLUMN company SET NOT NULL,
    ALTER COLUMN title SET NOT NULL, ALTER COLUMN pipeline_notes SET NOT NULL,
    ALTER COLUMN notes SET NOT NULL, ALTER COLUMN next_action SET NOT NULL,
    ALTER COLUMN reconciliation SET NOT NULL,
    ADD CONSTRAINT career_candidacy_stage CHECK(stage IN ('Interested','Applied','Recruiter screen','Interviewing','Technical interview','In progress','Offer','Rejected','Withdrawn','Needs review')),
    ADD CONSTRAINT career_candidacy_id_length CHECK(char_length(id) BETWEEN 1 AND 244),
    ADD CONSTRAINT career_candidacy_notes_length CHECK(char_length(notes)<=100000 AND char_length(pipeline_notes)<=16000),
    ADD CONSTRAINT career_candidacy_identity CHECK(role_id IS NOT NULL OR application_id IS NOT NULL),
    ADD CONSTRAINT career_candidacy_snapshot_object CHECK(jsonb_typeof(data)='object'),
    ADD CONSTRAINT career_candidacy_reconciliation_array CHECK(jsonb_typeof(reconciliation)='array')`,
  `ALTER TABLE record_heads ADD CONSTRAINT record_heads_id_length CHECK(char_length(entity_id) BETWEEN 1 AND 244)`,
  `ALTER TABLE record_revisions
    ADD CONSTRAINT record_revision_order CHECK((revision=1 AND previous_revision IS NULL) OR (revision>1 AND previous_revision=revision-1)),
    ADD CONSTRAINT record_revision_producer_length CHECK(char_length(producer) BETWEEN 1 AND 100),
    ADD CONSTRAINT record_revision_reason_length CHECK(char_length(reason) BETWEEN 1 AND 100),
    ADD CONSTRAINT record_revision_head_fk FOREIGN KEY(entity_type,entity_id) REFERENCES record_heads(entity_type,entity_id) DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT record_revision_previous_fk FOREIGN KEY(entity_type,entity_id,previous_revision) REFERENCES record_revisions(entity_type,entity_id,revision) DEFERRABLE INITIALLY DEFERRED`,
  `ALTER TABLE record_heads ADD CONSTRAINT record_head_snapshot_fk FOREIGN KEY(entity_type,entity_id,revision) REFERENCES record_revisions(entity_type,entity_id,revision) DEFERRABLE INITIALLY DEFERRED`,
  `ALTER TABLE command_receipts
    ADD CONSTRAINT command_receipt_limits CHECK(char_length(producer) BETWEEN 1 AND 100 AND char_length(command) BETWEEN 1 AND 40 AND char_length(key) BETWEEN 1 AND 200),
    ADD CONSTRAINT command_receipt_hash CHECK(input_hash ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT command_receipt_result_object CHECK(jsonb_typeof(result)='object')`,
  `CREATE INDEX career_candidacies_current_stage_idx ON career_candidacies(stage,id) WHERE current`,
  `CREATE INDEX career_candidacies_role_history_idx ON career_candidacies(role_id,id)`,
  `CREATE INDEX career_candidacies_application_history_idx ON career_candidacies(application_id,id)`,
  `CREATE INDEX record_revisions_recorded_idx ON record_revisions(recorded_at,entity_type,entity_id,revision)`,
  `CREATE INDEX IF NOT EXISTS target_sources_company_idx ON target_sources(company_id)`,
  `CREATE INDEX IF NOT EXISTS target_interviews_company_idx ON target_interviews(company_id)`,
  `CREATE INDEX IF NOT EXISTS target_debriefs_interview_idx ON target_debriefs(interview_id)`,
  `CREATE INDEX IF NOT EXISTS documents_application_idx ON documents(application_id,captured_at DESC)`,
];
const version="career-v2-typed";
const checksum=createHash("sha256").update(statements.join(";\n")).digest("hex");
export async function applyCareerTypedMigration(client:PoolClient) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",["interview-desk-career-v1"]);
  const existing=await client.query<{checksum:string}>("SELECT checksum FROM schema_migrations WHERE version=$1",[version]);
  if(existing.rows.length){if(existing.rows[0].checksum!==checksum)throw new Error("Career typed migration checksum mismatch.");return;}
  for(const statement of statements)await client.query(statement);
  await client.query("INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",[version,checksum]);
}
