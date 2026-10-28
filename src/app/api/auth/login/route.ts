import { NextResponse } from "next/server";
import { authLoginSchema, authResponseSchema } from "@/contracts/auth";
import {
  AuthSetupError, cognitoRequest, createChallengeEnvelope, getAuthEnvironment,
  hasSameOrigin, readBoundedJson, setChallengeCookie, setSessionCookie, verifyIdToken, clearChallengeCookie,
} from "@/domains/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthResult = { IdToken?: string; ExpiresIn?: number };
type CognitoResult = {
  AuthenticationResult?: AuthResult;
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
};

function safeError(error: unknown) {
  if (error instanceof AuthSetupError) return NextResponse.json({ error: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 502;
  const message = status !== 502 && error instanceof Error ? error.message : "Sign-in is temporarily unavailable.";
  const code = typeof error === "object" && error && "code" in error && error.code === "verification_required" ? error.code : undefined;
  return NextResponse.json({ error: message, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  const input = await readBoundedJson(request);
  const parsed = authLoginSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { username, password } = parsed.data;

  try {
    const env = getAuthEnvironment();
    const result = await cognitoRequest<CognitoResult>("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: env.clientId,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }, env.region);

    if (result.AuthenticationResult?.IdToken) {
      const claims = await verifyIdToken(result.AuthenticationResult.IdToken, env);
      const expiresIn = Math.max(1, Math.min(3600, (claims.exp ?? Math.floor(Date.now() / 1000) + 3600) - Math.floor(Date.now() / 1000)));
      const response = NextResponse.json(authResponseSchema.parse({ authenticated: true }), { headers: { "Cache-Control": "no-store" } });
      setSessionCookie(response.headers, result.AuthenticationResult.IdToken, expiresIn);
      clearChallengeCookie(response.headers);
      return response;
    }

    const challenge = result.ChallengeName;
    if (!challenge || !result.Session || !["SOFTWARE_TOKEN_MFA", "SMS_MFA", "NEW_PASSWORD_REQUIRED"].includes(challenge)) {
      return NextResponse.json({ error: "This account requires an authentication step that Deems does not support yet." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const requiredAttributes = result.ChallengeParameters?.requiredAttributes;
    if (challenge === "NEW_PASSWORD_REQUIRED" && requiredAttributes && requiredAttributes !== "[]") {
      return NextResponse.json({ error: "This account needs additional profile details before it can sign in. Contact the Deems administrator." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const envelope = await createChallengeEnvelope({ name: challenge, session: result.Session, username }, env);
    const response = NextResponse.json(authResponseSchema.parse({ challenge }), { status: 202, headers: { "Cache-Control": "no-store" } });
    setChallengeCookie(response.headers, envelope);
    return response;
  } catch (error) {
    return safeError(error);
  }
}
