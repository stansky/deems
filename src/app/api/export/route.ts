import { getWorkspace } from "@/lib/workspace";
import { db, pool } from "@/lib/db";
import { algorithmBank, coaching, knowledgeBank } from "@/lib/schema";
import { getTargets } from "@/lib/targets";
export const dynamic="force-dynamic";
export async function GET() {
  try {
    const workspace=await getWorkspace();
    const career:Record<string,unknown[]>={};
    for (const table of ["schema_migrations","career_candidacies","record_heads","record_revisions","command_receipts"]) {
      career[table]=(await pool.query(`SELECT * FROM ${table}`)).rows;
    }
    const research:Record<string,unknown[]>={};
    for (const table of ["company_research_profiles","company_research_runs","company_research_sources","company_research_suggestions","company_research_command_receipts"]) {
      research[table]=(await pool.query(`SELECT * FROM ${table}`)).rows;
    }
    return Response.json({exportedAt:new Date().toISOString(),version:6,workspace,targets:await getTargets(),career,research,algorithms:await db.select().from(algorithmBank),knowledge:await db.select().from(knowledgeBank),coaching:await db.select().from(coaching)},{headers:{"Content-Disposition":"attachment; filename=deems-export.json","Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Export unavailable"},{status:503}); }
}
