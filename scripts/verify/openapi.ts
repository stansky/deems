import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3_1 } from "openapi-types";
import { createOpenApiDocument } from "../../src/lib/openapi";
import { workspaceMutationSchema } from "../../src/contracts/workspace";
import { targetMutationSchema } from "../../src/contracts/targets";
import assert from "node:assert/strict";
async function main() {
  const spec=createOpenApiDocument();
  await SwaggerParser.validate(structuredClone(spec) as unknown as OpenAPIV3_1.Document);
  const note={action:"note",data:{key:"qa-contract",value:"example"},meta:{expectedRevision:0,producer:"qa",key:"test"}};
  assert(workspaceMutationSchema.safeParse(note).success);
  assert(!workspaceMutationSchema.safeParse({...note,meta:undefined}).success);
  assert(!workspaceMutationSchema.safeParse({...note,data:{...note.data,value:"x".repeat(100001)}}).success);
  assert(!targetMutationSchema.safeParse({action:"interview",meta:note.meta,data:{id:"qa-round",roleId:"qa-role",companyId:"qa-company",title:"QA",scheduledAt:null,status:"scheduled",format:"",notes:""}}).success);
  console.log(JSON.stringify({openapi:spec.openapi,paths:Object.keys(spec.paths).length,models:Object.keys(spec.components.schemas).length,parserValidation:"passed",requiredRevisionAndInputLimits:"passed"}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
