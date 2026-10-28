import { db, ensureDb } from "@/lib/db";
import { algorithmBank } from "@/lib/schema";
import { algorithmQuestions } from "@/data/algorithms";
export const dynamic="force-dynamic";
export async function GET() {
  try {
    await ensureDb();
    const rows=await db.select().from(algorithmBank).orderBy(algorithmBank.createdAt,algorithmBank.id);
    const order=new Map(algorithmQuestions.map((question,index)=>[question.id,index]));
    return Response.json({questions:rows.map(row=>row.data).sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999))},{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Question library is unavailable. Check the local database and retry."},{status:503}); }
}
