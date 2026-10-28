import { createHash } from "node:crypto";
import type { ResearchProfile, ResearchSource, RoleSuggestion } from "@/contracts/company-research";

export type PageCapture = {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  heading?: string;
  description: string;
  text: string;
  canonicalUrls: string[];
  jobPostings: unknown[];
  links?: Array<{ url: string; title: string }>;
};

export type ExtractedPage = { source: Omit<ResearchSource, "id" | "runId" | "companyId">; capture: PageCapture };

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function isHttpsPublicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443") && u.hostname.length <= 253;
  } catch { return false; }
}

export function sourceFromCapture(c: PageCapture, kind: "website" | "careers" | "linkedin" | "job", capturedAt = new Date().toISOString()): ExtractedPage {
  const text = normalize(c.text).slice(0, 80_000);
  const title = normalize(c.title).slice(0, 500);
  const excerpt = [title, normalize(c.description), text].filter(Boolean).join("\n\n").slice(0, 80_000);
  const finalUrl = isHttpsPublicUrl(c.finalUrl) ? c.finalUrl : null;
  return {
    capture: { ...c, title, description: normalize(c.description).slice(0, 1000), text, canonicalUrls: c.canonicalUrls.filter(isHttpsPublicUrl).slice(0, 20), jobPostings: c.jobPostings.slice(0, 20), links: (c.links ?? []).filter(link => isHttpsPublicUrl(link.url)).slice(0, 250) },
    source: { kind, url: c.requestedUrl, finalUrl, title, status: "fetched", detail: "Read-only page capture", capturedAt, contentHash: sha(excerpt), excerpt },
  };
}

export type JobPostingCapture = { title?: string; url?: string; description?: string; jobLocation?: unknown; validThrough?: string; hiringOrganization?: { name?: string } };

export function readJobPosting(value: unknown): JobPostingCapture[] {
  const found: JobPostingCapture[] = [];
  const visit = (v: unknown, depth: number) => {
    if (depth > 8 || found.length >= 100 || !v || typeof v !== "object") return;
    if (Array.isArray(v)) { for (const item of v) visit(item, depth + 1); return; }
    const o = v as Record<string, unknown>;
    const types = Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]];
    if (types.includes("JobPosting")) found.push(o as JobPostingCapture);
    if (o["@graph"]) visit(o["@graph"], depth + 1);
    if (o["@type"] === "@graph") visit(o["@graph"], depth + 1);
  };
  visit(value, 0);
  return found;
}

const terms: Record<ResearchProfile["focus"][number], string[]> = {
  "AI engineering": ["ai", "ai engineer", "machine learning", "ml engineer", "llm", "artificial intelligence"],
  "Full-stack": ["full stack", "full-stack", "frontend", "front-end", "backend", "web engineer"],
  "Forward deployed": ["forward deployed", "forward-deployed", "solutions engineer", "customer engineer", "field engineer"],
  Backend: ["backend", "back-end", "platform engineer", "distributed systems", "api engineer"],
  Frontend: ["frontend", "front-end", "ui engineer", "web engineer", "design systems"],
  Management: ["engineering manager", "manager, engineering", "director of engineering", "head of engineering"],
};

export function matchReasons(title: string, profile: ResearchProfile): string[] {
  const lower = ` ${normalize(title).toLowerCase()} `;
  const words = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const reasons: string[] = [];
  for (const focus of profile.focus) {
    const matches = terms[focus].filter(t => t === "ai" ? words.has("ai") : lower.includes(t));
    if (matches.length) reasons.push(`${focus}: title contains ${matches.slice(0, 3).join(", ")}`);
  }
  return reasons.slice(0, 12);
}

export type CandidateJob = { title: string; url: string; location?: string; description?: string; detailFetched: boolean; structured: boolean; closed?: boolean };

function normalizedUrl(value: string): string {
  try { const u = new URL(value); u.hash = ""; u.search = ""; u.pathname = u.pathname.replace(/\/$/, "") || "/"; return u.href.toLowerCase(); } catch { return ""; }
}

