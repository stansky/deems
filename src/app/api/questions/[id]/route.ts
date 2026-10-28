import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, ensureDb } from "@/lib/db";
import { algorithmBank } from "@/lib/schema";
import { questionDetails } from "@/lib/question-match";
import { getKnowledgeEntries } from "@/lib/knowledge";
export const dynamic="force-dynamic";
const querySchema=z.object({language:z.enum(["python","javascript","go","php"]).default("python"),includeSolutions:z.enum(["true","false"]).default("false")}).strict();
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success) return Response.json({error:"Invalid language or includeSolutions query"},{status:400});
  try {
    const {id}=await params;
    await ensureDb();
    const [row]=await db.select().from(algorithmBank).where(eq(algorithmBank.id,id));
    if(!row) return Response.json({error:"Question not found"},{status:404});
    const relatedKnowledge=(await getKnowledgeEntries()).filter(entry=>entry.relatedQuestionIds.includes(id)).map(entry=>({id:entry.id,title:entry.title,kind:entry.kind,url:`/api/knowledge/${encodeURIComponent(entry.id)}`}));
    return Response.json({...questionDetails(row.data,parsed.data.language,parsed.data.includeSolutions==="true"),relatedKnowledge},{headers:{"Cache-Control":"no-store"}});
  } catch {return Response.json({error:"Question library is unavailable"},{status:503});}
}
