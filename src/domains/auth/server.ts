import { createHash } from "node:crypto";
import {
  createRemoteJWKSet,
  EncryptJWT,
  jwtDecrypt,
  jwtVerify,
  type JWTPayload,
} from "jose";

const SESSION_COOKIE = "deems_session";
const CHALLENGE_COOKIE = "deems_auth_challenge";
const SESSION_MAX_AGE = 60 * 60;
const CHALLENGE_MAX_AGE = 5 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const COGNITO_TIMEOUT_MS = 8_000;
const JWKS_TIMEOUT_MS = 5_000;

export type AuthEnvironment = {
  region: string;
  userPoolId: string;
  clientId: string;
  allowedSubjects: Set<string>;
  multiUser: boolean;
  secret: Uint8Array;
};

export class AuthSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthSetupError";
  }
}

export class AuthSubjectDeniedError extends Error {
  readonly status = 403;
  constructor() {
    super("This account is not enabled for Deems.");
    this.name = "AuthSubjectDeniedError";
  }
}

export function authEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.VERCEL) || env.DEEMS_AUTH_ENABLED === "true";
}

export function getAuthEnvironment(env: Record<string, string | undefined> = process.env): AuthEnvironment {
  const region = env.DEEMS_COGNITO_REGION?.trim();
  const userPoolId = env.DEEMS_COGNITO_USER_POOL_ID?.trim();
  const clientId = env.DEEMS_COGNITO_CLIENT_ID?.trim();
  const secretText = env.DEEMS_AUTH_SECRET ?? "";
  const multiUser = env.DEEMS_MULTIUSER === "true";
  const allowedSubjects = new Set((env.DEEMS_COGNITO_ALLOWED_SUBS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean));

  if (!region || !userPoolId || !clientId || secretText.length < 32 || (!multiUser && allowedSubjects.size === 0)) {
    throw new AuthSetupError("Sign-in setup is incomplete.");
  }
  if (!/^[a-z0-9-]+$/.test(region) || !userPoolId.startsWith(`${region}_`)) {
    throw new AuthSetupError("Sign-in setup is incomplete.");
  }

  return {
    region,
    userPoolId,
    clientId,
    allowedSubjects,
    multiUser,
    secret: createHash("sha256").update(secretText, "utf8").digest(),
  };
}

export function isSafeNextPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return false;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return false;
  try {
    const parsed = new URL(value, "https://deems.invalid");
    return parsed.origin === "https://deems.invalid";
  } catch {
    return false;
  }
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const receivedOrigin = new URL(origin);
    const requestOrigin = getEffectiveRequestOrigin(request);
    return requestOrigin !== null && receivedOrigin.origin === requestOrigin;
  } catch {
    return false;
  }
}

