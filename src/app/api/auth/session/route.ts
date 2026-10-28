import { NextResponse } from "next/server";
import { authResponseSchema } from "@/contracts/auth";
import { authEnabled, getAuthEnvironment, getCookie, verifyIdToken } from "@/domains/auth/server";
import { workspaceSchema } from "@/domains/auth/workspace-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!authEnabled()) return NextResponse.json(authResponseSchema.parse({ authenticated: false, authRequired: false }), { headers: { "Cache-Control": "no-store" } });
    const env = getAuthEnvironment();
    const token = getCookie(request, "deems_session");
    if (!token) return NextResponse.json(authResponseSchema.parse({ authenticated: false, authRequired: true, registrationEnabled: env.multiUser }), { headers: { "Cache-Control": "no-store" } });
    const claims = await verifyIdToken(token, env);
    return NextResponse.json(authResponseSchema.parse({ authenticated: true, authRequired: true, workspaceKey: workspaceSchema(claims.sub!), registrationEnabled: env.multiUser, expiresAt: claims.exp }), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(authResponseSchema.parse({ authenticated: false }), { headers: { "Cache-Control": "no-store" } });
  }
}
