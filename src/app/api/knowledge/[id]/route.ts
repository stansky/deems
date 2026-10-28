import { z } from "zod";
import { getKnowledgeEntries } from "@/lib/knowledge";

export const dynamic = "force-dynamic";
const idSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  const parsed = idSchema.safeParse((await context.params).id);
  if (!parsed.success || new URL(request.url).searchParams.size > 0) {
    return Response.json({ error: "Use a valid reference ID without query parameters." }, { status: 400, headers });
  }
  try {
    const entry = (await getKnowledgeEntries()).find(item => item.id === parsed.data);
    if (!entry) return Response.json({ error: "Reference entry not found." }, { status: 404, headers });
    return Response.json({ entry }, { headers });
  } catch {
    return Response.json({ error: "The reference library is unavailable. Please try again shortly." }, { status: 503, headers });
  }
}
