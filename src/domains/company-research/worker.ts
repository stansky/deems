import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { pool } from "../../lib/db";
import type { ResearchProfile, ResearchSource, RoleSuggestion } from "../../contracts/company-research";
import { createBrowserSession, type BrowserSession } from "./browser";
import { resolvePublic } from "./public-network";
import { canonicalRoleTitle, findMatchingJobPosting, hasFactualClosedPostingText, isDistinctJobDetail, isHttpsPublicUrl, makeSuggestion, parsePostingDescription, rankRelevantJobCandidates, readJobPosting, sourceFromCapture, type CandidateJob, type JobPostingCapture, type PageCapture } from "./extract";
import { claimResearchRun, finishResearchRun, getCachedResearchSource } from "./service";

const OVERALL_TIMEOUT_MS = 180_000;
const MAX_PAGE_CAPTURES = 8;
const MAX_JOB_DETAILS = 4;
const MAX_CONTINUOUS_POLL_MS = 8_000;
const RELEVANT_HINTS = /job|career|position|opening|greenhouse|lever|ashby|workday/i;
const ATS_HOSTS = ["boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.ashbyhq.com", "jobs.lever.co", "myworkdayjobs.com", "wd1.myworkdaysite.com", "wd3.myworkdaysite.com", "wd5.myworkdaysite.com", "careers.smartrecruiters.com", "jobs.jobvite.com", "careers.icims.com"];

type StoredSource = ResearchSource & { capture?: Record<string, unknown> };
type Captured = { source: StoredSource; capture: PageCapture & { links?: Array<{ url: string; title: string }> } };

const sourceId = () => `src-${randomUUID()}`;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const shortError = (error: unknown) => clean(error instanceof Error ? error.message : String(error)).replace(/(password|token|secret|key)=\S+/gi, "$1=[redacted]").slice(0, 500);

function isLinkedInUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === "https:" && (u.hostname === "linkedin.com" || u.hostname.endsWith(".linkedin.com")); } catch { return false; }
}

function isAtsUrl(value: string): boolean {
  try { const host = new URL(value).hostname.toLowerCase(); return ATS_HOSTS.some(ats => host === ats || host.endsWith(`.${ats}`)); } catch { return false; }
}

function isAtsListingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/$/, "");
    if (/myworkdayjobs\.com$|\.myworkdaysite\.com$/i.test(url.hostname)) return !/\/job\//i.test(path);
    return path.split("/").filter(Boolean).length <= 1 || /\/(?:jobs?|careers?|openings?|positions?)$/i.test(path);
  } catch { return false; }
}

function sameCompanyHost(value: string, profile: ResearchProfile): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const known = [profile.websiteUrl, profile.careersUrl].map(url => new URL(url).hostname.toLowerCase().replace(/^www\./, ""));
    return known.some(root => host === root || host.endsWith(`.${root}`));
  } catch { return false; }
}

function safeCapture(value: unknown): value is PageCapture & { links?: Array<{ url: string; title: string }> } {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<PageCapture>;
  return typeof c.finalUrl === "string" && isHttpsPublicUrl(c.finalUrl) && typeof c.title === "string" && typeof c.text === "string" && Array.isArray(c.jobPostings) && Array.isArray(c.canonicalUrls);
}

function capCapture(capture: PageCapture & { links?: Array<{ url: string; title: string }> }): Record<string, unknown> {
  const limited = {
    requestedUrl: capture.requestedUrl, finalUrl: capture.finalUrl, title: capture.title.slice(0, 500),
    heading: capture.heading?.slice(0, 500) ?? "",
    description: capture.description.slice(0, 1000), text: capture.text.slice(0, 70_000),
    canonicalUrls: capture.canonicalUrls.slice(0, 20),
    links: (capture.links ?? []).slice(0, 160).map(link => ({ url: link.url, title: link.title.slice(0, 240) })),
    jobPostings: capture.jobPostings.slice(0, 12),
  };
  let encoded = JSON.stringify(limited);
  if (encoded.length > 98_000) {
    limited.jobPostings = [];
    limited.links = limited.links.slice(0, 80);
    limited.text = limited.text.slice(0, 45_000);
    encoded = JSON.stringify(limited);
  }
  if (encoded.length > 100_000) throw new Error("Captured page data exceeded the storage limit");
  return limited;
}

