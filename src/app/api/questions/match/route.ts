import { matchInput, matchQuestion } from "@/lib/question-match";
import { sameOrigin } from "@/lib/validation";
export const dynamic="force-dynamic";
export const maxDuration=60;
let active=0;
export async function POST(request:Request) {
  if(!sameOrigin(request)) return Response.json({error:"Origin is not allowed"},{status:403});
  if(active>=2) return Response.json({error:"Two matching requests are already running. Retry shortly."},{status:429,headers:{"Retry-After":"2"}});
  let raw:unknown;
  try {const text=await request.text();if(text.length>140000) return Response.json({error:"Request is too large"},{status:413});raw=JSON.parse(text);}
  catch {return Response.json({error:"Invalid JSON"},{status:400});}
  const parsed=matchInput.safeParse(raw);
  if(!parsed.success) return Response.json({error:"Invalid match request",details:parsed.error.flatten()},{status:400});
  active++;
  try {return Response.json(await matchQuestion(parsed.data,request.signal),{headers:{"Cache-Control":"no-store"}});}
  catch {return Response.json({error:"Question matching is unavailable. Please try again shortly."},{status:503});}
  finally {active--;}
}
