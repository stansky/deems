import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const dynamic="force-dynamic";
export async function GET(){if(process.env.VERCEL)return Response.json({error:"Not available."},{status:404});try{const data=await readFile(join(process.env.DATA_DIR||join(process.cwd(),"private"),"resume.pdf"));return new Response(data,{headers:{"Content-Type":"application/pdf","Content-Disposition":"inline; filename=resume.pdf","Cache-Control":"no-store"}});}catch{return Response.json({error:"Resume PDF is not available in the local data folder."},{status:404});}}
