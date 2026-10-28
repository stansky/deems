import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { ensureDb, pool } from "@/lib/db";
import { resolvePublic } from "./public-network";
import { researchCommandSchema, researchProfileSchema, researchRunSchema, researchSourceSchema, roleSuggestionSchema, researchStateSchema } from "@/contracts/company-research";
import type { ResearchCommand, ResearchProfile, ResearchRun, ResearchSource, ResearchState, RoleSuggestion } from "@/contracts/company-research";

export class CompanyResearchError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); this.name = "CompanyResearchError"; }
}
const fail = (message:string,status=400,code="invalid_input"):never=>{throw new CompanyResearchError(message,status,code)};
type Db = Pool | PoolClient;
type Row = Record<string, any>;
const now = () => new Date().toISOString();
const json = (v:any):any => typeof v === "string" ? JSON.parse(v) : v;
const digest = (v:unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const cleanHost = (url:string) => new URL(url).hostname.toLowerCase().replace(/^www\./,"");

async function assertPublicUrl(value:string):Promise<URL> {
  let u:URL;
  try { u=new URL(value); } catch { return fail("Use a valid public HTTPS URL."); }
  if (u.protocol!=="https:" || u.username || u.password || (u.port && u.port!=="443")) fail("Use a public HTTPS URL without credentials or a custom port.");
  const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
  if (host==="localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host.endsWith(".invalid")) fail("Private and local hosts cannot be researched.");
  try {
    await resolvePublic(host);
  } catch(error) { if(error instanceof CompanyResearchError)throw error; fail("The URL host could not be verified as public."); }
  return u;
}
function boundedId(prefix:string, seed:string):string { return `${prefix}-${createHash("sha256").update(seed).digest("hex").slice(0,32)}`; }
function canonicalHost(url:string):string { return cleanHost(url); }
function assertValidProfile(p:ResearchProfile):ResearchProfile { return researchProfileSchema.parse(p); }

async function readState(db:Db):Promise<ResearchState> {
  // GET is a recent research window, not an unbounded archive response. Every run remains durable in PostgreSQL.
  const [profiles,runs,sources,suggestions]=await Promise.all([
    db.query<{data:any}>("SELECT data FROM company_research_profiles ORDER BY company_id"),
    db.query<Row>("SELECT id,company_id,status,requested_at,started_at,finished_at,attempts,error FROM company_research_runs ORDER BY requested_at DESC,id LIMIT 100"),
    db.query<Row>("SELECT id,run_id,company_id,kind,url,final_url,title,status,detail,captured_at,content_hash,excerpt FROM company_research_sources WHERE run_id IN (SELECT id FROM company_research_runs ORDER BY requested_at DESC,id LIMIT 100) ORDER BY captured_at DESC,id LIMIT 100"),
    db.query<Row>("SELECT id,run_id,company_id,source_id,title,url,location,excerpt,reasons,checks,status,role_id FROM company_research_suggestions WHERE run_id IN (SELECT id FROM company_research_runs ORDER BY requested_at DESC,id LIMIT 100) ORDER BY created_at DESC,id LIMIT 100"),
  ]);
  return researchStateSchema.parse({
    profiles:profiles.rows.map(r=>json(r.data)),
    runs:runs.rows.map(r=>({id:r.id,companyId:r.company_id,status:r.status,requestedAt:new Date(r.requested_at).toISOString(),startedAt:r.started_at?new Date(r.started_at).toISOString():null,finishedAt:r.finished_at?new Date(r.finished_at).toISOString():null,attempts:r.attempts,error:r.error})),
    sources:sources.rows.map(r=>({id:r.id,runId:r.run_id,companyId:r.company_id,kind:r.kind,url:r.url,finalUrl:r.final_url,title:r.title,status:r.status,detail:r.detail,capturedAt:new Date(r.captured_at).toISOString(),contentHash:r.content_hash,excerpt:String(r.excerpt).slice(0,12000)})),
    suggestions:suggestions.rows.map(r=>({id:r.id,runId:r.run_id,companyId:r.company_id,sourceId:r.source_id,title:r.title,url:r.url,location:r.location,excerpt:r.excerpt,reasons:json(r.reasons),checks:json(r.checks),status:r.status,roleId:r.role_id})),
  });
}
export async function getResearchState():Promise<ResearchState> { await ensureDb(); return readState(pool); }

async function receipt<T>(client:PoolClient, action:string,key:string,input:unknown,fn:()=>Promise<T>):Promise<T> {
  const inputHash=digest(input);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`research-command:${action}:${key}`]);
  const old=await client.query<{input_hash:string;result:any}>("SELECT input_hash,result FROM company_research_command_receipts WHERE action=$1 AND key=$2 FOR UPDATE",[action,key]);
  if(old.rows[0]) {
    if(old.rows[0].input_hash!==inputHash) fail("This retry key was already used for a different command.",409,"idempotency_conflict");
    return json(old.rows[0].result) as T;
  }
  const result=await fn();
  await client.query("INSERT INTO company_research_command_receipts(action,key,input_hash,result,recorded_at) VALUES($1,$2,$3,$4,$5)",[action,key,inputHash,JSON.stringify(result),now()]);
  return result;
}
async function enqueue(client:PoolClient,companyId:string):Promise<string> {
  const active=await client.query<{id:string}>("SELECT id FROM company_research_runs WHERE company_id=$1 AND status IN ('queued','running') FOR UPDATE",[companyId]);
  if(active.rows[0]) return active.rows[0].id;
  const id=randomUUID();
  await client.query("INSERT INTO company_research_runs(id,company_id,status,requested_at) VALUES($1,$2,'queued',$3)",[id,companyId,now()]);
  return id;
}
async function createCompany(client:PoolClient,data:Extract<ResearchCommand,{action:"createCompany"}>["data"]):Promise<string> {
  await assertPublicUrl(data.websiteUrl); await assertPublicUrl(data.careersUrl); if(data.linkedinUrl)await assertPublicUrl(data.linkedinUrl);
  const websiteHost=canonicalHost(data.websiteUrl);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`research-company-name:${data.name.toLowerCase()}`]);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`research-company-host:${websiteHost}`]);
  const names=await client.query<{id:string}>("SELECT id FROM target_companies WHERE lower(data->>'name')=lower($1)",[data.name]);
  const hosts=await client.query<{company_id:string}>("SELECT company_id FROM company_research_profiles WHERE website_host=$1",[websiteHost]);
  if(names.rows.length || hosts.rows.length) {
    fail("A company with this name or website already exists. Open that company to update its research profile.",409,"company_duplicate");
  }
  const slug=data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"company";
  const companyId=boundedId(slug,`${slug}|${websiteHost}`);
  const company={id:companyId,name:data.name,summary:"",careersUrl:data.careersUrl,researchStatus:"To research",focus:""};
  const profile:ResearchProfile=assertValidProfile({companyId,websiteUrl:data.websiteUrl,careersUrl:data.careersUrl,linkedinUrl:data.linkedinUrl,focus:data.focus,overview:"",pitch:"",descriptionSourceUrl:null,updatedAt:now()});
  await client.query("INSERT INTO target_companies(id,data) VALUES($1,$2)",[companyId,JSON.stringify(company)]);
  await client.query("INSERT INTO company_research_profiles(company_id,website_host,careers_host,linkedin_host,website_url,careers_url,linkedin_url,focus,overview,pitch,description_source_url,data,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",[companyId,websiteHost,canonicalHost(data.careersUrl),data.linkedinUrl?canonicalHost(data.linkedinUrl):null,profile.websiteUrl,profile.careersUrl,profile.linkedinUrl,JSON.stringify(profile.focus),profile.overview,profile.pitch,profile.descriptionSourceUrl,JSON.stringify(profile),profile.updatedAt]);
  return enqueue(client,companyId);
}
async function researchCompany(client:PoolClient,data:Extract<ResearchCommand,{action:"researchCompany"}>["data"]):Promise<string> {
  await assertPublicUrl(data.websiteUrl); await assertPublicUrl(data.careersUrl); if(data.linkedinUrl)await assertPublicUrl(data.linkedinUrl);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`research-company-host:${canonicalHost(data.websiteUrl)}`]);
  const company=await client.query<{data:any}>("SELECT data FROM target_companies WHERE id=$1 FOR UPDATE",[data.companyId]);
  if(!company.rows[0])fail("This company was not found.",404,"not_found");
  const profile:ResearchProfile=assertValidProfile({companyId:data.companyId,websiteUrl:data.websiteUrl,careersUrl:data.careersUrl,linkedinUrl:data.linkedinUrl,focus:data.focus,overview:"",pitch:"",descriptionSourceUrl:null,updatedAt:now()});
  const existing=await client.query<{data:any}>("SELECT data FROM company_research_profiles WHERE company_id=$1 FOR UPDATE",[data.companyId]);
  if(existing.rows[0]) { const old=json(existing.rows[0].data); profile.overview=old.overview;profile.pitch=old.pitch;profile.descriptionSourceUrl=old.descriptionSourceUrl; }
  await client.query("INSERT INTO company_research_profiles(company_id,website_host,careers_host,linkedin_host,website_url,careers_url,linkedin_url,focus,overview,pitch,description_source_url,data,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(company_id) DO UPDATE SET website_host=EXCLUDED.website_host,careers_host=EXCLUDED.careers_host,linkedin_host=EXCLUDED.linkedin_host,website_url=EXCLUDED.website_url,careers_url=EXCLUDED.careers_url,linkedin_url=EXCLUDED.linkedin_url,focus=EXCLUDED.focus,overview=EXCLUDED.overview,pitch=EXCLUDED.pitch,description_source_url=EXCLUDED.description_source_url,data=EXCLUDED.data,updated_at=EXCLUDED.updated_at",[data.companyId,canonicalHost(data.websiteUrl),canonicalHost(data.careersUrl),data.linkedinUrl?canonicalHost(data.linkedinUrl):null,profile.websiteUrl,profile.careersUrl,profile.linkedinUrl,JSON.stringify(profile.focus),profile.overview,profile.pitch,profile.descriptionSourceUrl,JSON.stringify(profile),profile.updatedAt]);
  const companyData=json(company.rows[0].data);companyData.careersUrl=data.careersUrl;companyData.researchStatus="To research";
  await client.query("UPDATE target_companies SET data=$2 WHERE id=$1",[data.companyId,JSON.stringify(companyData)]);
  return enqueue(client,data.companyId);
}
function officialRoleHost(host:string,profile:ResearchProfile):boolean {
  const h=host.toLowerCase().replace(/^www\./,"");
  const root=canonicalHost(profile.careersUrl);
  const known=new Set(["boards.greenhouse.io","job-boards.greenhouse.io","jobs.ashbyhq.com","jobs.lever.co","careers.smartrecruiters.com","myworkdayjobs.com","wd1.myworkdaysite.com","wd3.myworkdaysite.com","wd5.myworkdaysite.com","jobs.jobvite.com","careers.icims.com"]);
  return h===root || h.endsWith(`.${root}`) || h===canonicalHost(profile.websiteUrl) || h.endsWith(`.${canonicalHost(profile.websiteUrl)}`) || [...known].some(base=>h===base||h.endsWith(`.${base}`));
}
async function createAcceptedRole(client:PoolClient,s:RoleSuggestion,profile:ResearchProfile,companyName:string):Promise<string> {
  const source=await client.query<Row>("SELECT kind,status,excerpt,url,final_url FROM company_research_sources WHERE id=$1 AND run_id=$2 AND company_id=$3 FOR SHARE",[s.sourceId,s.runId,s.companyId]);
  if(!source.rows[0] || !["fetched","cached"].includes(source.rows[0].status) || !String(source.rows[0].excerpt).trim()) fail("The job detail source is not available for review.",409,"source_unavailable");
  if(s.url!==source.rows[0].url && s.url!==source.rows[0].final_url)fail("The suggested posting URL must match its captured job source.",409,"source_url_mismatch");
  if(!s.checks.officialSource || !officialRoleHost(cleanHost(s.url),profile))fail("Accept only a job posting linked to an official employer or careers source.",409,"not_official");
  if(!s.checks.detailFetched)fail("The full job detail must be fetched before accepting it.",409,"detail_not_fetched");
  if(s.checks.activePosting==="closed")fail("This posting is marked closed. Refresh research before accepting it.",409,"posting_closed");
  if(s.checks.duplicateRole)fail("This suggestion is already marked as a duplicate.",409,"duplicate_role");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`research-role:${s.companyId}:${s.url}`]);
  const duplicate=await client.query("SELECT 1 FROM target_roles WHERE company_id=$1 AND (lower(data->>'title')=lower($2) OR data->>'sourceUrl'=$3) LIMIT 1",[s.companyId,s.title,s.url]);
  if(duplicate.rows.length)fail("A role with this title or posting URL already exists for this company.",409,"duplicate_role");
  const roleId=boundedId("job",`${s.companyId}|${s.url}`);
  const role={id:roleId,companyId:s.companyId,title:s.title,priority:"Explore",rationale:`Suggested from an official posting. ${s.reasons.join(" ")}`.slice(0,2000),sourceUrl:s.url,checkedAt:now(),publishedProcess:[],stack:[],requirements:[],steps:[{id:"verify-role",phase:"Understand",title:"Verify the role and expectations",detail:"Read the official posting and confirm location, scope, and hiring process.",doneWhen:"The relevant role details and open questions are recorded.",minutes:20,resources:[]} ]};
  await client.query("INSERT INTO target_roles(id,company_id,data) VALUES($1,$2,$3)",[roleId,s.companyId,JSON.stringify(role)]);
  await client.query("INSERT INTO target_role_states(role_id,data) VALUES($1,$2)",[roleId,JSON.stringify({roleId,stage:"prospect",notes:"",updatedAt:now()})]);
  const candidacyId=`role:${roleId}`; const at=now();
  const candidacy={id:candidacyId,roleId,applicationId:null,stage:"Interested",company:companyName,title:s.title,pipelineNotes:"",notes:"",nextAction:"Review the official posting and decide whether to pursue it.",submittedAt:null,updatedAt:at,revision:1,legacy:{application:null,roleState:null},reconciliation:[]};
  await client.query("INSERT INTO career_candidacies(id,role_id,application_id,current,revision,data,stage,company,title,pipeline_notes,notes,next_action,submitted_at,updated_at,reconciliation) VALUES($1,$2,NULL,true,1,$3,'Interested',$4,$5,'','','Review the official posting and decide whether to pursue it.',NULL,$6,'[]')",[candidacyId,roleId,JSON.stringify(candidacy),companyName,s.title,at]);
  await client.query("INSERT INTO record_heads(entity_type,entity_id,revision) VALUES('candidacy',$1,1)",[candidacyId]);
  await client.query("INSERT INTO record_revisions(entity_type,entity_id,revision,previous_revision,recorded_at,producer,reason,command_key,content) VALUES('candidacy',$1,1,NULL,$2,'company-research','suggestion.accept',$3,$4)",[candidacyId,at,`research:${s.id}`,JSON.stringify(candidacy)]);
  return roleId;
}
async function reviewSuggestion(client:PoolClient,data:Extract<ResearchCommand,{action:"reviewSuggestion"}>["data"]):Promise<void> {
  const found=await client.query<Row>("SELECT s.*,p.data AS profile,c.data AS company FROM company_research_suggestions s JOIN company_research_profiles p USING(company_id) JOIN target_companies c ON c.id=s.company_id WHERE s.id=$1 FOR UPDATE OF s",[data.suggestionId]);
  if(!found.rows[0])fail("This job suggestion was not found.",404,"not_found");
  const row=found.rows[0];
  if(row.status!=="suggested")fail("This suggestion has already been reviewed.",409,"already_reviewed");
  if(data.decision==="dismiss") { await client.query("UPDATE company_research_suggestions SET status='dismissed' WHERE id=$1",[data.suggestionId]); return; }
  const s:RoleSuggestion=roleSuggestionSchema.parse({id:row.id,runId:row.run_id,companyId:row.company_id,sourceId:row.source_id,title:row.title,url:row.url,location:row.location,excerpt:row.excerpt,reasons:json(row.reasons),checks:json(row.checks),status:row.status,roleId:row.role_id});
  const roleId=await createAcceptedRole(client,s,json(row.profile),json(row.company).name);
  await client.query("UPDATE company_research_suggestions SET status='accepted',role_id=$2 WHERE id=$1",[s.id,roleId]);
}

