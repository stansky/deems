import { ensureDb, pool } from "@/lib/db";
import { readCareer } from "@/domains/career/service";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await ensureDb();
    return Response.json(await readCareer(pool), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({error:"Career history is unavailable. Retry when your workspace is available."},{status:503});
  }
}
