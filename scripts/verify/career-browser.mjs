import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

// This browser check only writes to the disposable candidate listener on port 3042.
const BASE_URL = "http://127.0.0.1:3042";
const EVIDENCE = path.resolve("private/agent-runs/20261027T181950Z/W6/candidate");
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const checks = [];
const writes = [];
const synthetic = `W6 candidate ${Date.now()}`;
let activeBrowser;

function check(ok, label) {
  assert.ok(ok, label);
  checks.push(label);
  console.log(`PASS ${label}`);
}

function assertCandidate(url) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, BASE_URL, `Refusing navigation or write outside ${BASE_URL}`);
}

async function settled(page) {
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function shot(page, name) {
  await settled(page);
  await page.screenshot({ path: path.join(EVIDENCE, name), fullPage: false, animations: "disabled" });
}

async function navigate(page, label) {
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.locator(".sidebar .nav-item").filter({ hasText: label }).first().click();
  await settled(page);
}

async function openFde(page) {
  await navigate(page, "Interviews");
  if (await page.getByRole("button", { name: /All interviews/ }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /All interviews/ }).click();
  }
  await page.locator(".target-pipeline-card").filter({ hasText: "Forward Deployed Engineer" }).filter({ hasText: "Sycamore" }).click();
  await settled(page);
}

async function apiJson(context, suffix) {
  const url = `${BASE_URL}${suffix}`;
  assertCandidate(url);
  const response = await context.request.get(url, { timeout: 12000 });
  assert.equal(response.status(), 200, `GET ${suffix}`);
  return response.json();
}

function localDateTime(value) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

function addWriteGuard(context) {
  context.on("request", request => {
    if (request.method() !== "GET" && request.method() !== "HEAD" && request.method() !== "OPTIONS") {
      assertCandidate(request.url());
      writes.push({ method: request.method(), path: new URL(request.url()).pathname });
    }
  });
  context.route("**/*", async route => {
    assertCandidate(route.request().url());
    await route.continue();
  });
}