export function getEffectiveRequestOrigin(request: Request): string | null {
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host")?.trim() || requestUrl.host;
    if (!host || /[\s/@?#\\,]/.test(host)) return null;
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim().toLowerCase();
    const protocol = forwardedProto || requestUrl.protocol.slice(0, -1).toLowerCase();
    if (protocol !== "http" && protocol !== "https") return null;
    const effective = new URL(`${protocol}://${host}`);
    if (effective.username || effective.password) return null;
    return effective.origin;
  } catch {
    return null;
  }
}

export async function readBoundedJson(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  let text = "";
  const reader = request.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel();
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

let jwksCache: { uri: string; keys: ReturnType<typeof createRemoteJWKSet> } | undefined;
function remoteJwks(region: string, userPoolId: string) {
  const uri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  if (jwksCache?.uri !== uri) jwksCache = { uri, keys: createRemoteJWKSet(new URL(uri), { timeoutDuration: JWKS_TIMEOUT_MS }) };
  return jwksCache.keys;
}

export async function verifyIdToken(token: string, env: AuthEnvironment): Promise<JWTPayload> {
  const issuer = `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}`;
  const { payload } = await jwtVerify(token, remoteJwks(env.region, env.userPoolId), {
    algorithms: ["RS256"], issuer, audience: env.clientId,
    requiredClaims: ["exp", "iat", "sub", "token_use"], clockTolerance: 5,
  });
  if (payload.token_use !== "id" || typeof payload.sub !== "string") {
    throw new Error("Token is not authorized for this Deems workspace.");
  }
  if (env.multiUser) {
    if (payload.email_verified !== true || typeof payload.email !== "string") throw new AuthSubjectDeniedError();
  } else if (!env.allowedSubjects.has(payload.sub)) throw new AuthSubjectDeniedError();
  return payload;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE): string {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
}

export function setSessionCookie(headers: Headers, token: string, maxAge = SESSION_MAX_AGE): void {
  headers.append("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${sessionCookieOptions(maxAge)}`);
}

export function setChallengeCookie(headers: Headers, value: string): void {
  headers.append("Set-Cookie", `${CHALLENGE_COOKIE}=${encodeURIComponent(value)}; ${sessionCookieOptions(CHALLENGE_MAX_AGE)}`);
}

export function clearAuthCookies(headers: Headers): void {
  headers.append("Set-Cookie", `${SESSION_COOKIE}=; ${sessionCookieOptions(0)}`);
  headers.append("Set-Cookie", `${CHALLENGE_COOKIE}=; ${sessionCookieOptions(0)}`);
}

export function clearChallengeCookie(headers: Headers): void {
  headers.append("Set-Cookie", `${CHALLENGE_COOKIE}=; ${sessionCookieOptions(0)}`);
}

export async function createChallengeEnvelope(
  challenge: { name: string; session: string; username: string },
  env: AuthEnvironment,
): Promise<string> {
  return new EncryptJWT(challenge)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuer(`https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}`)
    .setAudience(env.clientId)
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_MAX_AGE}s`)
    .encrypt(env.secret);
}

export async function readChallengeEnvelope(value: string, env: AuthEnvironment) {
  const { payload } = await jwtDecrypt(value, env.secret, {
    issuer: `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}`,
    audience: env.clientId,
    keyManagementAlgorithms: ["dir"],
    contentEncryptionAlgorithms: ["A256GCM"],
    clockTolerance: 2,
  });
  const name = payload.name;
  const session = payload.session;
  const username = payload.username;
  if (typeof name !== "string" || typeof session !== "string" || typeof username !== "string") {
    throw new Error("Invalid authentication challenge.");
  }
  return { name, session, username };
}

export async function cognitoRequest<T>(
  target: "InitiateAuth" | "RespondToAuthChallenge" | "SignUp" | "ConfirmSignUp" | "ResendConfirmationCode" | "ForgotPassword" | "ConfirmForgotPassword",
  body: Record<string, unknown>,
  region: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COGNITO_TIMEOUT_MS);
  try {
    const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let byteCount = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          byteCount += value.byteLength;
          if (byteCount > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new Error("Cognito response was too large.");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new Error("Cognito returned an invalid response."); }
    if (!response.ok) {
      const error = data as { __type?: string; code?: string };
      const code = (error.__type ?? error.code ?? "").split("#").pop()?.split(":").pop();
      if (code === "UserNotConfirmedException") {
        throw Object.assign(new Error("Verify your email before signing in."), { status: 403, code: "verification_required" });
      }
      if (code === "UsernameExistsException") {
        throw Object.assign(new Error("Try signing in or resetting your password."), { status: 409 });
      }
      if (code === "InvalidPasswordException" || code === "PasswordHistoryPolicyViolationException") {
        throw Object.assign(new Error("Choose a new password with at least 12 characters."), { status: 400 });
      }
      if (code === "TooManyRequestsException" || code === "LimitExceededException") {
        throw Object.assign(new Error("Too many sign-in attempts. Try again shortly."), { status: 429 });
      }
      if (code === "NotAuthorizedException" || code === "UserNotFoundException" || code === "PasswordResetRequiredException") {
        throw Object.assign(new Error("Email or password was not accepted."), { status: 401 });
      }
      if (code === "CodeMismatchException" || code === "ExpiredCodeException" || code === "InvalidParameterException") {
        throw Object.assign(new Error("The verification code or challenge was not accepted."), { status: 400 });
      }
      throw Object.assign(new Error("Sign-in is temporarily unavailable."), { status: 502 });
    }
    if (!data || typeof data !== "object") throw new Error("Cognito returned an invalid response.");
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
  }
  return null;
}

export const AUTH_COOKIE_NAMES = { session: SESSION_COOKIE, challenge: CHALLENGE_COOKIE } as const;

export function registrationEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEEMS_MULTIUSER === "true" && env.DEEMS_SIGNUP_ENABLED === "true";
}

export function isAdmin(claims: JWTPayload): boolean {
  const groups = claims["cognito:groups"];
  return Array.isArray(groups) && groups.includes("admin");
}
