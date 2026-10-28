import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { isPublicAddress, startPublicNetworkProxy } from "../../src/domains/company-research/public-network";
import { assertToolResultSuccess, parseEvaluation } from "../../src/domains/company-research/browser";
import { canonicalRoleTitle, findMatchingJobPosting, hasFactualClosedPostingText, isDistinctJobDetail, makeSuggestion, rankRelevantJobCandidates, readJobPosting, sourceFromCapture, type CandidateJob, type PageCapture } from "../../src/domains/company-research/extract";
import type { ResearchProfile } from "../../src/contracts/company-research";

const fixture: PageCapture = {
  requestedUrl: "https://jobs.example.com/role/ai-platform",
  finalUrl: "https://jobs.example.com/role/ai-platform",
  title: "Senior AI Engineer",
  description: "Build AI tools.",
  text: "Senior AI Engineer. Build AI tools.",
  canonicalUrls: ["https://jobs.example.com/role/ai-platform", "http://127.0.0.1/private"],
  jobPostings: [{ "@context": "https://schema.org", "@type": "JobPosting", title: "Senior AI Engineer", validThrough: "2099-01-01", jobLocation: { address: { addressLocality: "Seattle" } } }],
};
const profile: ResearchProfile = {
  companyId: "example", websiteUrl: "https://example.com", careersUrl: "https://example.com/careers", linkedinUrl: null,
  focus: ["AI engineering", "Forward deployed"], overview: "", pitch: "", descriptionSourceUrl: null, updatedAt: new Date(0).toISOString(),
};

