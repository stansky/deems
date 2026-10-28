import { readFile } from "node:fs/promises";
import path from "node:path";
import { personalPrepResponseSchema } from "@/contracts/personal-prep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (process.env.VERCEL) {
    return Response.json(personalPrepResponseSchema.parse({ stories: [] }));
  }

  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "private");
  const filePath = path.join(dataDir, "stories.json");
  try {
    const contents = await readFile(filePath, "utf8");
    const result = personalPrepResponseSchema.parse({ stories: JSON.parse(contents) });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Personal preparation data is unavailable or invalid." }, { status: 503 });
  }
}
