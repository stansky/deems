import { pgTable, text, varchar, timestamp, jsonb, integer, primaryKey, uniqueIndex, index, foreignKey } from "drizzle-orm/pg-core";
import { desc, sql } from "drizzle-orm";
import type { TargetCompany, TargetRole, TargetSource, TargetProgress, TargetRoleState, TargetAssessment, TargetInterview, TargetDebrief } from "./target-types";
import type { AlgorithmQuestion } from "@/data/algorithms";
import type { KnowledgeEntry } from "@/data/knowledge";
import type { ResearchProfile, ResearchRun, ResearchSource, RoleSuggestion } from "@/contracts/company-research";
export const targetCompanies = pgTable("target_companies", { id: text("id").primaryKey(), data: jsonb("data").$type<TargetCompany>().notNull() });
export const targetRoles = pgTable("target_roles", { id: text("id").primaryKey(), companyId: text("company_id").notNull().references(() => targetCompanies.id), data: jsonb("data").$type<TargetRole>().notNull() });
export const targetRoleStates = pgTable("target_role_states", { roleId: text("role_id").primaryKey().references(() => targetRoles.id), data: jsonb("data").$type<TargetRoleState>().notNull() });
export const targetSources = pgTable("target_sources", { id: text("id").primaryKey(), companyId: text("company_id").notNull().references(() => targetCompanies.id), data: jsonb("data").$type<TargetSource>().notNull() });
export const targetProgress = pgTable("target_progress", { roleId: text("role_id").notNull().references(() => targetRoles.id), itemId: text("item_id").notNull(), data: jsonb("data").$type<TargetProgress>().notNull() }, table => [primaryKey({ columns: [table.roleId, table.itemId] })]);
export const targetAssessments = pgTable("target_assessments", { roleId: text("role_id").notNull().references(() => targetRoles.id), requirementId: text("requirement_id").notNull(), data: jsonb("data").$type<TargetAssessment>().notNull() }, table => [primaryKey({ columns: [table.roleId, table.requirementId] })]);
export const targetInterviews = pgTable("target_interviews", { id: text("id").primaryKey(), roleId: text("role_id").notNull().references(() => targetRoles.id), companyId: text("company_id").notNull().references(() => targetCompanies.id), data: jsonb("data").$type<TargetInterview>().notNull() });
export const targetDebriefs = pgTable("target_debriefs", { id: text("id").primaryKey(), roleId: text("role_id").notNull().references(() => targetRoles.id), interviewId: text("interview_id").references(() => targetInterviews.id), data: jsonb("data").$type<TargetDebrief>().notNull() });
export const knowledgeBank = pgTable("knowledge_bank", { id:text("id").primaryKey(), data:jsonb("data").$type<KnowledgeEntry>().notNull(), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow() });
export const algorithmBank = pgTable("algorithm_bank", { id:text("id").primaryKey(), data:jsonb("data").$type<AlgorithmQuestion>().notNull(), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow() });
export const coaching = pgTable("coaching", { id:text("id").primaryKey(), questionId:text("question_id").notNull().references(()=>algorithmBank.id), language:text("language").notNull(), mode:text("mode").notNull(), message:text("message").notNull(), model:text("model").notNull(), answer:jsonb("answer").notNull(), context:jsonb("context").notNull(), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow() });
export const applications = pgTable("applications", { id: text("id").primaryKey(), roleId: text("role_id").notNull(), company: text("company").notNull(), title: text("title").notNull(), stage: text("stage").notNull(), nextAction: text("next_action").notNull().default(""), notes: text("notes").notNull().default(""), updatedAt: timestamp("updated_at", {withTimezone:true}).notNull().defaultNow() });
export const activities = pgTable("activities", { id:text("id").primaryKey(), applicationId:text("application_id").notNull().references(()=>applications.id), kind:text("kind").notNull(), body:text("body").notNull(), createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow() });
export const reviews = pgTable("reviews", { cardId:text("card_id").primaryKey(), rating:text("rating").notNull(), reviewedAt:timestamp("reviewed_at",{withTimezone:true}).notNull(), dueAt:timestamp("due_at",{withTimezone:true}).notNull(), fsrs:jsonb("fsrs") });
export const sessions = pgTable("sessions", { id:text("id").primaryKey(), exerciseId:text("exercise_id").notNull(), mode:text("mode").notNull(), notes:text("notes").notNull(), code:text("code").notNull(), elapsed:integer("elapsed").notNull(), completedAt:timestamp("completed_at",{withTimezone:true}).notNull(), selfReview:text("self_review").notNull() });
export const notes = pgTable("notes", { key:text("key").primaryKey(), value:text("value").notNull() });
export const settings = pgTable("settings", { key:text("key").primaryKey(), value:text("value").notNull() });
export const documents = pgTable("documents", { id:text("id").primaryKey(), applicationId:text("application_id").notNull().references(()=>applications.id), company:text("company").notNull(), title:text("title").notNull(), kind:text("kind").notNull(), body:text("body").notNull(), sourceUrl:text("source_url").notNull().default(""), sourceDate:text("source_date").notNull().default(""), capturedAt:timestamp("captured_at",{withTimezone:true}).notNull().defaultNow(), techStack:jsonb("tech_stack").$type<string[]>().notNull().default([]), requirements:jsonb("requirements").$type<string[]>().notNull().default([]) });

