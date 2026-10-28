import { NextResponse, type NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // Hosted installs stay closed until provider authentication and storage are ready.
  if (process.env.VERCEL && process.env.DEEMS_HOSTED_READY !== "true") {
    return new NextResponse("Deems is being set up. Access is not enabled yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
