import assert from "node:assert/strict";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

// This browser check writes only to the disposable candidate listener on port 3042.
const BASE_URL = "http://127.0.0.1:3042";
const EVIDENCE = path.resolve("private/agent-runs/20261027T181950Z/W6/learning");
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const checks = [];
const writes = [];
let activeBrowser;

function check(ok, label) {
  assert.ok(ok, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

function assertCandidate(url) {
  assert.equal(new URL(url).origin, BASE_URL, `Refusing navigation or request outside ${BASE_URL}`);
}

async function settled(page) {
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function shot(page, name) {
  await settled(page);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: false, animations: "disabled" });
}

function guardContext(context) {
  context.setDefaultTimeout(10000);
  context.on("request", request => {
    assertCandidate(request.url());
    if (request.method() !== "GET" && request.method() !== "HEAD" && request.method() !== "OPTIONS") {
      const pathname = new URL(request.url()).pathname;
      assert.notEqual(pathname, "/api/coach", "Provider coaching requests are disabled in this verification.");
      writes.push({ method: request.method(), path: pathname });
    }
  });
  context.route("**/*", async route => {
    const request = route.request();
    assertCandidate(request.url());
    assert(!(request.method() !== "GET" && new URL(request.url()).pathname === "/api/coach"), "Provider coaching requests are disabled in this verification.");
    await route.continue();
  });
}

async function apiJson(context, suffix) {
  const url = `${BASE_URL}${suffix}`;
  assertCandidate(url);
  const response = await context.request.get(url, { timeout: 12000 });
  assert.equal(response.status(), 200, `GET ${suffix}`);
  return response.json();
}

async function navigate(page, label) {
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.locator(".sidebar .nav-item").filter({ hasText: label }).first().click();
  await settled(page);
}

async function openQuestion(page, title) {
  await navigate(page, "Algorithms");
  await page.locator(".algorithm-index button").filter({ hasText: title }).click();
  await page.locator(".algorithm-question h2").waitFor();
  assert.equal(await page.locator(".algorithm-question h2").innerText(), title);
  await settled(page);
}

async function captureOnly() {
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({ viewport: desktop });
  guardContext(context);
  const page = await context.newPage();
  assertCandidate(BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  const [algorithmsPayload, workspace] = await Promise.all([
    apiJson(context, "/api/algorithms"),
    apiJson(context, "/api/workspace"),
  ]);
  const question = algorithmsPayload.questions.find(item => (workspace.notes?.[`algorithm:${item.id}`] ?? "").startsWith("W6 learning QA "));
  assert.ok(question, "candidate contains a W6-owned algorithm note to capture read-only");
  await openQuestion(page, question.title);
  const history = page.locator(".algorithm-approach > details.target-history-section");
  if (!(await history.evaluate(node => node.open))) await history.locator(":scope > summary").click();
  await page.locator(".algorithm-approach textarea").evaluate(node => node.scrollIntoView({ block: "center" }));
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "desktop Algorithms has no horizontal page overflow");
  await shot(page, "algorithms-note-saved-desktop.png");
  await navigate(page, "Reference");
  await page.locator(".reference-reader h2").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "reference-desktop.png");

  const mobileContext = await browser.newContext({ viewport: mobile });
  guardContext(mobileContext);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await openQuestion(mobilePage, question.title);
  await mobilePage.locator(".algorithm-approach textarea").evaluate(node => node.scrollIntoView({ block: "center" }));
  await mobilePage.evaluate(() => window.scrollBy(0, -60));
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Algorithms has no horizontal page overflow");
  await shot(mobilePage, "algorithms-mobile-390x844.png");
  await navigate(mobilePage, "Reference");
  await mobilePage.locator(".reference-reader h2").waitFor();
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Reference has no horizontal page overflow");
  await shot(mobilePage, "reference-mobile-390x844.png");
  await mobileContext.close();
  await context.close();
  await browser.close();
  await writeFile(path.join(EVIDENCE, "capture-only.json"), `${JSON.stringify({ candidate: BASE_URL, questionId: question.id, noteKey: `algorithm:${question.id}`, viewportOnly: true, writes: [], screenshots: ["algorithms-note-saved-desktop.png", "reference-desktop.png", "algorithms-mobile-390x844.png", "reference-mobile-390x844.png"] }, null, 2)}\n`, { mode: 0o600 });
  await chmod(EVIDENCE, 0o700);
}