async function main() {
  assert.equal(process.env.CAREER_CANDIDATE_READY, "1", "Wait for O to confirm candidate readiness, then set CAREER_CANDIDATE_READY=1.");
  assert.equal(new URL(BASE_URL).origin, "http://127.0.0.1:3042");
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({ viewport: desktop, timezoneId: "America/Los_Angeles" });
  context.setDefaultTimeout(10000);
  addWriteGuard(context);
  const page = await context.newPage();
  console.log("STEP open candidate workspace");
  assertCandidate(BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
  await settled(page);

  const initialTargets = await apiJson(context, "/api/targets");
  const fde = initialTargets.roles.find(role => /forward deployed engineer/i.test(role.title) && /sycamore/i.test(initialTargets.companies.find(company => company.id === role.companyId)?.name ?? ""));
  assert.ok(fde, "Sycamore FDE role exists in candidate fixture");
  const existingUpcoming = initialTargets.interviews.filter(round => round.status === "scheduled" && round.scheduledAt && Date.parse(round.scheduledAt) >= Date.now());
  existingUpcoming.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  if (existingUpcoming.length) console.log(`INFO preserving ${existingUpcoming.length} preexisting candidate schedule row(s)`);
  console.log("STEP create application and reload");

  // Create an application entirely through the Applications UI, then reload and confirm persistence.
  await navigate(page, "Applications");
  await page.getByRole("button", { name: "Add a role" }).click();
  await page.getByLabel("Company", { exact: true }).fill(`${synthetic} Co`);
  await page.getByLabel("Role", { exact: true }).fill(`${synthetic} Engineer`);
  await page.getByRole("button", { name: "Save role" }).click();
  await page.getByRole("heading", { name: `${synthetic} Engineer` }).waitFor();
  const createdWs = await apiJson(context, "/api/workspace");
  const createdApp = createdWs.applications.find(item => item.title === `${synthetic} Engineer` && item.company === `${synthetic} Co`);
  assert.ok(createdApp, "New application exists after UI save");
  check(Boolean(createdApp), "application created through UI");
  await page.reload({ waitUntil: "domcontentloaded" });
  await navigate(page, "Applications");
  check(await page.getByRole("button", { name: new RegExp(`${synthetic} Engineer`) }).count() === 1, "new application survives reload");

  // Inject exactly one 503 into the protected application save, then retry unchanged.
  await page.getByRole("button", { name: new RegExp(`${synthetic} Engineer`) }).click();
  const largeNote = `W6 long note ${"candidate detail ".repeat(80)}`;
  await page.getByLabel("Application notes").fill(largeNote);
  const failedBodies = [];
  const failOnce = async route => {
    assertCandidate(route.request().url());
    const body = route.request().postDataJSON();
    if (body?.action === "application" && body?.data?.id === createdApp.id && failedBodies.length === 0) {
      failedBodies.push(body);
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Injected candidate-only 503" }) });
    } else await route.continue();
  };
  await context.route("**/api/workspace", failOnce);
  await page.getByRole("button", { name: "Save application" }).click();
  console.log("STEP application injected failure captured; screenshot follows");
  await page.getByRole("dialog").getByRole("alert").waitFor({ timeout: 8000 });
  check((await page.getByLabel("Application notes").inputValue()) === largeNote, "503 keeps long application draft in form");
  await shot(page, "application-503-draft-desktop.png");
  await context.unroute("**/api/workspace", failOnce);
  console.log("STEP retry application command");
  const retryBodies = [];
  const onRetry = request => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/workspace") retryBodies.push(request.postDataJSON());
  };
  page.on("request", onRetry);
  await page.getByRole("button", { name: "Save application" }).click();
  await page.getByText("Saved notes:", { exact: false }).waitFor({ timeout: 3000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[role="alert"]'), null, { timeout: 8000 }).catch(() => {});
  page.off("request", onRetry);
  const retry = retryBodies.find(body => body?.action === "application" && body?.data?.id === createdApp.id);
  check(failedBodies.length === 1 && retry && failedBodies[0].meta?.key === retry.meta?.key && failedBodies[0].meta?.expectedRevision === retry.meta?.expectedRevision, "application retry reuses stable command key and base revision");
  const afterRetry = await apiJson(context, "/api/workspace");
  check(afterRetry.applications.find(item => item.id === createdApp.id)?.notes === largeNote, "long application notes persist exactly after retry");
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return Boolean(dialog?.contains(document.activeElement));
  }), "application drawer keeps keyboard focus inside its dialog");
  await page.getByRole("button", { name: "Close application details" }).click();
  console.log("STEP role to application stage projection");

  // Role stage changes flow to Applications, and an application edit flows back to the role editor.
  await openFde(page);
  const roleStage = page.getByLabel("Role pipeline stage");
  await roleStage.selectOption("Recruiter screen");
  await settled(page);
  let workspace = await apiJson(context, "/api/workspace");
  let linkedApp = workspace.applications.find(item => item.id === fde.applicationId);
  assert.ok(linkedApp, "Sycamore FDE is linked to an application in candidate fixture");
  check(linkedApp.stage === "Recruiter screen", "role stage projects to the matching Applications stage");
  await navigate(page, "Applications");
  await page.locator(".application-row").filter({ hasText: "Forward Deployed Engineer" }).filter({ hasText: "Sycamore" }).click();
  const applicationStages = page.locator(".application-drawer select");
  check(await applicationStages.count() === 1, "application drawer exposes one stage selector");
  await applicationStages.selectOption("Technical interview");
  await page.getByRole("button", { name: "Save application" }).click();
  await settled(page);
  await page.getByRole("button", { name: "Close application details" }).click();
  await openFde(page);
  check(await page.getByLabel("Role pipeline stage").inputValue() === "Technical interview", "Applications stage update projects back to role stage");
  await shot(page, "stage-editor-desktop.png");
  console.log("STEP stale revision conflict and acceptance");

  // One context advances the role while a second holds a dirty draft. Resolve explicitly, retaining the draft.
  const contextB = await browser.newContext({ viewport: desktop, timezoneId: "America/Los_Angeles" });
  contextB.setDefaultTimeout(10000);
  addWriteGuard(contextB);
  const pageB = await contextB.newPage();
  await pageB.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await openFde(pageB);
  const firstNotes = `Draft retained ${synthetic}`;
  await page.getByRole("button", { name: "Pipeline notes" }).click();
  await page.getByLabel("Status notes").fill(firstNotes);
  await pageB.getByLabel("Role pipeline stage").selectOption("Interviewing");
  await settled(pageB);
  await page.getByRole("button", { name: "Save stage and notes" }).click();
  await page.getByText("This record changed while you were editing.").waitFor({ timeout: 8000 });
  check(await page.getByLabel("Status notes").inputValue() === firstNotes, "stale conflict preserves role notes draft");
  await shot(page, "stage-conflict-review-desktop.png");
  await page.getByRole("button", { name: "Use current revision for my draft" }).click();
  await page.getByRole("button", { name: "Save stage and notes" }).click();
  await settled(page);
  let refreshedTargets = await apiJson(context, "/api/targets");
  check(refreshedTargets.roleStates.find(item => item.roleId === fde.id)?.notes === firstNotes, "accepted stale role pipeline notes save after explicit review");

  // Create scheduled, past, and cancelled rounds in the UI. Today displays only the nearest future scheduled item.
  console.log("STEP schedule future, past, and cancelled interview rounds");
  await openFde(page);
  await page.locator(".target-tabs").getByRole("tab", { name: "Interviews", exact: true }).click();
  await page.getByRole("button", { name: "Add interview" }).click();
  await shot(page, "interview-form-desktop.png");
  const interviewControls = await page.locator(".target-form").evaluate(form => Array.from(form.querySelectorAll("input,select")).map(control => ({ tag: control.tagName, type: control.getAttribute("type"), name: control.getAttribute("name"), ariaLabel: control.getAttribute("aria-label"), labels: Array.from((control).labels ?? []).map(label => label.innerText), outerHTML: control.outerHTML })));
  console.log(`DOM interview controls ${JSON.stringify(interviewControls)}`);
  const futureTitle = `${synthetic} Future round`;
  const futureDate = new Date(existingUpcoming[0] ? Date.parse(existingUpcoming[0].scheduledAt) - 30 * 60 * 1000 : Date.now() + 36 * 60 * 60 * 1000);
  assert.ok(futureDate.getTime() > Date.now() + 5 * 60 * 1000, "Candidate has enough upcoming time to insert the synthetic round before existing schedule");
  await page.getByLabel("Title", { exact: true }).fill(futureTitle);
  const interviewDate = page.locator('.target-form input[type="datetime-local"]');
  const interviewStatus = page.locator(".target-form select");
  check(await interviewDate.count() === 1 && await interviewStatus.count() === 1, "interview form has one datetime and one status control");
  await interviewDate.fill(localDateTime(futureDate));
  await interviewStatus.selectOption("scheduled");
  const futureFormState = await page.locator(".target-form").evaluate(form => ({ values: Array.from(form.querySelectorAll("input,select")).map(control => ({ value: control.value, required: control.required, disabled: control.disabled })), saveDisabled: form.querySelector('button[type="submit"]')?.disabled, reviewText: form.querySelector(".career-conflict-review")?.innerText ?? null }));
  console.log(`DOM future interview form state ${JSON.stringify(futureFormState)}`);
  check(!futureFormState.saveDisabled, "future interview form is ready to save");
  await page.getByRole("button", { name: "Save interview" }).click();
  await settled(page);
  const futureRound = (await apiJson(context, "/api/targets")).interviews.find(round => round.title === futureTitle);
  assert.ok(futureRound, "future interview persisted");
  await page.getByRole("button", { name: "Add interview" }).click();
  await page.getByLabel("Title", { exact: true }).fill(`${synthetic} Past round`);
  await page.locator('.target-form input[type="datetime-local"]').fill(localDateTime(new Date(Date.now() - 48 * 60 * 60 * 1000)));
  await page.locator(".target-form select").selectOption("scheduled");
  await page.getByRole("button", { name: "Save interview" }).click();
  await settled(page);
  await page.getByRole("button", { name: "Add interview" }).click();
  await page.getByLabel("Title", { exact: true }).fill(`${synthetic} Cancelled round`);
  await page.locator('.target-form input[type="datetime-local"]').fill(localDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  await page.locator(".target-form select").selectOption("cancelled");
  await page.getByRole("button", { name: "Save interview" }).click();
  await settled(page);
  await navigate(page, "Today");
  await page.getByText(futureTitle).waitFor({ timeout: 8000 });
  const todayText = await page.locator(".interview-workbench").innerText();
  check(!todayText.includes(`${synthetic} Past round`) && !todayText.includes(`${synthetic} Cancelled round`), "Today excludes past and cancelled rounds");
  check(todayText.includes(futureTitle) && todayText.includes("PDT"), "Today shows scheduled future title and Pacific timezone");
  await shot(page, "today-scheduled-desktop.png");

  // Add debrief, complete its follow-up, edit it, and verify identity/link/resolution survive.
  console.log("STEP create, resolve, and edit linked debrief");
  await openFde(page);
  await page.locator(".target-tabs").getByRole("tab", { name: "Interviews", exact: true }).click();
  await page.getByRole("button", { name: "Add debrief" }).click();
  await shot(page, "debrief-form-desktop.png");
  const debriefForm = page.locator(".target-debrief-section form.target-form");
  const debriefControls = await debriefForm.evaluate(form => Array.from(form.querySelectorAll("input,select,textarea")).map(control => ({ tag: control.tagName, type: control.getAttribute("type"), labels: Array.from(control.labels ?? []).map(label => label.innerText), outerHTML: control.outerHTML })));
  console.log(`DOM debrief controls ${JSON.stringify(debriefControls)}`);
  check(await debriefForm.count() === 1 && await debriefForm.locator("select").count() === 2, "debrief form exposes outcome and interview selectors");
  const debriefInterview = debriefForm.locator("select").nth(1);
  await debriefInterview.selectOption(futureRound.id);
  await page.getByLabel("What were you asked?").fill(`${synthetic} debrief prompt`);
  await page.getByLabel("What worked").fill(`${synthetic} worked`);
  await page.getByLabel("Next action").fill(`${synthetic} follow-up`);
  await page.getByRole("button", { name: "Save debrief" }).click();
  await settled(page);
  let targets = await apiJson(context, "/api/targets");
  let debrief = targets.debriefs.find(item => item.prompt === `${synthetic} debrief prompt`);
  assert.ok(debrief, "debrief persists");
  const ownDebrief = page.locator(".target-debrief").filter({ hasText: `${synthetic} debrief prompt` });
  check(await ownDebrief.count() === 1, "saved debrief is uniquely identified in the UI");
  await ownDebrief.getByRole("button", { name: "Complete" }).click();
  await settled(page);
  targets = await apiJson(context, "/api/targets");
  const resolved = targets.debriefs.find(item => item.id === debrief.id);
  assert.ok(resolved?.resolvedAt, "debrief follow-up resolved");
  await ownDebrief.getByRole("button", { name: "Edit debrief" }).click();
  await page.getByLabel("What were you asked?").fill(`${synthetic} edited prompt`);
  await page.getByRole("button", { name: "Save debrief" }).click();
  await settled(page);
  targets = await apiJson(context, "/api/targets");
  debrief = targets.debriefs.find(item => item.id === debrief.id);
  check(debrief?.interviewId === futureRound.id && debrief?.resolvedAt === resolved.resolvedAt, "debrief edit preserves interview link and resolved state");
  await shot(page, "debrief-edited-desktop.png");

  // Responsive and keyboard smoke checks use a clean read-only browser context after the mutations.
  const mobileContext = await browser.newContext({ viewport: mobile, timezoneId: "America/Los_Angeles" });
  mobileContext.setDefaultTimeout(10000);
  console.log("STEP mobile desktop-layout checks and screenshots");
  addWriteGuard(mobileContext);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await navigate(mobilePage, "Today");
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Today has no horizontal page overflow");
  await shot(mobilePage, "today-mobile-390x844.png");
  await navigate(mobilePage, "Interviews");
  check(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px Interviews board has no horizontal page overflow");
  await shot(mobilePage, "interviews-mobile-390x844.png");
  await mobileContext.close();
  await contextB.close();
  await context.close();
  await browser.close();

  await writeFile(path.join(EVIDENCE, "summary.json"), `${JSON.stringify({ candidate: BASE_URL, syntheticPrefix: synthetic, checks, writes, screenshots: ["application-503-draft-desktop.png", "stage-editor-desktop.png", "stage-conflict-review-desktop.png", "today-scheduled-desktop.png", "debrief-edited-desktop.png", "today-mobile-390x844.png", "interviews-mobile-390x844.png"] }, null, 2)}\n`, { mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async error => {
    console.error(`FAIL ${error instanceof Error ? error.stack ?? error.message : "Unknown error"}`);
    await activeBrowser?.close().catch(() => {});
    process.exitCode = 1;
  });
}