function detailStatus(capture: PageCapture, job: CandidateJob): { active: "verified" | "unverified" | "closed"; posting: JobPostingCapture | null } {
  const posting = findMatchingJobPosting(capture.jobPostings, job, capture.finalUrl);
  if (hasFactualClosedPostingText(`${capture.title}\n${capture.text}`)) return { active: "closed", posting };
  if (!posting) return { active: "unverified", posting: null };
  const validThrough = typeof posting.validThrough === "string" ? Date.parse(posting.validThrough) : Number.NaN;
  if (Number.isFinite(validThrough) && validThrough < Date.now()) return { active: "closed", posting };
  return { active: "verified", posting };
}

function locationFromPosting(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const o = value as Record<string, unknown>;
  const address = o.address && typeof o.address === "object" ? o.address as Record<string, unknown> : o;
  const parts = [address.addressLocality, address.addressRegion, address.addressCountry].filter((x): x is string => typeof x === "string");
  return clean(parts.join(", ")).slice(0, 300);
}

function jobsFromCapture(capture: Captured, profile: ResearchProfile): CandidateJob[] {
  const jobs: CandidateJob[] = [];
  for (const posting of capture.capture.jobPostings.flatMap(readJobPosting)) {
    const url = typeof posting.url === "string" && isHttpsPublicUrl(posting.url) ? posting.url : capture.capture.finalUrl;
    const title = typeof posting.title === "string" ? posting.title : "";
    if (title) jobs.push({ title, url, location: locationFromPosting(posting.jobLocation), description: parsePostingDescription(posting.description), detailFetched: false, structured: true, closed: typeof posting.validThrough === "string" && Number.isFinite(Date.parse(posting.validThrough)) && Date.parse(posting.validThrough) < Date.now() });
  }
  for (const link of capture.capture.links ?? []) {
    if (!RELEVANT_HINTS.test(`${link.title} ${link.url}`) || !isHttpsPublicUrl(link.url)) continue;
    const title = clean(link.title);
    const candidate = { title, url: link.url, detailFetched: false, structured: false };
    if (title && !jobs.some(j => j.url === link.url) && rankRelevantJobCandidates([candidate], profile).length) jobs.push(candidate);
  }
  return jobs;
}

async function knownRoleKeys(companyId: string): Promise<Set<string>> {
  const found = await pool.query<{ data: Record<string, unknown> }>("SELECT data FROM target_roles WHERE company_id=$1", [companyId]);
  const keys = new Set<string>();
  for (const row of found.rows) {
    const title = typeof row.data?.title === "string" ? row.data.title.toLowerCase().trim() : "";
    const url = typeof row.data?.sourceUrl === "string" ? row.data.sourceUrl : "";
    if (title) keys.add(`title:${title}`);
    if (url) keys.add(`url:${url}`);
  }
  return keys;
}

