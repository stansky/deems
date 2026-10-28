import { z } from "zod";
import { getKnowledgeEntries } from "@/lib/knowledge";

export const dynamic = "force-dynamic";
const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  kind: z.enum(["term", "mental-math"]).optional(),
  category: z.string().trim().min(1).max(80).optional(),
}).strict();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const headers = { "Cache-Control": "no-store" };
  const seen = new Set<string>();
  for (const [key] of params) {
    if (seen.has(key)) return Response.json({ error: "Query parameters must not repeat." }, { status: 400, headers });
    seen.add(key);
  }
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return Response.json({ error: "Use q (up to 200 characters), kind (term or mental-math), and category (up to 80 characters)." }, { status: 400, headers });
  try {
    const query = parsed.data.q?.toLocaleLowerCase();
    const category = parsed.data.category?.toLocaleLowerCase();
    const entries = (await getKnowledgeEntries()).filter(entry => {
      if (parsed.data.kind && entry.kind !== parsed.data.kind) return false;
      if (category && entry.category.toLocaleLowerCase() !== category) return false;
      if (!query) return true;
      const text = [entry.title, entry.category, entry.plain, entry.analogy, entry.example, ...entry.steps, ...entry.pitfalls, ...entry.relatedTerms].join(" ").toLocaleLowerCase();
      return text.includes(query);
    });
    return Response.json({ entries, total: entries.length }, { headers });
  } catch {
    return Response.json({ error: "The reference library is unavailable. Check the local database and retry." }, { status: 503, headers });
  }
}
