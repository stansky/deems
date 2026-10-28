import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3141";
const ROLE_ID = "verification-practice-r5-role";
const STEP_ID = "verification-practice-r5-step";
const REQUIREMENT_ID = "verification-practice-r5-requirement";
const EVIDENCE = path.resolve("private/agent-runs/practice-20261027/W7");
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const screenshots = [];

function assertCandidate(url) {
  assert.equal(new URL(url).origin, BASE_URL, `Refusing navigation or request outside ${BASE_URL}`);
}

async function settled(page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
}

async function readAttempt(context) {
  const url = `${BASE_URL}/api/workspace`;
  assertCandidate(url);
  const response = await context.request.get(url, { timeout: 12000 });
  assert.equal(response.status(), 200, "GET /api/workspace");
  const workspace = await response.json();
  const attempt = workspace.practiceAttempts
    ?.filter(item => item.origin?.roleId === ROLE_ID && item.origin?.planStepId === STEP_ID && item.attachment?.requirementId === REQUIREMENT_ID)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
  assert.ok(attempt, "a saved, attached W7 browser attempt exists for read-only capture");
  const session = workspace.sessions.find(item => item.id === attempt.sessionId);
  assert.ok(session, "attached attempt has its legacy-compatible session row");
  return { attempt, session };
}

async function openAttempt(page, attempt, notes) {
  const params = new URLSearchParams({ view: "practice", exercise: attempt.exerciseId, role: ROLE_ID, step: STEP_ID, attempt: attempt.sessionId });
  const url = `${BASE_URL}/?${params}`;
  assertCandidate(url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.getByRole("heading", { name: "Practice", exact: true }).waitFor();
  await page.getByRole("region", { name: "Practice origin" }).getByText("Verification step", { exact: true }).waitFor();
  const details = page.locator(".saved-practice-attempt").filter({ hasText: notes.slice(0, 72) });
  await details.getByText("Currently attached", { exact: true }).waitFor();
  await settled(page);
  return { details, evidence: details.locator(".saved-attempt-evidence"), attachment: details.locator(".saved-attempt-attach") };
}

async function positionAtTop(page, locator, label) {
  await locator.waitFor({ state: "visible" });
  await settled(page);
  async function stableGeometry() {
    return locator.evaluate(element => new Promise(resolve => {
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
  }
  const before = await stableGeometry();
  assert.ok(before.stableFrames >= 2, `${label} initial geometry did not settle in ${before.frames} animation frames`);
  await locator.evaluate(element => {
    const top = element.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: "instant" });
  });
  const geometry = await stableGeometry();
  assert.ok(geometry.stableFrames >= 2, `${label} geometry did not settle in ${geometry.frames} animation frames`);
  assert.ok(Math.abs(geometry.top - 16) <= 2, `${label} is at top=${geometry.top}, expected 16px`);
  return geometry;
}

async function capture(page, locator, viewportFile, cardFile, label) {
  const geometry = await positionAtTop(page, locator, label);
  await page.screenshot({ path: path.join(EVIDENCE, viewportFile), fullPage: false, animations: "disabled" });
  screenshots.push({ file: viewportFile, viewport: `${page.viewportSize().width}x${page.viewportSize().height}`, frame: label, top: geometry.top });
  await locator.screenshot({ path: path.join(EVIDENCE, cardFile), animations: "disabled" });
  screenshots.push({ file: cardFile, viewport: "element capture", frame: label, top: geometry.top });
}

async function main() {
  assert.equal(process.env.PRACTICE_BROWSER_CANDIDATE_READY, "1", "Wait for O's explicit candidate-ready signal before setting PRACTICE_BROWSER_CANDIDATE_READY=1.");
  await mkdir(EVIDENCE, { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: desktop, timezoneId: "America/Los_Angeles" });
  context.setDefaultTimeout(12000);
  context.on("request", request => assertCandidate(request.url()));
  context.route("**/*", async route => {
    assertCandidate(route.request().url());
    await route.continue();
  });
  try {
    const { attempt, session } = await readAttempt(context);
    const page = await context.newPage();
    let view = await openAttempt(page, attempt, session.notes);
    await capture(page, view.evidence, "practice-attached-evidence-desktop-final.png", "practice-attempt-evidence-card-desktop-final.png", "desktop saved evidence panel");
    await capture(page, view.attachment, "practice-attachment-panel-desktop-final.png", "practice-attachment-section-desktop-final.png", "desktop requirement attachment panel");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "desktop screenshot has no horizontal overflow");

    await page.setViewportSize(mobile);
    view = await openAttempt(page, attempt, session.notes);
    await capture(page, view.evidence, "practice-attached-evidence-mobile-390x844-final.png", "practice-attempt-evidence-card-mobile-390x844-final.png", "mobile saved evidence panel");
    await capture(page, view.attachment, "practice-attachment-panel-mobile-390x844-final.png", "practice-attachment-section-mobile-390x844-final.png", "mobile requirement attachment panel");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile screenshot has no horizontal overflow");

    const receipt = {
      result: "passed",
      mode: "read-only-capture",
      candidate: BASE_URL,
      candidateAttempt: attempt.sessionId,
      roleId: ROLE_ID,
      planStepId: STEP_ID,
      requirementId: REQUIREMENT_ID,
      attemptRevision: attempt.revision,
      attachment: attempt.attachment,
      screenshots,
      providerCalls: 0,
      codeExecution: 0,
      applicationWrites: 0,
    };
    await writeFile(path.join(EVIDENCE, "practice-browser-capture.json"), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    console.log(`RESULT read-only capture passed attempt=${attempt.sessionId} screenshots=${screenshots.length}`);
    await context.close();
    await browser.close();
  } catch (error) {
    await context.close();
    await browser.close();
    throw error;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
