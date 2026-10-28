import { NextResponse } from "next/server";
import { authChallengeInputSchema, authResponseSchema } from "@/contracts/auth";
import {
  AuthSetupError, clearChallengeCookie, cognitoRequest, createChallengeEnvelope,
  getAuthEnvironment, getCookie, hasSameOrigin, readBoundedJson, readChallengeEnvelope,
  setChallengeCookie, setSessionCookie, verifyIdToken,
} from "@/domains/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CognitoResult = {
  AuthenticationResult?: { IdToken?: string };
  ChallengeName?: string;
  Session?: string;
  ChallengeParameters?: Record<string, string>;
};

function safeError(error: unknown) {
  if (error instanceof AuthSetupError) return NextResponse.json({ error: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 502;
  const message = status !== 502 && error instanceof Error ? error.message : "Sign-in is temporarily unavailable.";
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  const body = await readBoundedJson(request);
  const parsed = authChallengeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "The challenge response was not accepted." }, { status: 400 });
  }
  const { code, newPassword } = parsed.data;
  const value = getCookie(request, "deems_auth_challenge");
  if (!value) return NextResponse.json({ error: "The sign-in challenge expired. Start again." }, { status: 400 });

  try {
    const env = getAuthEnvironment();
    const challenge = await readChallengeEnvelope(value, env);
    const responses: Record<string, string> = { USERNAME: challenge.username };
    if (challenge.name === "SOFTWARE_TOKEN_MFA") {
      if (!code || newPassword !== undefined) return NextResponse.json({ error: "Enter the authentication code." }, { status: 400 });
      responses.SOFTWARE_TOKEN_MFA_CODE = code;
    } else if (challenge.name === "SMS_MFA") {
      if (!code || newPassword !== undefined) return NextResponse.json({ error: "Enter the authentication code." }, { status: 400 });
      responses.SMS_MFA_CODE = code;
    } else if (challenge.name === "NEW_PASSWORD_REQUIRED") {
      if (!newPassword || code !== undefined) return NextResponse.json({ error: "Choose a new password." }, { status: 400 });
      responses.NEW_PASSWORD = newPassword;
    } else {
      return NextResponse.json({ error: "This sign-in challenge is not supported." }, { status: 400 });
    }

    const result = await cognitoRequest<CognitoResult>("RespondToAuthChallenge", {
      ClientId: env.clientId,
      ChallengeName: challenge.name,
      Session: challenge.session,
      ChallengeResponses: responses,
    }, env.region);
    if (result.AuthenticationResult?.IdToken) {
      const claims = await verifyIdToken(result.AuthenticationResult.IdToken, env);
      const expiresIn = Math.max(1, Math.min(3600, (claims.exp ?? Math.floor(Date.now() / 1000) + 3600) - Math.floor(Date.now() / 1000)));
      const response = NextResponse.json(authResponseSchema.parse({ authenticated: true }), { headers: { "Cache-Control": "no-store" } });
      setSessionCookie(response.headers, result.AuthenticationResult.IdToken, expiresIn);
      clearChallengeCookie(response.headers);
      return response;
    }
    if (result.ChallengeName && result.Session && ["SOFTWARE_TOKEN_MFA", "SMS_MFA", "NEW_PASSWORD_REQUIRED"].includes(result.ChallengeName)) {
      const envelope = await createChallengeEnvelope({ name: result.ChallengeName, session: result.Session, username: challenge.username }, env);
      const response = NextResponse.json(authResponseSchema.parse({ challenge: result.ChallengeName }), { status: 202, headers: { "Cache-Control": "no-store" } });
      setChallengeCookie(response.headers, envelope);
      return response;
    }
    return NextResponse.json({ error: "This account requires an authentication step that Deems does not support yet." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeError(error);
  }
}
