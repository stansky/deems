import { readFile } from "node:fs/promises";
import OpenAI from "openai";

export const openAIModel=process.env.DEEMS_OPENAI_MODEL || process.env.INTERVIEW_LOCAL_OPENAI_MODEL || "gpt-6-luna";
export async function getOpenAIKey() {
  const key = process.env.DEEMS_OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (key?.trim()) return key.trim();
  if(process.env.INTERVIEW_LOCAL_OPENAI_KEY?.trim()) return process.env.INTERVIEW_LOCAL_OPENAI_KEY.trim();
  try {return (await readFile("/run/secrets/deems_openai_key","utf8")).trim();}
  catch {return "";}
}
export function createOpenAIClient(key:string) {
  return new OpenAI({apiKey:key,project:process.env.OPENAI_PROJECT_ID,timeout:45000,maxRetries:0});
}
