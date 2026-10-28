import { CareerError } from "@/domains/career/service";
import { getWorkspace, mutateWorkspace } from "@/lib/workspace";
import { mutationSchema, sameOrigin } from "@/lib/validation";
export const dynamic="force-dynamic";
export async function GET() {
  try { return Response.json(await getWorkspace(),{headers:{"Cache-Control":"no-store"}}); }
  catch(error) { console.error("Workspace read failed", error instanceof Error?error.message:"Unknown error"); return Response.json({error:"Database is unavailable. Start Docker Compose and retry."},{status:503}); }
}
export async function POST(request:Request) {
  if(!sameOrigin(request)) return Response.json({error:"Origin is not allowed"},{status:403});
  if(Number(request.headers.get("content-length")||0)>1300000) return Response.json({error:"Request is too large"},{status:413});
  let raw:unknown;
  try { const text=await request.text(); if(text.length>1300000)return Response.json({error:"Request is too large"},{status:413}); raw=JSON.parse(text); }
  catch { return Response.json({error:"Invalid JSON"},{status:400}); }
  if(raw && typeof raw==="object" && "action" in raw && ["application", "note"].includes(String(raw.action)) && (!("meta" in raw) || !raw.meta)) return Response.json({error:"Reload this record before saving. A revision and retry key are required.",code:"precondition_required"},{status:428});
  const parsed=mutationSchema.safeParse(raw);
  if(!parsed.success) return Response.json({error:"Please check the saved fields.",details:parsed.error.flatten()},{status:400});
  try { return Response.json(await mutateWorkspace(parsed.data),{headers:{"Cache-Control":"no-store"}}); }
  catch(error) { if(error instanceof CareerError) return Response.json({error:error.message,code:error.code,currentRevision:error.currentRevision},{status:error.status}); console.error("Workspace save failed",error instanceof Error?error.message:"Unknown error"); return Response.json({error:"Could not save. Your changes have not been confirmed. Retry when the database is available."},{status:503}); }
}
