import { apiSchemas } from "../../src/lib/openapi";
import assert from "node:assert/strict";
const base="http://127.0.0.1:3042";
async function main(){
  const routes: [string,string][] = [["/api/health","HealthResponse"],["/api/workspace","WorkspaceResponse"],["/api/targets","TargetsResponse"],["/api/career","CareerResponse"],["/api/export","ExportResponse"],["/api/algorithms","AlgorithmsResponse"],["/api/knowledge","KnowledgeListResponse"],["/api/coach","CoachingHistoryResponse"]];
  let count=0;
  for(const [path,model] of routes){const response=await fetch(base+path,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,path);const data=await response.json();const parsed=apiSchemas[model].safeParse(data);assert(parsed.success,`${path}: ${JSON.stringify(parsed.error?.issues.map(issue=>({path:issue.path,message:issue.message})))}`);count++;
    if(path==="/api/algorithms"){const id=data.questions[0].id; for(const suffix of ["","?includeSolutions=true&language=go"]){const detail=await fetch(`${base}/api/questions/${id}${suffix}`,{signal:AbortSignal.timeout(10000)});assert.equal(detail.status,200);apiSchemas.QuestionDetailResponse.parse(await detail.json());count++;}}
    if(path==="/api/knowledge"){const detail=await fetch(`${base}/api/knowledge/${data.entries[0].id}`,{signal:AbortSignal.timeout(10000)});assert.equal(detail.status,200);apiSchemas.KnowledgeDetailResponse.parse(await detail.json());count++;}
  }
  const response=await fetch(base+"/api/questions/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"two sum",mode:"local",requestId:"qa-openapi-local"}),signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);apiSchemas.QuestionMatchResponse.parse(await response.json());count++;
  const invalid=await fetch(base+"/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"note",data:{key:"qa-must-not-save",value:""}}),signal:AbortSignal.timeout(10000)});assert.equal(invalid.status,428);
  console.log(JSON.stringify({responsesValidated:count,missingRevisionStatus:invalid.status,providerCalls:0,persistenceWrites:0}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
