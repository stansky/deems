import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, getAuthEnvironment, getCookie, getEffectiveRequestOrigin, isSafeNextPath, verifyIdToken } from "@/domains/auth/server";
import { workspaceSchema } from "@/domains/auth/workspace-key";

const publicLoginPaths = new Set([
  "/api/auth/login",
  "/api/auth/challenge",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/scene-weather",
]);

function setupResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

// The printed-note companion holds only fixed study content, never workspace data. The owner
// asked for it to stay public so it keeps working if a one-hour session expires mid-interview.
function isPublicNotesPath(path: string): boolean {
  return path === "/notes" || path === "/notes/";
}

function isStaticAssetPath(path: string): boolean {
  return path.startsWith("/brand/") || path.startsWith("/_next/static/") || path === "/_next/image" ||
    path === "/favicon.ico" || path === "/icon.svg";
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/robots.txt") return new NextResponse("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex, nofollow, noai, noimageai" } });
  if (isStaticAssetPath(request.nextUrl.pathname)) return NextResponse.next();
  if (process.env.VERCEL && process.env.DEEMS_HOSTED_READY !== "true") {
    return setupResponse("Deems is being set up. Access is not enabled yet.", 503);
  }
  if (!authEnabled()) return NextResponse.next();

  const authEnv = (() => {
    try { return getAuthEnvironment(); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Authentication is not configured.";
      return setupResponse(message, 503);
    }
  })();
  if (authEnv instanceof NextResponse) return authEnv;

  const path = request.nextUrl.pathname;
  if (path === "/login" || path === "/signup" || publicLoginPaths.has(path) || isPublicNotesPath(path)) return NextResponse.next();

  const token = getCookie(request, "deems_session");
  if (token) {
    try {
      const claims = await verifyIdToken(token, authEnv);
      const expected = request.headers.get("x-deems-workspace");
      if (expected && expected !== workspaceSchema(claims.sub!)) return NextResponse.json({ error: "Your account changed. Reopen your workspace.", code: "workspace_changed" }, { status: 409, headers: { "Cache-Control": "no-store" } });
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch {
      // A rejected or expired token must never grant access.
    }
  }

  if (path.startsWith("/api/")) {
    const response = NextResponse.json({ error: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (token) response.headers.append("Set-Cookie", "deems_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return response;
  }

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const requestOrigin = getEffectiveRequestOrigin(request);
  if (!requestOrigin) return setupResponse("Request host is not valid.", 400);
  const loginUrl = new URL("/login", requestOrigin);
  if (isSafeNextPath(next) && next !== "/login") loginUrl.searchParams.set("next", next);
  const response = NextResponse.redirect(loginUrl, 307);
  if (token) response.headers.append("Set-Cookie", "deems_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