async function main() {
  assert.equal(process.env.LEARNING_CANDIDATE_READY, "1", "Wait for O to confirm the rebuilt learning candidate, then set LEARNING_CANDIDATE_READY=1.");
  assert.equal(new URL(BASE_URL).origin, "http://127.0.0.1:3042");
  if (process.env.LEARNING_CAPTURE_ONLY === "1") {
    await captureOnly();
    return;
  }
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  activeBrowser = browser;
  const contextA = await browser.newContext({ viewport: desktop });
  guardContext(contextA);
  const pageA = await contextA.newPage();
  console.log("STEP open disposable learning candidate");
  assertCandidate(BASE_URL);
  await pageA.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await settled(pageA);

  const [algorithmsPayload, workspaceBefore] = await Promise.all([
    apiJson(contextA, "/api/algorithms"),
    apiJson(contextA, "/api/workspace"),
  ]);
  assert.ok(Array.isArray(algorithmsPayload.questions) && algorithmsPayload.questions.length > 0, "candidate question bank is readable");
  const reusedQuestion = algorithmsPayload.questions.find(item => (workspaceBefore.notes?.[`algorithm:${item.id}`] ?? "").startsWith("W6 learning QA "));
  const question = reusedQuestion ?? algorithmsPayload.questions.find(item => {
    const key = `algorithm:${item.id}`;
    return (workspaceBefore.noteRevisions?.[key] ?? 0) === 0 && !workspaceBefore.notes?.[key];
  });
  assert.ok(question, "candidate has an unused or W6-owned algorithm note for isolated revision verification");
  const noteKey = `algorithm:${question.id}`;
  const startingRevision = workspaceBefore.noteRevisions?.[noteKey] ?? 0;
  const baselineText = `W6 learning QA ${Date.now()} approach. ${"Trace the input, keep the needed state, and verify each branch. ".repeat(9)}`;
  const competingText = `W6 learning QA concurrent saved version ${Date.now()}. Keep the saved snapshot visible while another tab retains its draft.`;
  const draftText = `W6 learning QA retained draft ${Date.now()}. Compare each input, update the state, then check the final result.`;

  console.log(`STEP save note for algorithm ${question.id}`);
  await openQuestion(pageA, question.title);
  const approach = pageA.locator(".algorithm-approach textarea");
  check(await approach.count() === 1, "selected algorithm exposes one approach field");
  await approach.fill(baselineText);
  const notePosts = [];
  const captureNotePost = request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/workspace") {
      const body = request.postDataJSON();
      if (body?.action === "note" && body?.data?.key === noteKey) notePosts.push(body);
    }
  };
  pageA.on("request", captureNotePost);
  await pageA.getByRole("button", { name: "Save notes", exact: true }).click();
  await settled(pageA);
  let workspaceAfter = await apiJson(contextA, "/api/workspace");
  const firstRevision = workspaceAfter.noteRevisions?.[noteKey] ?? 0;
  check(workspaceAfter.notes?.[noteKey] === baselineText && firstRevision === startingRevision + 1, "algorithm note saves through UI and advances one revision");
  check(notePosts.length === 1 && notePosts[0].meta?.expectedRevision === startingRevision && notePosts[0].meta?.key, "algorithm note save sends revision metadata and retry key");
  check((workspaceAfter.careerRevisions ?? []).some(item => item.entityType === "note" && item.entityId === noteKey && item.revision === firstRevision && item.content?.value === baselineText), "algorithm note history contains the saved text");
  const noteHistory = pageA.locator(".algorithm-approach > details.target-history-section");
  await noteHistory.locator(":scope > summary").click();
  check(await noteHistory.getByText(`Revision ${firstRevision}`, { exact: false }).count() === 1 && await noteHistory.getByText(baselineText, { exact: true }).count() === 1, "Saved note history displays the new revision content");
  await shot(pageA, "algorithms-note-history-desktop.png");

  console.log("STEP reload and retain a second-tab draft");
  await pageA.reload({ waitUntil: "domcontentloaded" });
  await openQuestion(pageA, question.title);
  await shot(pageA, "algorithm-note-after-reload-debug.png");
  const approachAfterReload = pageA.locator(".algorithm-approach textarea");
  const reloadedControl = await approachAfterReload.evaluate(control => ({ labels: Array.from(control.labels ?? []).map(label => label.innerText), outerHTML: control.outerHTML }));
  console.log(`DOM reloaded approach ${JSON.stringify(reloadedControl)}`);
  check(await approachAfterReload.inputValue() === baselineText, "algorithm note survives reload");
  await approachAfterReload.fill(draftText);
  const postsBeforeConflict = notePosts.length;

  console.log("STEP advance note revision from independent context");
  const contextB = await browser.newContext({ viewport: desktop });
  guardContext(contextB);
  const pageB = await contextB.newPage();
  await pageB.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await openQuestion(pageB, question.title);
  const currentB = await apiJson(contextB, "/api/workspace");
  check(currentB.noteRevisions?.[noteKey] === firstRevision, "independent editor loaded the current note revision");
  const competingResponse = await contextB.request.post(`${BASE_URL}/api/workspace`, {
    headers: { "content-type": "application/json", origin: BASE_URL },
    data: {
      action: "note",
      data: { key: noteKey, value: competingText },
      meta: { expectedRevision: firstRevision, producer: "w6-learning-qa", key: `w6-learning-${randomUUID()}` },
    },
    timeout: 15000,
  });
  assertCandidate(`${BASE_URL}/api/workspace`);
  assert.equal(competingResponse.status(), 200, "independent candidate note revision save");
  writes.push({ method: "POST", path: "/api/workspace", action: "note", source: "second-context API" });
  const competingResult = await competingResponse.json();
  check(competingResult.commandResult?.revision === firstRevision + 1, "competing note save advances one revision");

  await pageA.reload({ waitUntil: "domcontentloaded" });
  await openQuestion(pageA, question.title);
  const review = pageA.locator(".algorithm-approach .notice");
  check(await review.isVisible(), "stale algorithm draft requires explicit review");
  check(await review.locator("pre").innerText() === competingText, "stale review shows current saved text");
  check(await approachAfterReload.inputValue() === draftText, "stale review retains the local draft");
  check(notePosts.length === postsBeforeConflict, "reload and stale review do not save the draft automatically");
  await shot(pageA, "algorithms-stale-review-desktop.png");
  await review.getByRole("button", { name: "Use current revision for my draft" }).click();
  check(await approachAfterReload.inputValue() === draftText, "explicit revision acceptance keeps the local draft");
  await pageA.getByRole("button", { name: "Save notes", exact: true }).click();
  await settled(pageA);
  workspaceAfter = await apiJson(contextA, "/api/workspace");
  check(workspaceAfter.notes?.[noteKey] === draftText && workspaceAfter.noteRevisions?.[noteKey] === firstRevision + 2, "accepted algorithm draft retries against the refreshed revision");
  check(notePosts.length === postsBeforeConflict + 1 && notePosts.at(-1)?.meta?.expectedRevision === firstRevision + 1, "accepted retry sends the refreshed expected revision");
  const finalHistory = (workspaceAfter.careerRevisions ?? []).filter(item => item.entityType === "note" && item.entityId === noteKey).sort((a, b) => a.revision - b.revision);
  check(finalHistory.at(-3)?.content?.value === baselineText && finalHistory.at(-2)?.content?.value === competingText && finalHistory.at(-1)?.content?.value === draftText, "API history retains the sequential baseline, competing, and accepted draft snapshots");
  const savedHistory = pageA.locator(".algorithm-approach > details.target-history-section");
  if (!(await savedHistory.evaluate(node => node.open))) await savedHistory.locator(":scope > summary").click();
  check(await savedHistory.getByText(`Revision ${firstRevision + 2}`, { exact: false }).count() === 1 && await savedHistory.getByText(draftText, { exact: true }).count() === 1, "readable note history displays the latest content");
  await shot(pageA, "algorithms-note-saved-desktop.png");

  console.log("STEP inspect Reference API and reader");
  const knowledgePayload = await apiJson(contextA, "/api/knowledge");
  check(Array.isArray(knowledgePayload.entries) && knowledgePayload.entries.length > 0 && knowledgePayload.total === knowledgePayload.entries.length, "Reference Zod-backed API returns a nonempty entry list");
  await navigate(pageA, "Reference");
  await pageA.locator(".reference-reader").waitFor();
  check(await pageA.getByRole("heading", { name: "Reference", exact: true }).count() === 1, "Reference view renders its reader");
  check(await pageA.locator(".reference-reader h2").innerText() === knowledgePayload.entries[0].title, "Reference reader matches the first API entry");
  await shot(pageA, "reference-desktop.png");

  console.log("STEP mobile learning and Reference captures");
  const mobileContext = await browser.newContext({ viewport: mobile });
  guardContext(mobileContext);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await openQuestion(mobilePage, question.title);
  await mobilePage.locator(".algorithm-approach textarea").scrollIntoViewIfNeeded();
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Algorithms has no horizontal page overflow");
  await shot(mobilePage, "algorithms-mobile-390x844.png");
  await navigate(mobilePage, "Reference");
  await mobilePage.locator(".reference-reader-container").scrollIntoViewIfNeeded();
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Reference has no horizontal page overflow");
  await shot(mobilePage, "reference-mobile-390x844.png");

  pageA.off("request", captureNotePost);
  await mobileContext.close();
  await contextB.close();
  await contextA.close();
  await browser.close();
  const summary = {
    candidate: BASE_URL,
    questionId: question.id,
    noteKey,
    revision: workspaceAfter.noteRevisions?.[noteKey],
    checks,
    writes,
    screenshots: ["algorithms-note-history-desktop.png", "algorithms-stale-review-desktop.png", "algorithms-note-saved-desktop.png", "reference-desktop.png", "algorithms-mobile-390x844.png", "reference-mobile-390x844.png"],
  };
  await writeFile(path.join(EVIDENCE, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  await chmod(EVIDENCE, 0o700);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async error => {
    console.error(`FAIL ${error instanceof Error ? error.stack ?? error.message : "Unknown error"}`);
    await activeBrowser?.close().catch(() => {});
    process.exitCode = 1;
  });
}
