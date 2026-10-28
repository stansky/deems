import { NextResponse } from "next/server";
import { authResponseSchema } from "@/contracts/auth";
import { clearAuthCookies, hasSameOrigin } from "@/domains/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  const response = NextResponse.json(authResponseSchema.parse({ authenticated: false }), { headers: { "Cache-Control": "no-store" } });
  clearAuthCookies(response.headers);
  return response;
}