// These Drizzle declarations describe company-research-v4. The versioned SQL migration remains authoritative.
export const companyResearchProfiles = pgTable("company_research_profiles", {
  companyId:text("company_id").primaryKey().references(()=>targetCompanies.id,{onDelete:"cascade"}),
  websiteHost:text("website_host").notNull(),careersHost:text("careers_host").notNull(),linkedinHost:text("linkedin_host"),
  websiteUrl:text("website_url").notNull(),careersUrl:text("careers_url").notNull(),linkedinUrl:text("linkedin_url"),
  focus:jsonb("focus").$type<ResearchProfile["focus"]>().notNull(),overview:varchar("overview",{length:2000}).notNull().default(""),pitch:varchar("pitch",{length:1000}).notNull().default(""),descriptionSourceUrl:text("description_source_url"),
  data:jsonb("data").$type<ResearchProfile>().notNull(),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull(),
},table=>[uniqueIndex("company_research_profiles_website_host_uq").on(table.websiteHost)]);
export const companyResearchRuns = pgTable("company_research_runs", {
  id:text("id").primaryKey(),companyId:text("company_id").notNull().references(()=>targetCompanies.id,{onDelete:"cascade"}),status:text("status").$type<ResearchRun["status"]>().notNull(),
  requestedAt:timestamp("requested_at",{withTimezone:true}).notNull(),startedAt:timestamp("started_at",{withTimezone:true}),finishedAt:timestamp("finished_at",{withTimezone:true}),
  attempts:integer("attempts").notNull().default(0),leaseToken:text("lease_token"),leaseUntil:timestamp("lease_until",{withTimezone:true}),error:text("error").notNull().default(""),
},table=>[
  uniqueIndex("company_research_runs_id_company_uq").on(table.id,table.companyId),
  uniqueIndex("company_research_one_active_run").on(table.companyId).where(sql`${table.status} IN ('queued','running')`),
  index("company_research_runs_recent").on(table.companyId,desc(table.requestedAt)),
]);
export const companyResearchSources = pgTable("company_research_sources", {
  id:text("id").primaryKey(),runId:text("run_id").notNull(),companyId:text("company_id").notNull().references(()=>targetCompanies.id,{onDelete:"cascade"}),
  kind:text("kind").$type<ResearchSource["kind"]>().notNull(),url:text("url").notNull(),finalUrl:text("final_url"),title:text("title").notNull().default(""),status:text("status").$type<ResearchSource["status"]>().notNull(),
  detail:text("detail").notNull().default(""),capturedAt:timestamp("captured_at",{withTimezone:true}).notNull(),contentHash:text("content_hash").notNull().default(""),excerpt:text("excerpt").notNull().default(""),capture:jsonb("capture").$type<Record<string,unknown>>().notNull().default({}),
},table=>[
  uniqueIndex("company_research_sources_id_run_company_uq").on(table.id,table.runId,table.companyId),
  index("company_research_sources_cache").on(table.url,desc(table.capturedAt)).where(sql`${table.status} IN ('fetched','cached')`),index("company_research_sources_run").on(table.runId,table.capturedAt),
  foreignKey({name:"company_research_sources_run_company_fk",columns:[table.runId,table.companyId],foreignColumns:[companyResearchRuns.id,companyResearchRuns.companyId]}).onDelete("cascade"),
]);
export const companyResearchSuggestions = pgTable("company_research_suggestions", {
  id:text("id").primaryKey(),runId:text("run_id").notNull(),companyId:text("company_id").notNull().references(()=>targetCompanies.id,{onDelete:"cascade"}),sourceId:text("source_id").notNull(),title:text("title").notNull(),url:text("url").notNull(),location:text("location").notNull().default(""),excerpt:text("excerpt").notNull().default(""),
  reasons:jsonb("reasons").$type<string[]>().notNull().default([]),checks:jsonb("checks").$type<RoleSuggestion["checks"]>().notNull(),status:text("status").$type<RoleSuggestion["status"]>().notNull(),roleId:text("role_id").references(()=>targetRoles.id),createdAt:timestamp("created_at",{withTimezone:true}).notNull(),
},table=>[
  index("company_research_suggestions_company").on(table.companyId,table.createdAt),
  foreignKey({name:"company_research_suggestions_run_company_fk",columns:[table.runId,table.companyId],foreignColumns:[companyResearchRuns.id,companyResearchRuns.companyId]}).onDelete("cascade"),
  foreignKey({name:"company_research_suggestions_source_run_company_fk",columns:[table.sourceId,table.runId,table.companyId],foreignColumns:[companyResearchSources.id,companyResearchSources.runId,companyResearchSources.companyId]}).onDelete("cascade"),
  foreignKey({name:"company_research_suggestions_role_company_fk",columns:[table.roleId,table.companyId],foreignColumns:[targetRoles.id,targetRoles.companyId]}),
]);
export const companyResearchCommandReceipts = pgTable("company_research_command_receipts", {
  action:text("action").notNull(),key:text("key").notNull(),inputHash:text("input_hash").notNull(),result:jsonb("result").notNull(),recordedAt:timestamp("recorded_at",{withTimezone:true}).notNull(),
},table=>[primaryKey({columns:[table.action,table.key]})]);