export async function executeResearchCommand(cmd:ResearchCommand):Promise<ResearchState> {
  await ensureDb();
  const command=researchCommandSchema.parse(cmd); const client=await pool.connect();
  try {
    await client.query("BEGIN");
    await receipt(client,command.action,command.key,command,async()=>{
      if(command.action==="createCompany")return {runId:await createCompany(client,command.data)};
      if(command.action==="researchCompany")return {runId:await researchCompany(client,command.data)};
      await reviewSuggestion(client,command.data);return {suggestionId:command.data.suggestionId};
    });
    await client.query("COMMIT");
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally {client.release();}
  return getResearchState();
}

export async function claimResearchRun(onlyRunId?:string):Promise<{run:ResearchRun & {claimToken:string};profile:ResearchProfile}|null> {
  await ensureDb();
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const scoped=onlyRunId?" AND id=$1":"";
    await client.query(`UPDATE company_research_runs SET status='failed',finished_at=now(),lease_token=NULL,lease_until=NULL,error='Research could not be completed after three attempts.' WHERE attempts>=3 AND ((status='queued') OR (status='running' AND lease_until<now()))${scoped}`,onlyRunId?[onlyRunId]:[]);
    const filter=onlyRunId?" AND r.id=$1":"";
    const picked=await client.query<Row>(`SELECT r.id,r.company_id,r.status,r.requested_at,r.started_at,r.finished_at,r.attempts,r.error,p.data AS profile FROM company_research_runs r JOIN company_research_profiles p USING(company_id) WHERE (r.status='queued' OR (r.status='running' AND r.lease_until<now()))${filter} ORDER BY r.requested_at,r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`,onlyRunId?[onlyRunId]:[]);
    if(!picked.rows[0]) {await client.query("COMMIT");return null;}
    const row=picked.rows[0]; const claimToken=randomUUID();
    const changed=await client.query("UPDATE company_research_runs SET status='running',attempts=attempts+1,started_at=coalesce(started_at,now()),lease_token=$2,lease_until=now()+interval '10 minutes',error='' WHERE id=$1 RETURNING attempts",[row.id,claimToken]);
    const run=researchRunSchema.parse({id:row.id,companyId:row.company_id,status:"running",requestedAt:new Date(row.requested_at).toISOString(),startedAt:row.started_at?new Date(row.started_at).toISOString():now(),finishedAt:null,attempts:changed.rows[0].attempts,error:""});
    await client.query("COMMIT");return {run:{...run,claimToken},profile:researchProfileSchema.parse(json(row.profile))};
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

export async function finishResearchRun(runId:string,result:{status?:"complete"|"partial"|"failed";sources:Array<ResearchSource & {capture?:Record<string,unknown>}>;suggestions:RoleSuggestion[];overview?:string;pitch?:string;descriptionSourceUrl?:string;error?:string},claimToken?:string,expectedAttempt?:number):Promise<void> {
  if(!claimToken || !expectedAttempt)fail("A current worker claim token and attempt number are required.",428,"claim_required");
  await ensureDb();
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const row=await client.query<Row>("SELECT company_id,lease_token,attempts FROM company_research_runs WHERE id=$1 FOR UPDATE",[runId]);
    if(!row.rows[0] || row.rows[0].lease_token!==claimToken || row.rows[0].attempts!==expectedAttempt)fail("This worker no longer owns the research run.",409,"stale_claim");
    const companyId=row.rows[0].company_id;
    if(result.sources.length>200 || result.suggestions.length>100)fail("A research run exceeded the source or suggestion limit.",413,"research_result_too_large");
    const sourceCaptures=new Map<string,Record<string,unknown>>();
    const sources=result.sources.map(item=>{
      const {capture,...source}=item;
      if(capture!==undefined) {
        if(!capture || typeof capture!=="object" || Array.isArray(capture) || JSON.stringify(capture).length>100_000)fail("Source capture data must be an object under 100,000 characters.");
        sourceCaptures.set(source.id,capture);
      }
      return researchSourceSchema.parse(source);
    });
    const suggestions=result.suggestions.map(item=>roleSuggestionSchema.parse(item));
    const profileRow=await client.query<{data:any}>("SELECT data FROM company_research_profiles WHERE company_id=$1 FOR UPDATE",[companyId]);
    if(!profileRow.rows[0])fail("The company research profile no longer exists.",409,"profile_missing");
    const profile=researchProfileSchema.parse(json(profileRow.rows[0].data));
    const sourceIds=new Set<string>();
    for(const s of sources) {
      if(s.runId!==runId || s.companyId!==companyId)fail("Every source must belong to the claimed run and company.");
      await assertPublicUrl(s.url);if(s.finalUrl)await assertPublicUrl(s.finalUrl);
      sourceIds.add(s.id);
      await client.query("INSERT INTO company_research_sources(id,run_id,company_id,kind,url,final_url,title,status,detail,captured_at,content_hash,excerpt,capture) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO UPDATE SET final_url=EXCLUDED.final_url,title=EXCLUDED.title,status=EXCLUDED.status,detail=EXCLUDED.detail,captured_at=EXCLUDED.captured_at,content_hash=EXCLUDED.content_hash,excerpt=EXCLUDED.excerpt,capture=EXCLUDED.capture WHERE company_research_sources.run_id=EXCLUDED.run_id AND company_research_sources.company_id=EXCLUDED.company_id",[s.id,s.runId,s.companyId,s.kind,s.url,s.finalUrl,s.title,s.status,s.detail,s.capturedAt,s.contentHash,s.excerpt,JSON.stringify(sourceCaptures.get(s.id)??{})]);
    }
    for(const s of suggestions) {
      if(s.runId!==runId || s.companyId!==companyId || !sourceIds.has(s.sourceId) || s.status!=="suggested" || s.roleId!==null)fail("Suggestions must be new, unreviewed results backed by this run's sources.");
      await assertPublicUrl(s.url);
      const src=sources.find(v=>v.id===s.sourceId)!;
      if(s.checks.officialSource && (src.kind!=="job" || !officialRoleHost(cleanHost(s.url),profile)))s.checks.officialSource=false;
      await client.query("INSERT INTO company_research_suggestions(id,run_id,company_id,source_id,title,url,location,excerpt,reasons,checks,status,role_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'suggested',NULL,$11) ON CONFLICT(id) DO NOTHING",[s.id,s.runId,s.companyId,s.sourceId,s.title,s.url,s.location,s.excerpt,JSON.stringify(s.reasons),JSON.stringify(s.checks),now()]);
    }
    if(result.overview!==undefined || result.pitch!==undefined || result.descriptionSourceUrl!==undefined) {
      const updated={...profile,overview:result.overview?.slice(0,2000)??profile.overview,pitch:result.pitch?.slice(0,1000)??profile.pitch,descriptionSourceUrl:result.descriptionSourceUrl??profile.descriptionSourceUrl,updatedAt:now()};
      if(updated.descriptionSourceUrl)await assertPublicUrl(updated.descriptionSourceUrl);
      const valid=researchProfileSchema.parse(updated);
      await client.query("UPDATE company_research_profiles SET overview=$2,pitch=$3,description_source_url=$4,data=$5,updated_at=$6 WHERE company_id=$1",[companyId,valid.overview,valid.pitch,valid.descriptionSourceUrl,JSON.stringify(valid),valid.updatedAt]);
      const company=await client.query<{data:any}>("SELECT data FROM target_companies WHERE id=$1 FOR UPDATE",[companyId]);const companyData=json(company.rows[0].data);companyData.summary=valid.overview;
      await client.query("UPDATE target_companies SET data=$2 WHERE id=$1",[companyId,JSON.stringify(companyData)]);
    }
    const usable=sources.filter(s=>s.status==="fetched"||s.status==="cached");
    const hasWebsite=usable.some(s=>s.kind==="website");
    const hasCareers=usable.some(s=>s.kind==="careers");
    const errors=Boolean(result.error) || sources.some(s=>s.status==="failed"||s.status==="blocked");
    const computed=usable.length===0?"failed":errors||!hasWebsite||!hasCareers?"partial":"complete";
    if(result.status==="failed" && computed!=="failed" && !result.error)fail("A worker-reported failure needs a bounded error explanation.",400,"invalid_run_outcome");
    if(result.status==="partial" && computed==="complete" && !result.error)fail("A worker-reported partial result needs a source failure or bounded error explanation.",400,"invalid_run_outcome");
    const status=computed;
    if(status==="complete" && result.error)fail("A run with worker errors cannot be marked complete.",400,"invalid_run_outcome");
    if(status==="failed" && !result.error) fail("A failed run needs a bounded error explanation.",400,"invalid_run_outcome");
    const done=await client.query("UPDATE company_research_runs SET status=$2,finished_at=now(),lease_token=NULL,lease_until=NULL,error=$3 WHERE id=$1 AND lease_token=$4 AND attempts=$5",[runId,status,(result.error??"").slice(0,2000),claimToken,expectedAttempt]);
    if(!done.rowCount)fail("This worker no longer owns the research run.",409,"stale_claim");
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

export async function getCachedResearchSource(url:string):Promise<(ResearchSource & {capture:Record<string,unknown>})|null> {
  await ensureDb();
  await assertPublicUrl(url);
  const found=await pool.query<Row>("SELECT id,run_id,company_id,kind,url,final_url,title,status,detail,captured_at,content_hash,excerpt,capture FROM company_research_sources WHERE url=$1 AND status IN ('fetched','cached') AND captured_at>=now()-interval '24 hours' ORDER BY captured_at DESC LIMIT 1",[url]);
  const r=found.rows[0];return r?{...researchSourceSchema.parse({id:r.id,runId:r.run_id,companyId:r.company_id,kind:r.kind,url:r.url,finalUrl:r.final_url,title:r.title,status:"cached",detail:r.detail,capturedAt:new Date(r.captured_at).toISOString(),contentHash:r.content_hash,excerpt:r.excerpt}),capture:json(r.capture)}:null;
}
