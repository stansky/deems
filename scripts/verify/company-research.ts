import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { CompanyResearchError, claimResearchRun, executeResearchCommand, finishResearchRun, getResearchState } from "@/domains/company-research/service";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("Set DATABASE_URL to an isolated company_research_verify database clone.");
const database=decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//,""));
if(!database.includes("research_verify") || database==="interview")throw new Error("Refusing verification unless the database name includes research_verify and is not the live interview database.");
const pool=new Pool({connectionString:databaseUrl,max:2,connectionTimeoutMillis:5000});
function assert(condition:unknown,message:string):asserts condition {if(!condition)throw new Error(message);}
const suffix=randomUUID().replaceAll("-","");
const companyName=`Research Verify ${suffix.slice(0,10)}`;
const host=`8.${11+(parseInt(suffix.slice(0,2),16)%180)}.${parseInt(suffix.slice(2,4),16)}.${1+(parseInt(suffix.slice(4,6),16)%250)}`;
const websiteUrl=`https://${host}/`;
const careersUrl=`https://${host}/careers`;
const jobUrl=`https://${host}/careers/backend-engineer`;
const slug=companyName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
const expectedCompanyId=`${slug}-${createHash("sha256").update(`${slug}|${host}`).digest("hex").slice(0,32)}`;
const createKey=`verify-create-${suffix}`;
const refreshKey=`verify-refresh-${suffix}`;
const acceptKey=`verify-accept-${suffix}`;
let companyId:string|undefined=expectedCompanyId;
let acceptedRoleId:string|undefined;
let suggestionId:string|undefined;
const hash=()=>createHash("sha256").update(randomUUID()).digest("hex");

