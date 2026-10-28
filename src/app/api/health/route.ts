import { ensureDb, pool } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){try{await ensureDb();await pool.query("SELECT 1");return Response.json({status:"ok",database:"postgresql"});}catch{return Response.json({status:"unavailable"},{status:503});}}
