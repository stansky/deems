import { NextResponse } from "next/server";
import { authResponseSchema } from "@/contracts/auth";
import { getAuthEnvironment, getCookie, verifyIdToken } from "@/domains/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const env = getAuthEnvironment();
    const token = getCookie(request, "deems_session");
    if (!token) return NextResponse.json(authResponseSchema.parse({ authenticated: false }), { headers: { "Cache-Control": "no-store" } });
    const claims = await verifyIdToken(token, env);
    return NextResponse.json(authResponseSchema.parse({ authenticated: true, expiresAt: claims.exp }), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(authResponseSchema.parse({ authenticated: false }), { headers: { "Cache-Control": "no-store" } });
  }
}
