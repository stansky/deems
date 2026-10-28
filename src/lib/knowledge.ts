import { db, ensureDb } from "./db";
import { knowledgeBank } from "./schema";
export async function getKnowledgeEntries() {
  await ensureDb();
  return (await db.select().from(knowledgeBank).orderBy(knowledgeBank.id)).map(row=>row.data);
}