assert.equal(isPublicAddress("8.8.8.8"), true);
for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.2", "::1", "0:0:0:0:0:0:0:1", "fd00::1", "fc00:0000:0000:0000:0000:0000:0000:0001", "fe80::1", "2001:db8::1", "2001:0db8:0000:0000:0000:0000:0000:0001", "::ffff:7f00:1", "0:0:0:0:0:ffff:7f00:1", "::ffff:127.0.0.1", "::8.8.8.8", "2002:0808:0808::1"]) assert.equal(isPublicAddress(address), false, `${address} must be rejected`);
assert.equal(isPublicAddress("2606:4700::1111"), true, "global unicast IPv6 should remain allowed");
assert.equal(isPublicAddress("::ffff:8.8.8.8"), true, "mapped public IPv4 should follow its embedded IPv4 address");
assert.equal(readJobPosting(fixture.jobPostings).length, 1);
const extracted = sourceFromCapture(fixture, "job", new Date(0).toISOString());
assert.equal(extracted.source.contentHash.length, 64);
assert.deepEqual(extracted.capture.canonicalUrls, ["https://jobs.example.com/role/ai-platform"]);
const mcpText = JSON.stringify({ ...fixture, links: [] }, null, 2);
assert.equal(parseEvaluation(`### Result\n${mcpText}\n### Ran Playwright code\n\`\`\`typescript\nawait page.evaluate();\n\`\`\`\n### Page\n- generic`).title, "Senior AI Engineer", "the MCP evaluate result appears under a Result section before tool code and page content");
assert.throws(() => assertToolResultSuccess({ isError: true, content: [{ type: "text", text: "navigation failed" }] }, "fallback"), /navigation failed/);
const noisy: CandidateJob[] = [
  { title: "Careers", url: "https://jobs.example.com/careers", detailFetched: false, structured: false },
  { title: "View all jobs", url: "https://jobs.example.com/company/jobs", detailFetched: false, structured: false },
  { title: "Chief Financial Officer", url: "https://jobs.example.com/company/cfo", detailFetched: false, structured: false },
  ...["AI Platform Engineer", "Senior AI Engineer", "AI Forward Deployed Engineer", "AI Full-stack Engineer", "Machine Learning Engineer"].map((title, i) => ({ title, url: `https://jobs.example.com/company/role-${i}`, detailFetched: false, structured: false })),
];
assert.deepEqual(rankRelevantJobCandidates(noisy, profile).slice(0, 4).map(job => job.title), ["AI Forward Deployed Engineer", "AI Platform Engineer", "Senior AI Engineer", "AI Full-stack Engineer"]);
assert.equal(isDistinctJobDetail(noisy[3], "https://jobs.example.com/company/role-0", ["https://example.com/careers"], "AI Platform Engineer at Example", false), true);
assert.equal(isDistinctJobDetail(noisy[3], "https://jobs.example.com/company/role-0", ["https://example.com/careers"], "Careers at Example", false), false, "a role-shaped URL with an unrelated page title is not a fetched detail");
assert.equal(isDistinctJobDetail(noisy[3], "https://example.com/careers", ["https://example.com/careers"], "AI Platform Engineer", true), false, "a reused careers listing is not a fetched job detail");
assert.equal(findMatchingJobPosting([{ "@type": "JobPosting", title: "Chief Financial Officer", url: fixture.finalUrl }], noisy[4], fixture.finalUrl), null, "unrelated JSON-LD must not verify a role candidate");
assert.equal(findMatchingJobPosting(fixture.jobPostings, noisy[4], fixture.finalUrl)?.title, "Senior AI Engineer");
assert.equal(hasFactualClosedPostingText("This position is no longer available."), true);
assert.equal(hasFactualClosedPostingText("Applications are open for the AI engineering team."), false);
const noisyAnthropicTitle = "Applied AI Architect, Industries New York City, NY; San Francisco, CA | New York City, NY | Seattle, WA Apply";
const anthropicDetail: PageCapture = {
  requestedUrl: "https://job-boards.greenhouse.io/anthropic/jobs/123",
  finalUrl: "https://job-boards.greenhouse.io/anthropic/jobs/123",
  title: "Job Application for Applied AI Architect, Industries at Anthropic",
  heading: "Applied AI Architect, Industries",
  description: "", text: "Back to jobs\nApplied AI Architect, Industries\nNew York City, NY\nBuild customer AI systems.",
  canonicalUrls: [], jobPostings: [],
};
const anthropicCandidate: CandidateJob = { title: noisyAnthropicTitle, url: anthropicDetail.requestedUrl, detailFetched: false, structured: false };
assert.equal(canonicalRoleTitle(noisyAnthropicTitle, anthropicDetail), "Applied AI Architect, Industries");
assert.equal(isDistinctJobDetail({ ...anthropicCandidate, title: canonicalRoleTitle(noisyAnthropicTitle, anthropicDetail)! }, anthropicDetail.finalUrl, ["https://job-boards.greenhouse.io/anthropic"], anthropicDetail.heading!, false), true, "a canonical role H1 on a separate detail URL confirms the detail was fetched");
const suggestion = makeSuggestion({ runId: "run_1", companyId: "example", sourceId: "src_1", officialSource: true, job: { title: "Senior AI Engineer", url: fixture.finalUrl, detailFetched: true, structured: true }, profile, duplicateRole: false, now: new Date("2026-10-27T00:00:00Z") });
assert.equal(suggestion?.checks.activePosting, "verified");
assert.match(suggestion?.reasons.join(" ") ?? "", /AI engineering/);
assert.equal(makeSuggestion({ runId: "run_1", companyId: "example", sourceId: "src_1", officialSource: true, job: { title: "Chief Financial Officer", url: fixture.finalUrl, detailFetched: true, structured: true }, profile, duplicateRole: false }), null);

async function main() {
  const proxy = await startPublicNetworkProxy();
  try {
    for (const target of ["127.0.0.1:443", "[0:0:0:0:0:0:0:1]:443", "[0:0:0:0:0:ffff:7f00:1]:443"]) {
      const status = await new Promise<number>((resolve, reject) => {
        const request = http.request({ host: "127.0.0.1", port: Number(new URL(proxy.url).port), method: "CONNECT", path: target });
        request.once("connect", (response, socket) => { socket.destroy(); resolve(response.statusCode ?? 0); });
        request.once("error", reject);
        request.end();
      });
      assert.equal(status, 403, `the browser proxy must reject private CONNECT destination ${target}`);
    }
    const incomplete = net.connect(Number(new URL(proxy.url).port), "127.0.0.1");
    await new Promise<void>((resolve, reject) => { incomplete.once("connect", resolve); incomplete.once("error", reject); });
    const closed = new Promise<void>(resolve => { incomplete.once("close", resolve); incomplete.once("error", () => resolve()); });
    await proxy.close();
    await closed;
    assert.equal(incomplete.destroyed, true, "proxy close must destroy incomplete client sockets");
  } finally { await proxy.close(); }
  process.stdout.write("Research extractor and network-boundary fixtures passed.\n");
}
main().catch(error => { process.stderr.write(`${String(error)}\n`); process.exitCode = 1; });
