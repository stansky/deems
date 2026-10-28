import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { isHttpsPublicUrl, type PageCapture } from "./extract.js";
import { resolvePublic, startPublicNetworkProxy } from "./public-network.js";

const PAGE_LIMIT = 80_000;
const EVALUATOR = `() => {
  const text = document.body?.innerText || '';
  const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({url: a.href, title: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 240)})).filter(a => a.url.startsWith('https://')).slice(0, 500);
  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 100).map(s => { try { return JSON.parse(s.textContent || 'null'); } catch { return null; } }).filter(Boolean);
  return {requestedUrl: location.href, finalUrl: location.href, title: document.title || '', heading: document.querySelector('h1')?.innerText || '', description: document.querySelector('meta[name="description"]')?.getAttribute('content') || document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '', text: text.slice(0, ${PAGE_LIMIT}), canonicalUrls: Array.from(document.querySelectorAll('link[rel="canonical"]')).map(x => x.href).filter(Boolean), links, jobPostings: jsonLd};
}`;

type ToolResult = { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
export function assertToolResultSuccess(result: ToolResult, fallback: string): void {
  if (result.isError) throw new Error(result.content?.map(c => c.text).filter(Boolean).join("\n") || fallback);
}

function extractText(result: ToolResult): string {
  assertToolResultSuccess(result, "Browser tool failed");
  return (result.content ?? []).filter(c => c.type === "text").map(c => c.text ?? "").join("\n");
}

export function parseEvaluation(text: string): PageCapture & { links: Array<{ url: string; title: string }> } {
  const fenced = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map(match => match[1]);
  const resultHeader = text.indexOf("### Result");
  const resultSection = resultHeader >= 0 ? text.slice(resultHeader + "### Result".length).trimStart() : "";
  const nextSection = resultSection.search(/\n### [A-Z]/);
  const sectionBody = resultSection ? (nextSection >= 0 ? resultSection.slice(0, nextSection) : resultSection).trim() : "";
  const candidates = [sectionBody, ...fenced, text, ...text.split("\n").map(line => line.replace(/^```(?:json)?\s*|\s*```$/g, "").trim())];
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as Record<string, unknown>;
      if (typeof value.finalUrl === "string" && typeof value.text === "string") {
        return {
          requestedUrl: typeof value.requestedUrl === "string" ? value.requestedUrl : value.finalUrl,
          finalUrl: value.finalUrl, title: typeof value.title === "string" ? value.title : "",
          heading: typeof value.heading === "string" ? value.heading.slice(0, 500) : "",
          description: typeof value.description === "string" ? value.description : "",
          text: value.text.slice(0, PAGE_LIMIT),
          canonicalUrls: Array.isArray(value.canonicalUrls) ? value.canonicalUrls.filter((x): x is string => typeof x === "string") : [],
          jobPostings: Array.isArray(value.jobPostings) ? value.jobPostings : [],
          links: Array.isArray(value.links) ? value.links.filter((x): x is {url:string;title:string} => !!x && typeof x === "object" && typeof (x as {url?:unknown}).url === "string").slice(0, 250) : [],
        };
      }
    } catch { /* response may include MCP framing */ }
  }
  throw new Error("Browser returned an unreadable page capture");
}

export type BrowserSession = { capture(url: string): Promise<PageCapture & { links: Array<{ url: string; title: string }> }>; close(): Promise<void> };

export async function createBrowserSession(timeoutMs: number): Promise<BrowserSession> {
  const proxy = await startPublicNetworkProxy();
  const workdir = await mkdtemp(resolve(tmpdir(), "interview-research-"));
  const cli = resolve(process.env.RESEARCH_MCP_CLI_PATH ?? resolve(process.cwd(), "node_modules/@playwright/mcp/cli.js"));
  const initPage = resolve(process.env.RESEARCH_BROWSER_INIT_PATH ?? resolve(process.cwd(), "scripts/research-browser-init.ts"));
  const config = resolve(workdir, "mcp-config.json");
  await writeFile(config, JSON.stringify({ browser: { launchOptions: { args: ["--disable-webrtc"] } } }), { mode: 0o600 });
  const childEnv: Record<string, string> = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: workdir };
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) childEnv.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, "--config", config, "--browser", "chromium", "--headless", "--isolated", "--no-webmcp", "--image-responses", "omit", "--proxy-server", proxy.url, "--proxy-bypass", "<-loopback>", "--init-page", initPage, "--timeout-navigation", "45000"],
    cwd: workdir,
    env: childEnv,
    stderr: "pipe",
  });
  const client = new Client({ name: "interview-company-research", version: "1.0.0" });
  let closed = false;
  const abort = setTimeout(() => { void close(); }, timeoutMs);
  const close = async () => {
    if (closed) return;
    closed = true;
    clearTimeout(abort);
    await client.close().catch(() => undefined);
    await proxy.close().catch(() => undefined);
    await rm(workdir, { recursive: true, force: true }).catch(() => undefined);
  };
  try {
    await client.connect(transport);
  } catch (error) {
    await close();
    throw error;
  }
  return {
    async capture(url) {
      if (closed) throw new Error("Browser session closed");
      if (!isHttpsPublicUrl(url)) throw new Error("Only public HTTPS pages can be visited");
      await resolvePublic(new URL(url).hostname);
      const navigation = await client.callTool({ name: "browser_navigate", arguments: { url } }, undefined, { timeout: Math.min(timeoutMs, 45_000) });
      assertToolResultSuccess(navigation as ToolResult, "Browser navigation failed");
      const result = await client.callTool({ name: "browser_evaluate", arguments: { function: EVALUATOR } }, undefined, { timeout: Math.min(timeoutMs, 30_000) });
      const capture = parseEvaluation(extractText(result as ToolResult));
      if (!isHttpsPublicUrl(capture.finalUrl)) throw new Error("Navigation ended at a non-public URL");
      await resolvePublic(new URL(capture.finalUrl).hostname);
      return { ...capture, requestedUrl: url };
    },
    close,
  };
}
