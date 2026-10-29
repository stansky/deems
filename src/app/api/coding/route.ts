import { codingHistorySchema, codingRequestSchema, codingResponseSchema } from "@/contracts/coding";
import { CodingError, codingHistory, executeCoding } from "@/domains/coding/service";
import { runnerConfigured } from "@/domains/coding/judge0";
import { codingSuite } from "@/domains/coding/suites";
import { ensureDb, pool } from "@/lib/db";
import { sameOrigin } from "@/lib/validation";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const questionId = new URL(request.url).searchParams.get("questionId") ?? "";
  if (!questionId || questionId.length>120) return Response.json({error:"Choose a question."}, {status:400,headers});
  try {
    await ensureDb();
    return Response.json(codingHistorySchema.parse({ configured: runnerConfigured(), problem: codingSuite(questionId, "submit")?.problem ?? null, attempts: await codingHistory(pool, questionId) }), {headers});
  } catch { return Response.json({error:"Coding history is unavailable. Your code is kept in this browser."}, {status:503,headers}); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:"Origin is not allowed."}, {status:403,headers});
  let raw: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0)>100000) return Response.json({error:"Code is too large."}, {status:413,headers});
    const reader = request.body?.getReader();
    if (!reader) return Response.json({error:"Invalid JSON."}, {status:400,headers});
    const chunks: Uint8Array[] = []; let bytes=0;
    try {
      while (true) {
        const {done,value}=await reader.read(); if(done) break;
        bytes+=value.byteLength;
        if(bytes>100000) { await reader.cancel(); return Response.json({error:"Code is too large."}, {status:413,headers}); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({error:"Invalid JSON."}, {status:400,headers}); }
  const parsed = codingRequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({error:"Check the question, language, and code. Code is limited to 32,000 characters."}, {status:400,headers});
  try {
    await ensureDb();
    return Response.json(codingResponseSchema.parse(await executeCoding(pool, parsed.data)), {headers});
  } catch (error) {
    if (error instanceof CodingError) return Response.json({error:error.message,code:error.code}, {status:error.status,headers});
    return Response.json({error:"The run could not be confirmed. Your code is kept. Check saved attempts before trying again."}, {status:503,headers});
  }
}
