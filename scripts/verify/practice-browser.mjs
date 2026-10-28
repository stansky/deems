import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3141";
const ROLE_ID = "verification-practice-r5-role";
const STEP_ID = "verification-practice-r5-step";
const REQUIREMENT_TITLE = "Verification requirement";
const EVIDENCE = path.resolve("private/agent-runs/practice-20261027/W7");
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const checks = [];
const writes = [];
const prefix = `W7 browser practice ${new Date().toISOString()}`;
const longNotes = `${prefix}\n${"Preserve the visible draft and its source context through an uncertain save. ".repeat(70)}`;
const longCode = `# ${prefix}\n${"# verify durable notes, stable retries, and an exact origin\n".repeat(50)}def accept(tenant_id, key, prompt):\n    return (tenant_id, key, prompt)\n`;
const notesKey = "interview-draft-code-idempotency-python";
const routeUrl = `${BASE_URL}/?view=practice&exercise=code-idempotency&role=${ROLE_ID}&step=${STEP_ID}`;
let browser;

function check(ok, label) {
  assert.ok(ok, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function assertCandidate(url) {
  assert.equal(new URL(url).origin, BASE_URL, `Refusing navigation or request outside ${BASE_URL}`);
}

async function settled(page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
}

async function shot(page, name) {
  await settled(page);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: false, animations: "disabled" });
}