async function research(run: NonNullable<Awaited<ReturnType<typeof claimResearchRun>>>["run"], profile: ResearchProfile, browser: BrowserSession): Promise<{
  sources: StoredSource[]; suggestions: RoleSuggestion[]; overview?: string; pitch?: string; descriptionSourceUrl?: string; error?: string; status: "complete" | "partial" | "failed";
}> {
  const sources: StoredSource[] = [];
  const captures: Captured[] = [];
  const suggestions: RoleSuggestion[] = [];
  const failures: string[] = [];
  const visited = new Set<string>();
  const visit = async (url: string, kind: ResearchSource["kind"]): Promise<Captured | null> => {
    if (!isHttpsPublicUrl(url)) return null;
    if (visited.has(url)) {
      const prior = captures.find(item => item.source.url === url && ["fetched", "cached"].includes(item.source.status));
      if (!prior) return null;
      const alias: StoredSource = { ...prior.source, id: sourceId(), kind, detail: `Reused this run's captured page as ${kind} evidence.` };
      sources.push(alias);
      const result = { source: alias, capture: prior.capture };
      captures.push(result);
      return result;
    }
    if (visited.size >= MAX_PAGE_CAPTURES) return null;
    visited.add(url);
    try {
      await resolvePublic(new URL(url).hostname);
      const cache = await getCachedResearchSource(url);
      if (cache) {
        if (cache.finalUrl) await resolvePublic(new URL(cache.finalUrl).hostname);
        const capture = safeCapture(cache.capture) ? cache.capture : {
          requestedUrl: url, finalUrl: cache.finalUrl ?? url, title: cache.title, description: "", text: cache.excerpt.slice(0, 70_000), canonicalUrls: [], jobPostings: [], links: [],
        };
        const source: StoredSource = { ...cache, id: sourceId(), runId: run.id, companyId: run.companyId, kind, status: "cached", detail: "Reused a successful capture from the last 24 hours." };
        sources.push(source); const result = { source, capture } as Captured; captures.push(result); return result;
      }
      const capture = await browser.capture(url);
      const login = kind === "linkedin" && /(sign in|join linkedin|log in to linkedin|authentication required)/i.test(`${capture.title}\n${capture.text.slice(0, 4000)}`);
      const extracted = sourceFromCapture(capture, kind);
      const source: StoredSource = {
        id: sourceId(), runId: run.id, companyId: run.companyId,
        ...extracted.source,
        status: login ? "blocked" : "fetched",
        detail: login ? "LinkedIn showed a sign-in prompt; only the public preview was captured." : `Fetched public page at ${capture.finalUrl}`,
        capture: capCapture(capture),
      };
      sources.push(source);
      const result = { source, capture }; captures.push(result);
      if (login) failures.push("LinkedIn showed a sign-in prompt; public preview only.");
      return result;
    } catch (error) {
      const detail = shortError(error) || "Page could not be read.";
      failures.push(`${kind}: ${detail}`);
      if (/not public|non-public|private|local destination|could not be verified as public|ENOTFOUND|EAI_AGAIN/i.test(detail)) return null;
      sources.push({ id: sourceId(), runId: run.id, companyId: run.companyId, kind, url, finalUrl: null, title: "", status: /403|blocked|denied|sign in|login/i.test(detail) ? "blocked" : "failed", detail, capturedAt: new Date().toISOString(), contentHash: "", excerpt: "" });
      return null;
    }
  };

  let linkedinUrl = profile.linkedinUrl;
  try {
    const homepage = await visit(profile.websiteUrl, "website");
    const careers = await visit(profile.careersUrl, "careers");
    if (!linkedinUrl) {
      const discovered = homepage?.capture.links?.find(link => isLinkedInUrl(link.url) && /company|school/i.test(link.url));
      linkedinUrl = discovered?.url ?? null;
      if (!linkedinUrl && homepage) homepage.source.detail = "No official LinkedIn company page was linked from the official homepage.";
    }
    if (linkedinUrl && isLinkedInUrl(linkedinUrl)) await visit(linkedinUrl, "linkedin");

    const listingPages = [careers, homepage].filter((item): item is Captured => !!item);
    let candidates = listingPages.flatMap(item => jobsFromCapture(item, profile)).filter(job => isAtsUrl(job.url) || sameCompanyHost(job.url, profile));
    if (rankRelevantJobCandidates(candidates, profile).length === 0) {
      const atsLink = listingPages.flatMap(item => item.capture.links ?? []).find(link => isAtsUrl(link.url) && isAtsListingUrl(link.url));
      if (atsLink && !visited.has(atsLink.url)) {
        const atsListing = await visit(atsLink.url, "careers");
        if (atsListing) {
          listingPages.push(atsListing);
          candidates = [...candidates, ...jobsFromCapture(atsListing, profile).filter(job => isAtsUrl(job.url) || sameCompanyHost(job.url, profile))];
        }
      }
    }
    const jobs = rankRelevantJobCandidates([...new Map(candidates.map(job => [job.url, job])).values()], profile).slice(0, MAX_JOB_DETAILS);
    const existing = await knownRoleKeys(profile.companyId);
    const listingUrls = listingPages.flatMap(item => [item.source.url, item.source.finalUrl]).filter((url): url is string => Boolean(url));
    for (const job of jobs) {
      let detailCapture: Captured | null = null;
      if (visited.has(job.url) || visited.size < MAX_PAGE_CAPTURES) detailCapture = await visit(job.url, "job");
      const actual = detailCapture?.capture;
      if (actual && detailCapture) {
        const canonicalTitle = canonicalRoleTitle(job.title, actual);
        if (canonicalTitle) job.title = canonicalTitle;
        const structured = detailStatus(actual, job);
        job.detailFetched = isDistinctJobDetail(job, actual.finalUrl, listingUrls, actual.heading || actual.title, structured.posting !== null) && (detailCapture.source.status === "fetched" || detailCapture.source.status === "cached");
        job.structured = structured.posting !== null;
        if (structured.active === "closed") job.closed = true;
        else if (structured.posting) job.closed = false;
        if (structured.posting?.title) job.title = structured.posting.title;
        if (structured.posting?.description) job.description = parsePostingDescription(structured.posting.description);
        if (structured.posting?.jobLocation) job.location = locationFromPosting(structured.posting.jobLocation);
      }
      const duplicate = existing.has(`title:${job.title.toLowerCase().trim()}`) || existing.has(`url:${job.url}`);
      const source = detailCapture?.source ?? sources.find(s => s.url === job.url && s.kind === "job");
      if (!source) continue;
      const suggestion = makeSuggestion({ runId: run.id, companyId: run.companyId, sourceId: source.id, officialSource: isAtsUrl(job.url) || sameCompanyHost(job.url, profile), job, profile, duplicateRole: duplicate });
      if (suggestion) suggestions.push({ id: `suggestion-${randomUUID()}`, ...suggestion });
    }
  } catch (error) {
    failures.push(shortError(error));
  }

  const website = captures.find(item => item.source.kind === "website" && ["fetched", "cached"].includes(item.source.status));
  const descriptionSourceUrl = website?.source.finalUrl ?? null;
  const basis = website?.capture.description || website?.capture.text || "";
  const overview = basis ? `Official company website (${descriptionSourceUrl}): ${clean(basis).slice(0, 1700)}` : undefined;
  const pitch = basis ? `Company description from its official website: ${clean(basis).slice(0, 850)}` : undefined;
  const fetched = sources.some(source => source.status === "fetched" || source.status === "cached");
  const error = failures.length ? failures.slice(0, 5).join("; ").slice(0, 1800) : undefined;
  return { sources, suggestions, overview, pitch, descriptionSourceUrl: descriptionSourceUrl ?? undefined, error, status: !fetched ? "failed" : failures.length ? "partial" : "complete" };
}

