import { practiceCommandSchema, practiceResponseSchema } from "@/contracts/practice";
import { executePracticeCommand, PracticeError } from "@/domains/practice/service";
import { ensureDb, pool } from "@/lib/db";
import { sameOrigin } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin is not allowed" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 1600000) return Response.json({ error: "Request is too large" }, { status: 413 });
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 1600000) return Response.json({ error: "Request is too large" }, { status: 413 });
    raw = JSON.parse(body);
  } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = practiceCommandSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Please check the practice fields.", details: parsed.error.flatten() }, { status: 400 });
  try {
    await ensureDb();
    const attempt = await executePracticeCommand(pool, parsed.data);
    return Response.json(practiceResponseSchema.parse({ attempt }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PracticeError) return Response.json({ error: error.message, code: error.code, currentRevision: error.currentRevision }, { status: error.status });
    console.error("Practice save failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Save could not be confirmed. Your draft is kept. Retry when the database is available." }, { status: 503 });
  }
}
