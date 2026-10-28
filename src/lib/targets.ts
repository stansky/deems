import { boardStage } from "@/domains/career/contracts";
import { executeCareerCommand, readCareer, CareerError } from "@/domains/career/service";
import { ensureDb, pool } from "./db";
import type { TargetCompany, TargetRole, TargetSource, TargetProgress, TargetRoleState, TargetAssessment, TargetInterview, TargetDebrief, TargetsState, TargetMutation } from "./target-types";

export { targetMutationSchema } from "@/contracts/targets";

export class TargetInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function getTargets(): Promise<TargetsState> {
  await ensureDb();
  const [companies, roles, sources, progress, assessments, interviews, debriefs, roleStates] = await Promise.all([
    pool.query<{ data: TargetCompany }>("SELECT data FROM target_companies ORDER BY CASE id WHEN 'sycamore' THEN 0 WHEN 'tesla' THEN 1 WHEN 'anthropic' THEN 2 WHEN 'ollama' THEN 3 ELSE 4 END, id"),
    pool.query<{ data: TargetRole }>("SELECT data FROM target_roles ORDER BY CASE data->>'priority' WHEN 'Primary' THEN 0 WHEN 'Adjacent' THEN 1 WHEN 'Stretch' THEN 2 ELSE 3 END, id"),
    pool.query<{ data: TargetSource }>("SELECT data FROM target_sources ORDER BY id"),
    pool.query<{ data: TargetProgress }>("SELECT data FROM target_progress ORDER BY role_id, item_id"),
    pool.query<{ data: TargetAssessment }>("SELECT data FROM target_assessments ORDER BY role_id, requirement_id"),
    pool.query<{ data: TargetInterview }>("SELECT data FROM target_interviews ORDER BY (data->>'scheduledAt')::timestamptz ASC NULLS LAST, id"),
    pool.query<{ data: TargetDebrief }>("SELECT data FROM target_debriefs ORDER BY data->>'occurredOn' DESC, data->>'createdAt' DESC, id"),
    pool.query<{ data: TargetRoleState }>("SELECT data FROM target_role_states ORDER BY role_id"),
  ]);
  const career = await readCareer(pool);
  const heads = await pool.query<{entity_type:string;entity_id:string;revision:number}>("SELECT entity_type,entity_id,revision FROM record_heads");
  const revision = (type:string,id:string) => heads.rows.find(row=>row.entity_type===type&&row.entity_id===id)?.revision ?? 0;
  return {
    revisions: career.revisions,
    companies: companies.rows.map(row => row.data), roles: roles.rows.map(row => row.data), sources: sources.rows.map(row => row.data),
    progress: progress.rows.map(row => row.data), assessments: assessments.rows.map(row => row.data),
    interviews: interviews.rows.map(row => ({...row.data,revision:revision("interview",row.data.id)})), debriefs: debriefs.rows.map(row => ({...row.data,revision:revision("debrief",row.data.id)})),
    roleStates: roleStates.rows.map(row => { const c=career.candidacies.find(item=>item.roleId===row.data.roleId); return c ? {...row.data, stage:boardStage(c.stage),detailedStage:c.stage,notes:c.pipelineNotes,updatedAt:c.updatedAt,revision:c.revision} : row.data; }),
  };
}

export async function mutateTargets(mutation: TargetMutation): Promise<TargetsState> {
  await ensureDb();
  if (["roleState", "interview", "debrief", "resolve"].includes(mutation.action)) {
    if (!mutation.meta) throw new CareerError("Reload this record before saving. A revision and retry key are required.", 428, "precondition_required");
    const commandResult = await executeCareerCommand(pool, {...mutation,meta:mutation.meta});
    return {...await getTargets(),commandResult};
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const now = new Date().toISOString();
    if (mutation.action !== "progress" && mutation.action !== "assessment") throw new TargetInputError("Unknown target action.");
    const roleResult = await client.query<{data:TargetRole}>("SELECT data FROM target_roles WHERE id=$1 FOR SHARE",[mutation.data.roleId]);
    const role=roleResult.rows[0]?.data;
    if(!role) throw new TargetInputError("This target role was not found.",404);
    if(mutation.action === "progress") {
      if(!role.steps.some(step=>step.id===mutation.data.itemId)) throw new TargetInputError("This checklist item does not belong to the selected role.");
      const data={...mutation.data,updatedAt:now};
      await client.query("INSERT INTO target_progress (role_id,item_id,data) VALUES ($1,$2,$3) ON CONFLICT (role_id,item_id) DO UPDATE SET data=EXCLUDED.data",[data.roleId,data.itemId,JSON.stringify(data)]);
    } else {
      if(!role.requirements.some(requirement=>requirement.id===mutation.data.requirementId)) throw new TargetInputError("This requirement does not belong to the selected role.");
      const data={...mutation.data,updatedAt:now};
      await client.query("INSERT INTO target_assessments (role_id,requirement_id,data) VALUES ($1,$2,$3) ON CONFLICT (role_id,requirement_id) DO UPDATE SET data=EXCLUDED.data",[data.roleId,data.requirementId,JSON.stringify(data)]);
    }
    await client.query("COMMIT");
  } catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  return getTargets();
}