export async function runOnce(): Promise<boolean> {
  const claim = await claimResearchRun();
  if (!claim) return false;
  let browser: BrowserSession | null = null;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { deadlineTimer = setTimeout(() => reject(new Error("Research run exceeded the 180 second limit.")), OVERALL_TIMEOUT_MS); });
  let result: Awaited<ReturnType<typeof research>>;
  try {
    browser = await Promise.race([createBrowserSession(OVERALL_TIMEOUT_MS), deadline]);
    result = await Promise.race([research(claim.run, claim.profile, browser), deadline]);
  } catch (error) {
    result = { sources: [], suggestions: [], status: "failed", error: shortError(error) || "Research worker failed." };
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    await browser?.close();
  }
  await finishResearchRun(claim.run.id, result, claim.run.claimToken, claim.run.attempts);
  return true;
}

export async function runWorker(options: { once?: boolean } = {}): Promise<void> {
  do {
    const claimed = await runOnce();
    if (options.once) return;
    if (!claimed) await delay(MAX_CONTINUOUS_POLL_MS);
  } while (true);
}

if (process.argv[1] && /(?:^|\/)worker\.(?:js|mjs|cjs|ts)$/.test(process.argv[1])) {
  runWorker({ once: process.argv.includes("--once") }).catch(error => {
    process.stderr.write(`${shortError(error)}\n`);
    process.exitCode = 1;
  }).finally(() => pool.end());
}
