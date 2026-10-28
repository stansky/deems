import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { exercises, flashcards } from "../src/data/prep";
import type { WorkspaceState } from "../src/lib/types";

const base = new URL(process.env.BASE_URL || "http://localhost:3042");
const runId = `qa-${randomUUID()}`;
const started = Date.now();
let checks = 0;

// This harness writes test records. Keep it away from the personal app address.
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Use an isolated loopback test server.");
assert.ok(base.port && !["80", "443"].includes(base.port), "Use an explicit test port, never the personal app port.");

const deadline = setTimeout(() => {
  console.error("FAIL: runtime verification exceeded its 120 second deadline.");
  process.exit(124);
}, 120_000);

function pass(label: string) {
  checks += 1;
  console.log(`PASS ${label}`);
}

async function request(path: string, init: RequestInit = {}) {
  const remaining = 115_000 - (Date.now() - started);
  assert.ok(remaining > 0, "Runtime verification deadline reached.");
  return fetch(new URL(path, base), {
    ...init,
    signal: AbortSignal.timeout(Math.min(12_000, remaining)),
  });
}

async function workspace(): Promise<WorkspaceState> {
  const response = await request("/api/workspace");
  assert.equal(response.status, 200, "Workspace must load.");
  return response.json();
}

async function mutate(action: string, data: unknown): Promise<WorkspaceState> {
  const response = await request("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify({ action, data }),
  });
  assert.equal(response.status, 200, `Mutation ${action} must succeed.`);
  return response.json();
}

async function main() {
  const health = await request("/api/health");
  assert.equal(health.status, 200, "Database health must pass.");
  assert.equal((await health.json()).database, "postgresql");
  const initial = await workspace();
  assert.ok(Array.isArray(initial.applications));
  pass("database health and workspace read");

  const application = {
    id: runId,
    roleId: "qa-role",
    company: "QA Example Company",
    title: "QA Senior Engineer",
    stage: "Interested",
    nextAction: "Run test follow-up",
    notes: "Synthetic record for isolated runtime verification.",
  };
  await mutate("application", application);
  assert.equal((await workspace()).applications.find(row => row.id === runId)?.stage, "Interested");
  await mutate("application", { ...application, stage: "Applied" });
  const afterStage = await workspace();
  assert.equal(afterStage.applications.find(row => row.id === runId)?.stage, "Applied");
  assert.ok(afterStage.activities.some(row => row.applicationId === runId && row.kind === "Stage change" && row.body.includes("Interested") && row.body.includes("Applied")), "Stage changes must preserve history.");
  pass("application create, stage update, and persisted history");

  const activityId = `${runId}-activity`;
  await mutate("activity", { id: activityId, applicationId: runId, kind: "Conversation", body: "Synthetic recruiter conversation.", createdAt: new Date().toISOString() });
  assert.equal((await workspace()).activities.find(row => row.id === activityId)?.body, "Synthetic recruiter conversation.");
  pass("conversation activity persistence");

  const noteValue = "Synthetic study note: explain assumptions before choosing a design.";
  await mutate("note", { key: runId, value: noteValue });
  assert.equal((await workspace()).notes[runId], noteValue);
  pass("study note persistence");

  assert.ok(exercises.length > 0 && flashcards.length > 0, "Prep content must include exercises and flashcards.");
  const sessionId = `${runId}-session`;
  await mutate("session", {
    id: sessionId,
    exerciseId: exercises[0].id,
    mode: "Coach",
    notes: "Synthetic session notes.",
    code: "print('qa')",
    elapsed: 120,
    completedAt: new Date().toISOString(),
    selfReview: "State the invariant before coding.",
  });
  const session = (await workspace()).sessions.find(row => row.id === sessionId);
  assert.equal(session?.exerciseId, exercises[0].id);
  assert.equal(session?.elapsed, 120);
  assert.equal(session?.code, "print('qa')");
  pass("practice session persistence");

  const cardId = flashcards[0].id;
  const suppliedDue = "2000-01-01T00:00:00.000Z";
  await mutate("review", { cardId, rating: "good", reviewedAt: new Date().toISOString(), dueAt: suppliedDue });
  const first = (await workspace()).reviews.find(row => row.cardId === cardId);
  assert.ok(first, "Reviewed card must persist.");
  assert.ok(Number.isFinite(Date.parse(first.dueAt)), "FSRS due date must be valid.");
  assert.notEqual(first.dueAt, suppliedDue, "The server must calculate scheduling.");
  assert.ok(Date.parse(first.dueAt) >= Date.parse(first.reviewedAt), "Due date must follow the review.");
  const firstState = first.fsrs as { reps?: number; due?: string };
  assert.ok(firstState && Number.isInteger(firstState.reps), "FSRS state must persist.");
  assert.equal(Date.parse(String(firstState.due)), Date.parse(first.dueAt));
  await mutate("review", { cardId, rating: "again", reviewedAt: new Date().toISOString() });
  const repeated = (await workspace()).reviews.filter(row => row.cardId === cardId);
  assert.equal(repeated.length, 1, "Review state must update without duplicate cards.");
  assert.equal(repeated[0].rating, "again");
  assert.equal((repeated[0].fsrs as { reps: number }).reps, Number(firstState.reps) + 1, "Repeated reviews must advance stored FSRS state.");
  pass("server-calculated FSRS schedule and repeated review state");

  const exported = await request("/api/export");
  assert.equal(exported.status, 200);
  assert.ok(exported.headers.get("content-disposition")?.includes("attachment"));
  const exportData = await exported.json() as { version: number; workspace: WorkspaceState };
  assert.equal(exportData.version, 1);
  assert.equal(exportData.workspace.notes[runId], noteValue);
  assert.ok(exportData.workspace.applications.some(row => row.id === runId));
  pass("JSON export includes persisted records");

  const resume = await request("/api/resume");
  assert.equal(resume.status, 200, "Test data directory must include a resume PDF fixture.");
  assert.ok(resume.headers.get("content-type")?.includes("application/pdf"));
  const pdf = new Uint8Array(await resume.arrayBuffer());
  assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
  pass("resume endpoint serves a PDF");

  const invalid = await request("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify({ action: "qa-invalid-action", data: {} }),
  });
  assert.equal(invalid.status, 400);
  const forbidden = await request("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://outside.invalid" },
    body: JSON.stringify({ action: "note", data: { key: `${runId}-forbidden`, value: "Must not save" } }),
  });
  assert.equal(forbidden.status, 403);
  assert.equal((await workspace()).notes[`${runId}-forbidden`], undefined);
  pass("invalid action rejection and cross-origin write rejection");

  console.log(`Verified ${checks} runtime checks in ${Date.now() - started}ms. Synthetic records remain in the isolated test database.`);
}

main().catch(error => {
  console.error(`FAIL: ${error instanceof Error ? error.message : "Runtime verification failed."}`);
  process.exitCode = 1;
}).finally(() => clearTimeout(deadline));