function titleWords(value: string): string[] {
  return normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function cleanApplicationTitle(value: string): string {
  return normalize(value).replace(/^job application for\s+/i, "").replace(/\s+at\s+[^|]+$/i, "").split(/\s+\|\s+/)[0].replace(/\s+apply\s*$/i, "").trim();
}

function wordPrefix(a: string[], b: string[]): boolean {
  return a.length > 0 && a.length <= b.length && a.every((word, i) => word === b[i]);
}

/** Recover a canonical role name from the application title/H1 and verify it appears in page text. */
export function canonicalRoleTitle(candidateTitle: string, capture: PageCapture): string | null {
  const candidateWords = titleWords(cleanApplicationTitle(candidateTitle));
  const textWords = titleWords(capture.text);
  const candidates = [capture.heading ?? "", cleanApplicationTitle(capture.title)]
    .map(title => normalize(title))
    .filter(Boolean)
    .map(title => ({ title, words: titleWords(title) }))
    .filter(item => (wordPrefix(item.words, candidateWords) || wordPrefix(candidateWords, item.words)) && textWords.some((_, index) => wordPrefix(item.words, textWords.slice(index))))
    .sort((a, b) => a.words.length - b.words.length);
  return candidates[0]?.title ?? null;
}

export function findMatchingJobPosting(values: unknown[], job: CandidateJob, finalUrl: string): JobPostingCapture | null {
  const titleKey = normalize(job.title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const urls = new Set([normalizedUrl(job.url), normalizedUrl(finalUrl)].filter(Boolean));
  return values.flatMap(readJobPosting).find(posting => {
    const postingTitle = typeof posting.title === "string" ? posting.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";
    const postingUrl = typeof posting.url === "string" ? normalizedUrl(posting.url) : "";
    if (postingTitle) return Boolean(titleKey && postingTitle === titleKey);
    return Boolean(postingUrl && urls.has(postingUrl));
  }) ?? null;
}

const genericRoleTitle = /^(?:careers?|jobs?|all jobs|view all jobs|browse jobs|search jobs|open roles|view open roles|job openings|career opportunities|see all (?:jobs|roles)|more (?:jobs|roles)|positions?)$/i;
const genericListingPath = /\/(?:careers?|jobs?|openings?|positions?|roles?|opportunities|search)\/?$/i;

export function isRoleDetailCandidate(job: CandidateJob, structuredPosting = false): boolean {
  if (!normalize(job.title) || genericRoleTitle.test(normalize(job.title))) return false;
  if (!isHttpsPublicUrl(job.url)) return false;
  try {
    const parsed = new URL(job.url);
    if (genericListingPath.test(parsed.pathname)) return false;
    if (structuredPosting) return true;
    return parsed.pathname.split("/").filter(Boolean).length >= 2;
  } catch { return false; }
}

export function isDistinctJobDetail(job: CandidateJob, finalUrl: string, listingUrls: string[], pageTitle: string, matchingPosting: boolean): boolean {
  const listings = new Set(listingUrls.map(normalizedUrl).filter(Boolean));
  if (listings.has(normalizedUrl(job.url)) || listings.has(normalizedUrl(finalUrl))) return false;
  if (!isRoleDetailCandidate({ ...job, url: finalUrl, structured: false })) return false;
  const page = normalize(pageTitle).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const candidate = normalize(job.title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return matchingPosting || Boolean(candidate && page.includes(candidate));
}

/** Keep relevant role candidates ahead of the small detail-fetch budget. */
export function rankRelevantJobCandidates(jobs: CandidateJob[], profile: ResearchProfile): CandidateJob[] {
  return jobs
    .filter(job => matchReasons(job.title, profile).length > 0 && isRoleDetailCandidate(job, job.structured))
    .sort((a, b) => matchReasons(b.title, profile).length - matchReasons(a.title, profile).length || Number(b.structured) - Number(a.structured) || a.url.localeCompare(b.url) || a.title.localeCompare(b.title));
}

export function makeSuggestion(input: {
  runId: string; companyId: string; sourceId: string; officialSource: boolean; job: CandidateJob; profile: ResearchProfile; duplicateRole: boolean; now?: Date;
}): Omit<RoleSuggestion, "id"> | null {
  const { job, profile } = input;
  const title = normalize(job.title).slice(0, 240);
  if (!title || !isHttpsPublicUrl(job.url)) return null;
  const reasons = matchReasons(title, profile);
  if (!reasons.length) return null;
  const active = job.closed ? "closed" : job.structured && job.detailFetched ? "verified" : "unverified";
  return {
    runId: input.runId, companyId: input.companyId, sourceId: input.sourceId,
    title, url: job.url, location: normalize(job.location ?? "").slice(0, 300),
    excerpt: normalize(job.description ?? "").slice(0, 4000), reasons,
    checks: { officialSource: input.officialSource, detailFetched: job.detailFetched, duplicateRole: input.duplicateRole, activePosting: active },
    status: "suggested", roleId: null,
  };
}

export function parsePostingDescription(p: unknown): string {
  if (typeof p === "string") return normalize(p.replace(/<[^>]*>/g, " ")).slice(0, 4000);
  return "";
}

export function hasFactualClosedPostingText(value: string): boolean {
  return /\b(?:job|role|position)\s+(?:is\s+)?(?:closed|filled|no longer available)\b|\b(?:job|role|position)\s+(?:has been|was)\s+(?:filled|closed)\b|\bno longer accepting applications\b|\bnot accepting applications\b|\bapplications?\s+(?:are|is) closed\b|\bposting has expired\b/i.test(value.slice(0, 20_000));
}
