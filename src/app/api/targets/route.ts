import { CareerError } from "@/domains/career/service";
import { getTargets, mutateTargets, TargetInputError, targetMutationSchema } from "@/lib/targets";
import { sameOrigin } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const bodyLimit = 120000;
class BodyTooLarge extends Error {}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > bodyLimit) throw new BodyTooLarge();
  if (!request.body) throw new SyntaxError();
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > bodyLimit) { await reader.cancel(); throw new BodyTooLarge(); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

export async function GET() {
  try { return Response.json(await getTargets(), { headers }); }
  catch { return Response.json({ error: "Target plans are unavailable. Check Docker Compose and retry." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Origin is not allowed." }, { status: 403, headers });
  let raw: unknown;
  try { raw = await readBody(request); }
  catch (error) {
    return Response.json({ error: error instanceof BodyTooLarge ? "Keep the request below 120,000 bytes." : "Send valid JSON." }, { status: error instanceof BodyTooLarge ? 413 : 400, headers });
  }
  if(raw && typeof raw==="object" && "action" in raw && ["roleState", "interview", "debrief", "resolve"].includes(String(raw.action)) && (!("meta" in raw) || !raw.meta)) return Response.json({error:"Reload this record before saving. A revision and retry key are required.",code:"precondition_required"},{status:428});
  const parsed = targetMutationSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Check the target fields and try again.", details: parsed.error.flatten() }, { status: 400, headers });
  try { return Response.json(await mutateTargets(parsed.data), { headers }); }
  catch (error) {
    if (error instanceof CareerError) return Response.json({error:error.message,code:error.code,currentRevision:error.currentRevision},{status:error.status,headers});
    if (error instanceof TargetInputError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: "Your change has not been confirmed. Retry when the local database is available." }, { status: 503, headers });
  }
}