async function frameTarget(page, locator, label) {
  await locator.waitFor({ state: "visible" });
  await settled(page);
  await locator.evaluate(element => {
    const top = element.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: "instant" });
  });
  const geometry = await locator.evaluate(element => new Promise(resolve => {
    let previous;
    let stableFrames = 0;
    let frames = 0;
    const sample = () => {
      const rect = element.getBoundingClientRect();
      const current = { top: rect.top, height: rect.height };
      if (previous && Math.abs(current.top - previous.top) <= 0.5 && Math.abs(current.height - previous.height) <= 0.5) stableFrames += 1;
      else stableFrames = 0;
      previous = current;
      frames += 1;
      if (stableFrames >= 2 || frames >= 60) resolve({ ...current, stableFrames, frames });
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  check(geometry.stableFrames >= 2 && Math.abs(geometry.top - 16) <= 2,
    `${label} is positioned at the viewport top with stable geometry (top=${geometry.top}, frames=${geometry.frames})`);
  return geometry;
}

function guardContext(context) {
  context.setDefaultTimeout(12000);
  context.on("request", request => {
    assertCandidate(request.url());
    if (!new Set(["GET", "HEAD", "OPTIONS"]).has(request.method())) {
      writes.push({ method: request.method(), path: new URL(request.url()).pathname });
    }
  });
  context.route("**/*", async route => {
    assertCandidate(route.request().url());
    await route.continue();
  });
}

async function getJson(context, pathname) {
  const url = `${BASE_URL}${pathname}`;
  assertCandidate(url);
  const response = await context.request.get(url, { timeout: 12000 });
  assert.equal(response.status(), 200, `GET ${pathname}`);
  return response.json();
}

async function postWorkspace(context, data) {
  const url = `${BASE_URL}/api/workspace`;
  assertCandidate(url);
  const response = await context.request.post(url, { data, timeout: 12000 });
  assert.equal(response.status(), 200, "POST /api/workspace disposable fixture seed");
  writes.push({ method: "POST", path: "/api/workspace", fixture: data.action });
  return response.json();
}

async function captureState(context) {
  const [workspace, targets] = await Promise.all([getJson(context, "/api/workspace"), getJson(context, "/api/targets")]);
  return { workspace, targets };
}

async function main() {
  assert.equal(process.env.PRACTICE_BROWSER_CANDIDATE_READY, "1", "Wait for O's explicit candidate-ready signal before setting PRACTICE_BROWSER_CANDIDATE_READY=1.");
  assert.equal(new URL(BASE_URL).origin, "http://127.0.0.1:3141");
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: desktop, timezoneId: "America/Los_Angeles" });
  guardContext(context);
  const initial = await captureState(context);
  const reviewCardId = "f01";
  const existingReview = initial.workspace.reviews.find(item => item.cardId === reviewCardId);
  if (!existingReview) {
    await postWorkspace(context, { action: "review", data: { cardId: reviewCardId, rating: "good", reviewedAt: new Date().toISOString() } });
  } else {
    assert.ok(existingReview.fsrs, "existing f01 state is a valid FSRS record; leave it untouched");
  }
  const existingLegacyFixture = initial.workspace.sessions.find(item => item.id.startsWith("verification-practice-browser-legacy-") && item.notes.startsWith("W7 browser practice "));
  const legacySessionId = existingLegacyFixture?.id ?? `verification-practice-browser-legacy-${Date.now()}`;
  const legacySessionNotes = existingLegacyFixture?.notes ?? `${prefix} legacy session notes`;
  if (!existingLegacyFixture) {
    assert.ok(!initial.workspace.sessions.some(item => item.id === legacySessionId), "owned legacy session fixture ID is unused");
    await postWorkspace(context, { action: "session", data: {
      id: legacySessionId, exerciseId: "code-idempotency", mode: "Mock",
      notes: legacySessionNotes, code: `# ${prefix} legacy work`, elapsed: 73,
      completedAt: new Date().toISOString(), selfReview: `${prefix} legacy reflection`,
    } });
  }
  const before = await captureState(context);
  const seededReview = before.workspace.reviews.find(item => item.cardId === reviewCardId);
  assert.ok(seededReview?.fsrs, "synthetic FSRS review fixture was persisted");
  check(true, "seeded one isolated FSRS review and one legacy session fixture");
  const role = before.targets.roles.find(item => item.id === ROLE_ID);
  assert.ok(role, "W7 verification role exists in the disposable candidate");
  const step = role.steps.find(item => item.id === STEP_ID);
  assert.ok(step?.resources.some(item => item.kind === "exercise" && item.id === "code-idempotency"), "verification plan step links to the selected exercise");
  const beforeReviews = canonical(before.workspace.reviews);
  const beforeAssessments = canonical(before.targets.assessments);
  const beforeProgress = canonical(before.targets.progress);
  const beforeRoleStates = canonical(before.targets.roleStates);
  const beforeApplications = canonical(before.workspace.applications);
  const oldSessions = before.workspace.sessions;
  check(true, "captured disposable candidate workspace and role-plan baseline");

  await context.addInitScript(({ key, text, code }) => {
    if (localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, JSON.stringify({
      notes: text, code, selfReview: "Legacy draft reflection, kept until explicitly bound.", elapsed: 73,
      hints: 0, solutionSeen: false, coachUsed: false, mode: "Mock", checks: [], otherHelp: "unknown",
      assistanceNote: "", observedResult: "", limitations: "", nextAction: "Resume the draft after binding.",
      origin: null, pendingSave: null, savedAttemptId: null, pendingAttachments: {},
    }));
  }, { key: notesKey, text: longNotes, code: longCode });
  const page = await context.newPage();
  assertCandidate(routeUrl);
  await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.getByRole("heading", { name: "Practice", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Idempotent run creation", exact: true }).waitFor();
  const legacySession = page.locator(".saved-sessions details").filter({ hasText: legacySessionNotes });
  await legacySession.locator("summary").click();
  await legacySession.getByText("Unknown provenance. This legacy session has no structured practice evidence.", { exact: true }).waitFor();
  check(await legacySession.getByText(legacySessionNotes, { exact: true }).isVisible(), "existing legacy session remains visible as unstructured evidence in the practice UI");
  await page.getByRole("region", { name: "Practice plan choice" }).waitFor();
  check(await page.getByText("This draft has a different or unknown plan origin.").isVisible(), "legacy draft origin is not silently reassigned to the launching role");
  check(await page.locator("#practice-notes").inputValue() === longNotes, "legacy long-text draft survives the plan launch");

  const language = page.getByLabel("Coding language");
  await language.selectOption("javascript");
  await page.locator("#practice-notes").waitFor();
  check(await page.locator("#practice-notes").inputValue() === "", "switching language opens its separate draft instead of copying Python notes");
  const pythonDraft = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), notesKey);
  check(pythonDraft?.notes === longNotes && pythonDraft?.origin === null, "language switch leaves the legacy Python draft and origin unchanged");
  await language.selectOption("python");
  await page.getByRole("region", { name: "Practice plan choice" }).waitFor();
  check(await page.locator("#practice-notes").inputValue() === longNotes, "switching back restores the original Python draft");
  await page.getByRole("button", { name: "Use this plan step" }).click();
  await page.getByRole("region", { name: "Practice origin" }).getByText("Verification only", { exact: true }).waitFor();
  await page.getByRole("region", { name: "Practice origin" }).getByText("Verification step", { exact: true }).waitFor();
  check(await page.locator("#practice-notes").inputValue() === longNotes, "explicit plan binding changes origin while retaining the draft");
  await page.waitForFunction(({ key, roleId }) => JSON.parse(localStorage.getItem(key) ?? "null")?.origin?.roleId === roleId, { key: notesKey, roleId: ROLE_ID });
  check(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.origin?.roleId, notesKey) === ROLE_ID, "bound plan role persists in the draft");

  await page.locator(".mode-toggle").getByRole("button", { name: "Coach" }).click();
  await page.getByRole("button", { name: /Reveal hint/ }).click();
  await page.getByLabel("Other help").selectOption("ai");
  await page.getByLabel("Observed result").fill(`${prefix}: manually traced the duplicate-key path.`);
  await page.getByLabel("Limitations").fill("No code was run; only the written response was reviewed.");
  await page.getByLabel(/Next action/).fill("Add tests for tenant isolation and the changed-prompt conflict.");
  const editor = page.locator(".cm-content[contenteditable='true']").first();
  await editor.fill(longCode);
  await page.locator("#practice-notes").fill(longNotes);
  await shot(page, "practice-bound-draft-desktop.png");

  const failedRequests = [];
  const retryBodies = [];
  const injectOneFailure = async route => {
    const request = route.request();
    assertCandidate(request.url());
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/practice" && failedRequests.length === 0) {
      failedRequests.push(JSON.parse(request.postData() ?? "{}"));
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "W7 injected disposable candidate failure" }) });
      return;
    }
    await route.continue();
  };
  await context.route("**/api/practice", injectOneFailure);
  await page.getByRole("button", { name: "Finish & save session" }).click();
  await page.getByRole("alert").filter({ hasText: "The save was not confirmed" }).waitFor();
  check(failedRequests.length === 1 && failedRequests[0]?.action === "save", "candidate-only transient failure intercepted one save");
  check(await page.locator("#practice-notes").inputValue() === longNotes, "failed save retains long notes");
  const displayedCode = await page.locator(".cm-content").first().innerText();
  const requestCodeMatches = failedRequests[0]?.data?.code === longCode;
  const displayedCodeMatches = displayedCode.trimEnd() === longCode.trimEnd();
  check(requestCodeMatches && displayedCodeMatches, `failed save retains full code (requestMatches=${requestCodeMatches}, displayMatches=${displayedCodeMatches}, renderedLength=${displayedCode.length}, expectedLength=${longCode.length})`);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.pendingSave?.action === "save", notesKey, { timeout: 5000 });
  const pendingDraft = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null"), notesKey);
  const requestOrigin = failedRequests[0]?.data?.origin;
  check(requestOrigin?.roleId === ROLE_ID && requestOrigin?.planStepId === STEP_ID && pendingDraft?.pendingSave?.data?.origin?.roleId === ROLE_ID && pendingDraft?.pendingSave?.data?.origin?.planStepId === STEP_ID,
    `pending retry retains the explicitly selected role and step (request=${JSON.stringify(requestOrigin)}, draft=${JSON.stringify(pendingDraft?.pendingSave?.data?.origin)})`);
  await shot(page, "practice-save-failure-draft-desktop.png");
  await context.unroute("**/api/practice", injectOneFailure);

  page.on("request", request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/practice") retryBodies.push(JSON.parse(request.postData() ?? "{}"));
  });
  await page.getByRole("button", { name: "Retry saved command" }).click();
  await page.getByText("This saved attempt is immutable.", { exact: true }).waitFor();
  const retry = retryBodies.find(body => body?.action === "save");
  assert.ok(retry, "successful retry POST was captured");
  check(failedRequests.length === 1 && failedRequests[0].meta?.key === retry.meta?.key && failedRequests[0].meta?.expectedRevision === retry.meta?.expectedRevision && canonical(failedRequests[0].data) === canonical(retry.data), "save retry reuses the exact command key, revision and input");
  const attemptId = retry.data.id;
  const afterSave = await captureState(context);
  const savedAttempt = afterSave.workspace.practiceAttempts?.find(item => item.sessionId === attemptId);
  assert.ok(savedAttempt, "structured attempt appears in a fresh workspace read");
  check(savedAttempt.origin?.roleId === ROLE_ID && savedAttempt.origin.planStepId === STEP_ID, "saved attempt reload returns to the exact role and step");
  check(savedAttempt.assistance.hintsRevealed === 1 && savedAttempt.assistance.otherHelp === "ai" && !savedAttempt.assistance.referenceSolutionViewed, "saved assistance matches the user-visible disclosure");
  check(savedAttempt.assessment.source === "self_report" && savedAttempt.assessment.execution === "not_run", "saved assessment remains labeled self-report and not run");
  check(afterSave.workspace.sessions.find(item => item.id === attemptId)?.notes === longNotes, "legacy-compatible session stores the complete long notes");
  check(afterSave.workspace.sessions.find(item => item.id === attemptId)?.code === longCode, "legacy-compatible session stores the complete code");
  const priorSessionsAfterSave = afterSave.workspace.sessions.filter(item => item.id !== attemptId).slice().sort((a, b) => a.id.localeCompare(b.id));
  const priorSessionsBeforeSave = oldSessions.slice().sort((a, b) => a.id.localeCompare(b.id));
  check(canonical(priorSessionsAfterSave) === canonical(priorSessionsBeforeSave), "all pre-existing session rows, including the visible legacy fixture, remain unchanged and readable");
  check(canonical(afterSave.workspace.reviews) === beforeReviews && canonical(afterSave.workspace.reviews.find(item => item.cardId === reviewCardId)) === canonical(seededReview), "seeded FSRS review state remains unchanged after a practice save");
  check(canonical(afterSave.workspace.applications) === beforeApplications, "career applications remain unchanged after a practice save");
  check(canonical(afterSave.targets.progress) === beforeProgress && canonical(afterSave.targets.assessments) === beforeAssessments && canonical(afterSave.targets.roleStates) === beforeRoleStates, "practice save does not update plan progress, requirement readiness or candidacy state");

  await page.waitForFunction(({ key, id }) => {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value?.savedAttemptId === id && value?.pendingSave === null;
  }, { key: notesKey, id: attemptId });
  const targetsReload = page.waitForResponse(response => new URL(response.url()).pathname === "/api/targets" && response.status() === 200);
  const workspaceReload = page.waitForResponse(response => new URL(response.url()).pathname === "/api/workspace" && response.status() === 200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await Promise.all([targetsReload, workspaceReload]);
  await settled(page);
  await shot(page, "practice-reload-origin-desktop.png");
  const reloadOriginText = await page.locator(".practice-origin").innerText().catch(() => "origin bar missing");
  console.log(`INFO reload origin bar: ${reloadOriginText.replace(/\n/g, " | ")}`);
  await page.getByRole("region", { name: "Practice origin" }).getByText("Verification step", { exact: true }).waitFor();
  await page.getByText("This saved attempt is immutable.", { exact: true }).waitFor();
  const currentAttemptDetails = page.locator(".saved-practice-attempt").filter({ hasText: prefix });
  check(await currentAttemptDetails.getByText("SAVED PRACTICE ATTEMPT", { exact: true }).isVisible(), "saved evidence and role origin survive a full page reload");
  await currentAttemptDetails.getByLabel("Choose a requirement").selectOption({ label: REQUIREMENT_TITLE });
  await currentAttemptDetails.getByRole("button", { name: "Attach attempt" }).click();
  await currentAttemptDetails.getByText("Currently attached", { exact: true }).waitFor();
  const afterAttach = await captureState(context);
  const attachedAttempt = afterAttach.workspace.practiceAttempts?.find(item => item.sessionId === attemptId);
  check(attachedAttempt?.attachment?.requirementId === `${ROLE_ID.replace(/role$/, "requirement")}`, "user explicitly attaches evidence to the selected role requirement");
  check(canonical(afterAttach.targets.progress) === beforeProgress && canonical(afterAttach.targets.assessments) === beforeAssessments && canonical(afterAttach.targets.roleStates) === beforeRoleStates, "explicit evidence attachment does not mark progress, readiness or candidacy complete");
  check(canonical(afterAttach.workspace.reviews) === beforeReviews && canonical(afterAttach.workspace.reviews.find(item => item.cardId === reviewCardId)) === canonical(seededReview), "explicit evidence attachment leaves the seeded FSRS review state unchanged");

  const desktopEvidence = currentAttemptDetails.locator(".saved-attempt-evidence");
  await frameTarget(page, desktopEvidence, "desktop saved evidence panel");
  await shot(page, "practice-attached-evidence-desktop.png");
  await desktopEvidence.screenshot({ path: path.join(EVIDENCE, "practice-attempt-evidence-card-desktop.png"), animations: "disabled" });
  await page.locator(".practice-origin").getByRole("button", { name: "Back to plan step" }).click();
  await page.getByRole("heading", { name: "Interviews", exact: true }).waitFor();
  await page.locator(`#plan-step-${ROLE_ID}-${STEP_ID}`).waitFor();
  check(new URL(page.url()).searchParams.get("role") === ROLE_ID && new URL(page.url()).searchParams.get("step") === STEP_ID, "back-to-plan returns to the exact originating role step");
  check(await page.locator(`#plan-step-${ROLE_ID}-${STEP_ID}`).getByRole("button", { name: /Idempotent run creation/ }).count() === 1, "returned plan step retains its exercise resource");
  await shot(page, "practice-return-role-step-desktop.png");

  await page.setViewportSize(mobile);
  await page.goto(routeUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("region", { name: "Practice origin" }).getByText("Verification step", { exact: true }).waitFor();
  await page.getByText("This saved attempt is immutable.", { exact: true }).waitFor();
  const mobileAttemptDetails = page.locator(".saved-practice-attempt").filter({ hasText: prefix });
  const mobileEvidence = mobileAttemptDetails.locator(".saved-attempt-evidence");
  await mobileAttemptDetails.getByText("Currently attached", { exact: true }).waitFor();
  await frameTarget(page, mobileEvidence, "mobile saved evidence panel");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "practice evidence has no horizontal overflow at 390px");
  await shot(page, "practice-attached-evidence-mobile-390x844.png");
  await mobileEvidence.screenshot({ path: path.join(EVIDENCE, "practice-attempt-evidence-card-mobile-390x844.png"), animations: "disabled" });
  const mobileAttachment = mobileAttemptDetails.locator(".saved-attempt-attach");
  await frameTarget(page, mobileAttachment, "mobile requirement attachment panel");
  await shot(page, "practice-attachment-panel-mobile-390x844.png");
  await page.locator(".practice-origin").getByRole("button", { name: "Back to plan step" }).click();
  await page.locator(`#plan-step-${ROLE_ID}-${STEP_ID}`).waitFor();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "return role plan has no horizontal overflow at 390px");
  await shot(page, "practice-return-role-step-mobile-390x844.png");

  await writeFile(path.join(EVIDENCE, "practice-browser.json"), `${JSON.stringify({
    result: "passed", candidate: BASE_URL, checks, checkCount: checks.length, attemptId, exerciseId: savedAttempt.exerciseId,
    roleId: ROLE_ID, planStepId: STEP_ID, requirementId: attachedAttempt.attachment.requirementId,
    legacySessionId, reviewCardId,
    screenshots: ["practice-bound-draft-desktop.png", "practice-save-failure-draft-desktop.png", "practice-reload-origin-desktop.png", "practice-attached-evidence-desktop.png", "practice-attempt-evidence-card-desktop.png", "practice-return-role-step-desktop.png", "practice-attached-evidence-mobile-390x844.png", "practice-attempt-evidence-card-mobile-390x844.png", "practice-attachment-panel-mobile-390x844.png", "practice-return-role-step-mobile-390x844.png"],
    writes, providerCalls: 0, codeExecution: 0,
  }, null, 2)}\n`, { mode: 0o600 });
  console.log(`RESULT passed checks=${checks.length} attempt=${attemptId}`);
  await context.close();
  await browser.close();
}

main().catch(async error => {
  console.error(error);
  if (browser) await browser.close().catch(() => undefined);
  process.exitCode = 1;
});
