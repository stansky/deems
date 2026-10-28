import OpenAI from "openai";
import { CodeReviewError, codeReviewInput, reviewCode } from "@/lib/code-review";
import { sameOrigin } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 75;

const bodyLimit = 70000;
const slots = globalThis as unknown as { interviewCodeReviewsActive?: number };

function failure(status: number, code: string, error: string, retryAfter?: string) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfter) headers["Retry-After"] = retryAfter;
  return Response.json({ error, code }, { status, headers });
}

class BodyTooLarge extends Error {}

async function readBody(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > bodyLimit) throw new BodyTooLarge();
  if (!request.body) throw new SyntaxError("Missing body");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > bodyLimit) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") {
    return failure(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.");
  }
  if ((slots.interviewCodeReviewsActive || 0) >= 2) {
    return failure(429, "REVIEW_BUSY", "Two code reviews are already running. Try again when one finishes.", "5");
  }
  slots.interviewCodeReviewsActive = (slots.interviewCodeReviewsActive || 0) + 1;
  try {
    let raw: unknown;
    try { raw = await readBody(request); }
    catch (error) {
      if (error instanceof BodyTooLarge) return failure(413, "BODY_TOO_LARGE", "Keep the request below 70,000 bytes.");
      return failure(400, "INVALID_JSON", "Send a valid JSON request.");
    }
    const parsed = codeReviewInput.safeParse(raw);
    if (!parsed.success) {
      return failure(400, "INVALID_REVIEW_INPUT", "Provide code, a supported language, and either a question ID or question text within the allowed limits.");
    }
    const result = await reviewCode(parsed.data, request.signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CodeReviewError) {
      if (error.code === "KEY_MISSING") return failure(503, error.code, "OpenAI is not configured for this local app.");
      if (error.code === "QUESTION_MISSING") return failure(404, error.code, "This question is not in the local question bank.");
      if (error.code === "DATABASE_UNAVAILABLE") return failure(503, error.code, "The local question bank or learning profile is unavailable.");
      return failure(502, error.code, "The model did not return a complete code review. Please retry.");
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return failure(504, "PROVIDER_TIMEOUT", "OpenAI did not complete the review before the timeout.");
    }
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return failure(502, "PROVIDER_AUTHENTICATION_FAILED", "OpenAI rejected the configured key.");
      if (error.status === 429) return failure(429, "PROVIDER_RATE_LIMITED", "OpenAI is rate-limited or out of quota. Try again later.", "30");
      if (error.status === 404) return failure(503, "PROVIDER_MODEL_UNAVAILABLE", "The configured OpenAI model is unavailable for this key.");
      if (error.status === 403) return failure(503, "PROVIDER_ACCESS_DENIED", "The configured OpenAI key cannot access this service.");
      return failure(502, "PROVIDER_ERROR", "OpenAI could not complete the code review.");
    }
    return failure(502, "REVIEW_FAILED", "The code review could not be completed. No code was saved or executed.");
  } finally {
    slots.interviewCodeReviewsActive = Math.max(0, (slots.interviewCodeReviewsActive || 1) - 1);
  }
}
