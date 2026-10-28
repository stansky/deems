import { researchCommandSchema, researchStateSchema } from "@/contracts/company-research";
import { CompanyResearchError, executeResearchCommand, getResearchState } from "@/domains/company-research/service";
import { ensureDb } from "@/lib/db";
import { sameOrigin } from "@/lib/validation";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
const BODY_LIMIT=120_000;
class BodyTooLarge extends Error {}

async function readBody(request:Request):Promise<unknown> {
  if(Number(request.headers.get("content-length")||0)>BODY_LIMIT)throw new BodyTooLarge();
  if(!request.body)throw new SyntaxError();
  const reader=request.body.getReader();const decoder=new TextDecoder("utf-8",{fatal:true});let bytes=0;let body="";
  try {
    while(true) { const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>BODY_LIMIT){await reader.cancel();throw new BodyTooLarge();}body+=decoder.decode(part.value,{stream:true}); }
    return JSON.parse(body+decoder.decode());
  } finally {reader.releaseLock();}
}
export async function GET() {
  try {await ensureDb();return Response.json(researchStateSchema.parse(await getResearchState()),{headers});}
  catch {return Response.json({error:"Company research is unavailable. Please try again shortly."},{status:503,headers});}
}
export async function POST(request:Request) {
  if(!sameOrigin(request)||request.headers.get("sec-fetch-site")==="cross-site")return Response.json({error:"Origin is not allowed."},{status:403,headers});
  let raw:unknown;
  try {raw=await readBody(request);}catch(error) {return Response.json({error:error instanceof BodyTooLarge?"Keep the request below 120,000 bytes.":"Send valid JSON."},{status:error instanceof BodyTooLarge?413:400,headers});}
  const parsed=researchCommandSchema.safeParse(raw);
  if(!parsed.success)return Response.json({error:"Check the company research fields and try again.",details:parsed.error.flatten()},{status:400,headers});
  try {await ensureDb();return Response.json(researchStateSchema.parse(await executeResearchCommand(parsed.data)),{headers});}
  catch(error) {
    if(error instanceof CompanyResearchError)return Response.json({error:error.message,code:error.code},{status:error.status,headers});
    return Response.json({error:"Your research change has not been confirmed. Retry when your workspace is available."},{status:503,headers});
  }
}
