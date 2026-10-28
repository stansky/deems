import { askCoach, coachConfigured, coachInput, coachModel, getCoachHistory } from "@/lib/coach";
import { sameOrigin } from "@/lib/validation";
import OpenAI from "openai";
export const dynamic="force-dynamic";
export const maxDuration=90;
let active=false;
export async function GET(request:Request) {
  try {
    const questionId=new URL(request.url).searchParams.get("questionId") || undefined;
    return Response.json({configured:await coachConfigured(),model:coachModel,history:await getCoachHistory(questionId)},{headers:{"Cache-Control":"no-store"}});
  } catch {return Response.json({error:"Coaching history is unavailable."},{status:503});}
}
export async function POST(request:Request) {
  if(!sameOrigin(request)) return Response.json({error:"Origin is not allowed"},{status:403});
  if(active) return Response.json({error:"Another explanation is being prepared. Try again when it finishes."},{status:429});
  let raw:unknown;
  try {const text=await request.text();if(text.length>12000) return Response.json({error:"Please shorten your question."},{status:413});raw=JSON.parse(text);} catch {return Response.json({error:"Invalid request."},{status:400});}
  const parsed=coachInput.safeParse(raw);
  if(!parsed.success) return Response.json({error:"Choose a question, language, and coaching action."},{status:400});
  active=true;
  try {return Response.json(await askCoach(parsed.data),{headers:{"Cache-Control":"no-store"}});}
  catch(error) {
    if(error instanceof Error && error.message==="KEY_MISSING") return Response.json({error:"OpenAI is not configured. Add DEEMS_OPENAI_KEY to localrc and restart with scripts/local.py."},{status:503});
    if(error instanceof Error && error.message==="QUESTION_MISSING") return Response.json({error:"This question is no longer in the library."},{status:404});
    if(error instanceof OpenAI.APIError) {
      const status=error.status;
      return Response.json({error:status===401?"OpenAI rejected the configured key.":status===429?"OpenAI is rate-limited or out of quota. Please try again later.":status===404?"The configured OpenAI model is unavailable for this key.":"OpenAI could not complete this request. Your saved profile is unchanged."},{status:502});
    }
    return Response.json({error:"The explanation could not be completed or saved. Please try again."},{status:502});
  } finally {active=false;}
}