async function cleanup() {
  if(!companyId)return;
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    if(suggestionId)await client.query("DELETE FROM company_research_suggestions WHERE id=$1",[suggestionId]);
    if(acceptedRoleId) {
      const candidacyId=`role:${acceptedRoleId}`;
      await client.query("DELETE FROM record_revisions WHERE entity_type='candidacy' AND entity_id=$1",[candidacyId]);
      await client.query("DELETE FROM record_heads WHERE entity_type='candidacy' AND entity_id=$1",[candidacyId]);
      await client.query("DELETE FROM career_candidacies WHERE id=$1",[candidacyId]);
      await client.query("DELETE FROM target_role_states WHERE role_id=$1",[acceptedRoleId]);
      await client.query("DELETE FROM target_roles WHERE id=$1 AND company_id=$2",[acceptedRoleId,companyId]);
    }
    await client.query("DELETE FROM company_research_command_receipts WHERE key=ANY($1::text[])",[[createKey,refreshKey,acceptKey]]);
    await client.query("DELETE FROM target_companies WHERE id=$1",[companyId]);
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

try {
  const migration=await pool.query("SELECT checksum FROM schema_migrations WHERE version='company-research-v4'");
  assert(migration.rows.length===1,"company-research-v4 must be applied by the coordinator before verification.");
  const create={action:"createCompany" as const,key:createKey,data:{name:companyName,websiteUrl,careersUrl,linkedinUrl:null,focus:["Backend" as const]}};
  let state=await executeResearchCommand(create);
  const profile=state.profiles.find(item=>item.websiteUrl===websiteUrl);
  assert(profile,"createCompany did not persist its profile.");
  assert(profile.companyId===expectedCompanyId,"company ID is not deterministic from its normalized identity.");
  const run=state.runs.find(item=>item.companyId===companyId&&item.status==="queued");
  assert(run,"createCompany did not queue a durable research run.");
  await executeResearchCommand(create);
  state=await getResearchState();
  assert(state.profiles.filter(item=>item.companyId===companyId).length===1,"identical create retry created a duplicate company profile.");
  assert(state.runs.filter(item=>item.companyId===companyId).length===1,"identical create retry created a duplicate research run.");

  const firstClaim=await claimResearchRun(run.id);
  assert(firstClaim?.run.id===run.id&&firstClaim.run.attempts===1,"created run was not claimable by its exact ID.");
  const capturedAt=new Date().toISOString();
  const source=(kind:"website"|"careers"|"job",url:string)=>({
    id:`verify-source-${kind}-${suffix.slice(0,16)}`,runId:run.id,companyId:companyId!,kind,url,finalUrl:url,title:`Verified ${kind} page`,status:"fetched" as const,
    detail:"Disposable verifier capture",capturedAt,contentHash:hash(),excerpt:`Official ${kind} capture for a disposable verification record.`,capture:{},
  });
  const sources=[source("website",websiteUrl),source("careers",careersUrl),source("job",jobUrl)];
  suggestionId=`verify-suggestion-${suffix.slice(0,24)}`;
  await finishResearchRun(run.id,{
    status:"complete",sources,suggestions:[{id:suggestionId,runId:run.id,companyId:companyId!,sourceId:sources[2].id,title:"Backend Software Engineer",url:jobUrl,location:"Remote",excerpt:"Own backend services.",reasons:["Backend: role title matches selected focus"],checks:{officialSource:true,detailFetched:true,duplicateRole:false,activePosting:"unverified"},status:"suggested",roleId:null}],
    overview:"Disposable official overview.",pitch:"Disposable company pitch.",descriptionSourceUrl:websiteUrl,
  },firstClaim.run.claimToken,firstClaim.run.attempts);

  const accept={action:"reviewSuggestion" as const,key:acceptKey,data:{suggestionId,decision:"accept" as const}};
  acceptedRoleId=`job-${createHash("sha256").update(`${companyId}|${jobUrl}`).digest("hex").slice(0,32)}`;
  state=await executeResearchCommand(accept);
  const accepted=state.suggestions.find(item=>item.id===suggestionId);
  assert(accepted?.status==="accepted"&&accepted.roleId,"explicit acceptance did not create a role.");
  assert(accepted.roleId===acceptedRoleId,"accepted role ID was not stable for company and posting URL.");
  const acceptedAgain=await executeResearchCommand(accept);
  assert(acceptedAgain.suggestions.filter(item=>item.id===suggestionId&&item.status==="accepted").length===1,"idempotent accept did not return one accepted suggestion.");
  const candidacy=await pool.query("SELECT revision,stage FROM career_candidacies WHERE id=$1 AND role_id=$2",[`role:${acceptedRoleId}`,acceptedRoleId]);
  assert(candidacy.rows.length===1&&candidacy.rows[0].revision===1&&candidacy.rows[0].stage==="Interested","accept did not create exactly one initial prospect candidacy revision.");

  const refresh={action:"researchCompany" as const,key:refreshKey,data:{companyId,websiteUrl,careersUrl,linkedinUrl:null,focus:["Backend" as const]}};
  state=await executeResearchCommand(refresh);
  const queued=state.runs.find(item=>item.companyId===companyId&&item.status==="queued");
  assert(queued,"explicit refresh did not queue a new run after the previous run completed.");
  const oldClaim=await claimResearchRun(queued.id);
  assert(oldClaim?.run.attempts===1,"refreshed run could not be claimed.");
  await pool.query("UPDATE company_research_runs SET lease_until=now()-interval '1 second' WHERE id=$1 AND lease_token=$2",[queued.id,oldClaim.run.claimToken]);
  const newClaim=await claimResearchRun(queued.id);
  assert(newClaim?.run.attempts===2&&newClaim.run.claimToken!==oldClaim.run.claimToken,"expired claim was not fenced with a new attempt and token.");
  let staleRejected=false;
  try {await finishResearchRun(queued.id,{status:"failed",sources:[],suggestions:[],error:"stale verifier attempt"},oldClaim.run.claimToken,oldClaim.run.attempts);}
  catch(error) {staleRejected=error instanceof CompanyResearchError&&error.code==="stale_claim";}
  assert(staleRejected,"stale worker attempt was allowed to finish a reclaimed run.");
  await finishResearchRun(queued.id,{status:"failed",sources:[],suggestions:[],error:"Disposable stale-claim verification complete."},newClaim.run.claimToken,newClaim.run.attempts);

  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SAVEPOINT bad_semantic_link");
    let foreignKeyRejected=false;
    try {
      await client.query("INSERT INTO company_research_suggestions(id,run_id,company_id,source_id,title,url,reasons,checks,status,created_at) VALUES($1,$2,$3,$4,'Wrong run source',$5,'[]',$6,'suggested',now())",[`bad-${suffix.slice(0,20)}`,`missing-${suffix.slice(0,20)}`,companyId,sources[2].id,jobUrl,JSON.stringify({officialSource:true,detailFetched:true,duplicateRole:false,activePosting:"unverified"})]);
    } catch(error:any) {foreignKeyRejected=error?.code==="23503";}
    await client.query("ROLLBACK TO SAVEPOINT bad_semantic_link");
    await client.query("ROLLBACK");
    assert(foreignKeyRejected,"composite suggestion source/run/company foreign key accepted a mismatched run.");
  } finally {client.release();}
  process.stdout.write("Company research create/retry, explicit acceptance, initial candidacy revision, source/run/company foreign key, and stale claim fencing verified.\n");
} finally {
  try {await cleanup();} finally {await pool.end();}
}
