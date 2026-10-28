import { applyCareerTypedMigration } from "./migrations/career-v2";
import { applyStorageGuardsMigration } from "./migrations/storage-v3";
import { applyCompanyResearchMigration } from "./migrations/company-research-v4";
import { applyCareerMigration } from "./migrations/career-v1";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { roles } from "@/data/prep";
import { algorithmQuestions } from "@/data/algorithms";
import { knowledgeEntries } from "@/data/knowledge";
import { targetCompanies, targetRoles, targetSources } from "@/data/targets";
import { extraTargetCompanies, extraTargetRoles } from "@/data/target-extra";
import { localTargetSources } from "@/data/target-local-sources";
import { primaryResearchSources } from "@/data/company-research-primary";
import { secondaryResearchSources } from "@/data/company-research-secondary";
import { otherResearchSources } from "@/data/company-research-other";
import { recruiterApplications, recruiterActivities, recruiterDocuments, sycamoreDocuments } from "@/data/recruiter-context";

const globalDb = globalThis as unknown as { deemsPool?: Pool; deemsInit?: Promise<void> };
export const pool = globalDb.deemsPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
globalDb.deemsPool = pool;
export const db = drizzle(pool, { schema });

async function initialize() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(728143)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS target_companies (id text PRIMARY KEY, data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS target_roles (id text PRIMARY KEY, company_id text NOT NULL REFERENCES target_companies(id), data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS target_role_states (role_id text PRIMARY KEY REFERENCES target_roles(id), data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS target_sources (id text PRIMARY KEY, company_id text NOT NULL REFERENCES target_companies(id), data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS target_progress (role_id text NOT NULL REFERENCES target_roles(id), item_id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (role_id,item_id));
      CREATE TABLE IF NOT EXISTS target_assessments (role_id text NOT NULL REFERENCES target_roles(id), requirement_id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (role_id,requirement_id));
      CREATE TABLE IF NOT EXISTS target_interviews (id text PRIMARY KEY, role_id text NOT NULL REFERENCES target_roles(id), company_id text NOT NULL REFERENCES target_companies(id), data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS target_debriefs (id text PRIMARY KEY, role_id text NOT NULL REFERENCES target_roles(id), interview_id text REFERENCES target_interviews(id), data jsonb NOT NULL);
      CREATE INDEX IF NOT EXISTS target_roles_company_idx ON target_roles(company_id);
      CREATE INDEX IF NOT EXISTS target_interviews_role_idx ON target_interviews(role_id);
      CREATE INDEX IF NOT EXISTS target_debriefs_role_idx ON target_debriefs(role_id);
      CREATE TABLE IF NOT EXISTS knowledge_bank (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS algorithm_bank (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS coaching (id text PRIMARY KEY, question_id text NOT NULL REFERENCES algorithm_bank(id), language text NOT NULL, mode text NOT NULL, message text NOT NULL, model text NOT NULL, answer jsonb NOT NULL, context jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS coaching_question_idx ON coaching(question_id, created_at);
      CREATE TABLE IF NOT EXISTS applications (id text PRIMARY KEY, role_id text NOT NULL, company text NOT NULL, title text NOT NULL, stage text NOT NULL, next_action text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS activities (id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id), kind text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS reviews (card_id text PRIMARY KEY, rating text NOT NULL, reviewed_at timestamptz NOT NULL, due_at timestamptz NOT NULL, fsrs jsonb);
      CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, exercise_id text NOT NULL, mode text NOT NULL, notes text NOT NULL, code text NOT NULL, elapsed integer NOT NULL, completed_at timestamptz NOT NULL, self_review text NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (key text PRIMARY KEY, value text NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);
      CREATE INDEX IF NOT EXISTS activities_application_idx ON activities(application_id, created_at);
      CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id), company text NOT NULL, title text NOT NULL, kind text NOT NULL, body text NOT NULL, source_url text NOT NULL DEFAULT '', source_date text NOT NULL DEFAULT '', captured_at timestamptz NOT NULL DEFAULT now(), tech_stack jsonb NOT NULL DEFAULT '[]', requirements jsonb NOT NULL DEFAULT '[]');
    `);
    for (const company of [...targetCompanies, ...extraTargetCompanies]) {
      await client.query("INSERT INTO target_companies (id,data) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [company.id, JSON.stringify(company)]);
    }
    for (const role of [...targetRoles, ...extraTargetRoles]) {
      await client.query("INSERT INTO target_roles (id,company_id,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING", [role.id, role.companyId, JSON.stringify(role)]);
      if (role.companyId !== "general") await client.query("INSERT INTO target_role_states (role_id,data) VALUES ($1,$2) ON CONFLICT (role_id) DO NOTHING", [role.id, JSON.stringify({ roleId: role.id, stage: "prospect", notes: "", updatedAt: new Date().toISOString() })]);
    }
    for (const source of [...targetSources, ...localTargetSources, ...primaryResearchSources, ...secondaryResearchSources, ...otherResearchSources]) {
      await client.query("INSERT INTO target_sources (id,company_id,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING", [source.id, source.companyId, JSON.stringify(source)]);
    }
    for (const question of algorithmQuestions) {
      await client.query("INSERT INTO algorithm_bank (id,data) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING",[question.id,JSON.stringify(question)]);
    }
    for (const entry of knowledgeEntries) {
      await client.query("INSERT INTO knowledge_bank (id,data) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING",[entry.id,JSON.stringify(entry)]);
    }
    for (const role of roles) {
      await client.query("INSERT INTO applications (id,role_id,company,title,stage,next_action) VALUES ($1,$2,'Sycamore',$3,'Interested','Confirm role and interview expectations') ON CONFLICT (id) DO NOTHING", [role.id, role.id, role.title]);
    }
    for (const item of recruiterApplications) {
      await client.query("INSERT INTO applications (id,role_id,company,title,stage,next_action,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",[item.id,item.roleId,item.company,item.title,item.stage,item.nextAction,item.notes]);
    }
    for (const item of recruiterActivities) {
      await client.query("INSERT INTO activities (id,application_id,kind,body,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",[item.id,item.applicationId,item.kind,item.body,item.createdAt]);
    }
    for (const item of [...recruiterDocuments,...sycamoreDocuments]) {
      await client.query("INSERT INTO documents (id,application_id,company,title,kind,body,source_url,source_date,captured_at,tech_stack,requirements) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING",[item.id,item.applicationId,item.company,item.title,item.kind,item.body,item.sourceUrl,item.sourceDate,item.capturedAt,JSON.stringify(item.techStack),JSON.stringify(item.requirements)]);
    }
    await applyCareerMigration(client);
    await applyCareerTypedMigration(client);
    await applyStorageGuardsMigration(client);
    await applyCompanyResearchMigration(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function ensureDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!globalDb.deemsInit) globalDb.deemsInit = initialize().catch(error => {globalDb.deemsInit=undefined; throw error;});
  await globalDb.deemsInit;
}
