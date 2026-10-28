import { desc, eq, sql } from "drizzle-orm";
import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";
import { db, ensureDb, pool } from "./db";
import { executeCareerCommand, readCareer, CareerError } from "@/domains/career/service";
import * as schema from "./schema";
import { mutationSchema } from "./validation";
import { flashcards, exercises } from "@/data/prep";
import type { WorkspaceState } from "./types";
import type { z } from "zod";

export async function getWorkspace(): Promise<WorkspaceState> {
  await ensureDb();
  const [applications, activities, reviews, sessions, notes, settings, documents] = await Promise.all([
    db.select().from(schema.applications).orderBy(schema.applications.id),
    db.select().from(schema.activities).orderBy(desc(schema.activities.createdAt)),
    db.select().from(schema.reviews), db.select().from(schema.sessions).orderBy(desc(schema.sessions.completedAt)),
    db.select().from(schema.notes), db.select().from(schema.settings),
    db.select().from(schema.documents).orderBy(desc(schema.documents.capturedAt)),
  ]);
  const career = await readCareer(pool);
  const noteHeads = await pool.query<{entity_id:string;revision:number}>("SELECT entity_id,revision FROM record_heads WHERE entity_type='note'");
  return {
    noteRevisions: Object.fromEntries(noteHeads.rows.map(row=>[row.entity_id,row.revision])),
    careerRevisions: career.revisions,
    applications: applications.map(row=>{const c=career.candidacies.find(item=>item.applicationId===row.id);return {...row,stage:c?.stage??row.stage,notes:c?.notes??row.notes,nextAction:c?.nextAction??row.nextAction,revision:c?.revision??0,updatedAt:c?.updatedAt??row.updatedAt.toISOString()};}),
    activities: activities.map(row=>({...row,createdAt:row.createdAt.toISOString()})),
    reviews: reviews.map(row=>({...row,rating:row.rating as "again"|"good",reviewedAt:row.reviewedAt.toISOString(),dueAt:row.dueAt.toISOString()})),
    sessions: sessions.map(row=>({...row,completedAt:row.completedAt.toISOString()})),
    notes:Object.fromEntries(notes.map(row=>[row.key,row.value])), settings:Object.fromEntries(settings.map(row=>[row.key,row.value])),
    documents:documents.map(row=>({...row,capturedAt:row.capturedAt.toISOString()})),
  };
}

export async function mutateWorkspace(mutation:z.infer<typeof mutationSchema>) {
  await ensureDb();
  if (mutation.action === "application" || mutation.action === "note") {
    if (!mutation.meta) throw new CareerError("Reload this record before saving. A revision and retry key are required.",428,"precondition_required");
    const commandResult = await executeCareerCommand(pool,{...mutation,meta:mutation.meta});
    return {...await getWorkspace(),commandResult};
  }
  switch(mutation.action) {
    case "activity": {
      const data={...mutation.data,createdAt:new Date(mutation.data.createdAt)};
      await db.insert(schema.activities).values(data).onConflictDoNothing(); break;
    }
    case "review": {
      if(!flashcards.some(card=>card.id===mutation.data.cardId)) throw new Error("Unknown flashcard");
      await db.transaction(async tx=>{
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${mutation.data.cardId}))`);
      const [previous] = await tx.select().from(schema.reviews).where(eq(schema.reviews.cardId,mutation.data.cardId));
      const now=new Date();
      const stored=previous?.fsrs as Card | undefined;
      const card=stored ? {...stored,due:new Date(stored.due),last_review:stored.last_review?new Date(stored.last_review):undefined} : createEmptyCard(now);
      const result=fsrs({enable_fuzz:false}).next(card,now,mutation.data.rating==="again"?Rating.Again:Rating.Good);
      const data={cardId:mutation.data.cardId,rating:mutation.data.rating,reviewedAt:now,dueAt:result.card.due,fsrs:result.card};
      await tx.insert(schema.reviews).values(data).onConflictDoUpdate({target:schema.reviews.cardId,set:data});
      }); break;
    }
    case "session": {
      if(!exercises.some(exercise=>exercise.id===mutation.data.exerciseId)) throw new Error("Unknown exercise");
      const data={...mutation.data,completedAt:new Date(mutation.data.completedAt)};
      await db.insert(schema.sessions).values(data).onConflictDoUpdate({target:schema.sessions.id,set:data}); break;
    }
    case "setting": {
      await db.insert(schema.settings).values(mutation.data).onConflictDoUpdate({target:schema.settings.key,set:{value:mutation.data.value}}); break;
    }
    case "document": {
      await db.insert(schema.documents).values({...mutation.data,capturedAt:new Date()}).onConflictDoNothing(); break;
    }
  }
  return getWorkspace();
}
