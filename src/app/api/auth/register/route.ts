import { NextResponse } from "next/server";
import { authRegistrationSchema, authRegistrationResponseSchema } from "@/contracts/auth";
import { AuthSetupError, cognitoRequest, getAuthEnvironment, hasSameOrigin, readBoundedJson } from "@/domains/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403, headers });
  const parsed = authRegistrationSchema.safeParse(await readBoundedJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Check your email, password and verification code. Passwords need at least 12 characters." }, { status: 400, headers });
  try {
    const env = getAuthEnvironment();
    if (!env.multiUser) return NextResponse.json({ error: "Registration is not enabled." }, { status: 403, headers });
    const input = parsed.data;
    const common = { ClientId: env.clientId, Username: input.email };
    const respond = (body: Parameters<typeof authRegistrationResponseSchema.parse>[0]) => NextResponse.json(authRegistrationResponseSchema.parse(body), { headers });
    if (input.action === "signup") {
      try {
        await cognitoRequest("SignUp", { ...common, Password: input.password, UserAttributes: [{ Name: "email", Value: input.email }] }, env.region);
      } catch (error) {
        if (!(typeof error === "object" && error && "status" in error && error.status === 409)) throw error;
      }
      return respond({ accepted: true, confirmationRequired: true });
    }
    if (input.action === "confirm") {
      await cognitoRequest("ConfirmSignUp", { ...common, ConfirmationCode: input.code, ForceAliasCreation: false }, env.region);
      return respond({ accepted: true, confirmed: true });
    }
    if (input.action === "reset") {
      await cognitoRequest("ConfirmForgotPassword", { ...common, ConfirmationCode: input.code, Password: input.password }, env.region);
      return respond({ accepted: true, passwordReset: true });
    }
    try {
      await cognitoRequest(input.action === "resend" ? "ResendConfirmationCode" : "ForgotPassword", common, env.region);
    } catch (error) {
      // Do not disclose whether this email already has an account.
      if (!(typeof error === "object" && error && "status" in error && [400, 401].includes(Number(error.status)))) throw error;
    }
    return respond({ accepted: true });
  } catch (error) {
    const status = error instanceof AuthSetupError ? 503 : typeof error === "object" && error && "status" in error ? Number(error.status) : 502;
    return NextResponse.json({ error: status === 502 ? "Account service is temporarily unavailable." : error instanceof Error ? error.message : "Account request failed." }, { status, headers });
  }
}
