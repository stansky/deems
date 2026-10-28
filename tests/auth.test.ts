import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { NextRequest } from "next/server";
import {
  AuthSetupError, AuthSubjectDeniedError, createChallengeEnvelope, getAuthEnvironment, hasSameOrigin,
  getEffectiveRequestOrigin, isSafeNextPath, readBoundedJson, readChallengeEnvelope, sessionCookieOptions,
  verifyIdToken,
} from "../src/domains/auth/server";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { POST as challengePost } from "../src/app/api/auth/challenge/route";
import { POST as registerPost } from "../src/app/api/auth/register/route";
import { workspaceSchema } from "../src/domains/auth/workspace-key";
import { proxy } from "../src/proxy";

const issuer = "https://cognito-idp.us-west-1.amazonaws.com/us-west-1_testPool";
const keyId = "test-key";
const authEnvironmentKeys = [
  "DEEMS_AUTH_ENABLED", "DEEMS_HOSTED_READY", "VERCEL", "DEEMS_COGNITO_REGION",
  "DEEMS_COGNITO_USER_POOL_ID", "DEEMS_COGNITO_CLIENT_ID", "DEEMS_COGNITO_ALLOWED_SUBS", "DEEMS_AUTH_SECRET",
  "DEEMS_MULTIUSER",
] as const;

function testEnvironment(overrides: Record<string, string> = {}) {
  return getAuthEnvironment({
    DEEMS_COGNITO_REGION: "us-west-1",
    DEEMS_COGNITO_USER_POOL_ID: "us-west-1_testPool",
    DEEMS_COGNITO_CLIENT_ID: "public-client",
    DEEMS_COGNITO_ALLOWED_SUBS: "allowed-user",
    DEEMS_AUTH_SECRET: "a session secret with more than 32 characters",
    ...overrides,
  });
}

async function withProxyAuthEnvironment<T>(operation: () => Promise<T>, configured: boolean): Promise<T> {
  const previous = Object.fromEntries(authEnvironmentKeys.map((key) => [key, process.env[key]]));
  process.env.DEEMS_AUTH_ENABLED = "true";
  process.env.DEEMS_MULTIUSER = "false";
  delete process.env.VERCEL;
  delete process.env.DEEMS_HOSTED_READY;
  if (configured) {
    process.env.DEEMS_COGNITO_REGION = "us-west-1";
    process.env.DEEMS_COGNITO_USER_POOL_ID = "us-west-1_testPool";
    process.env.DEEMS_COGNITO_CLIENT_ID = "public-client";
    process.env.DEEMS_COGNITO_ALLOWED_SUBS = "allowed-user";
    process.env.DEEMS_AUTH_SECRET = "a session secret with more than 32 characters";
  } else {
    for (const key of authEnvironmentKeys) {
      if (key.startsWith("DEEMS_COGNITO_") || key === "DEEMS_AUTH_SECRET") delete process.env[key];
    }
  }
  try {
    return await operation();
  } finally {
    for (const key of authEnvironmentKeys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("auth setup fails closed with a generic message when required values are missing", () => {
  assert.throws(() => testEnvironment({ DEEMS_COGNITO_ALLOWED_SUBS: "" }), (error: unknown) => {
    assert.ok(error instanceof AuthSetupError);
    assert.equal(error.message, "Sign-in setup is incomplete.");
    assert.doesNotMatch(error.message, /DEEMS_COGNITO|CLIENT_ID|ALLOWED_SUBS/);
    return true;
  });
  assert.throws(() => testEnvironment({ DEEMS_AUTH_SECRET: "short" }), AuthSetupError);
});

test("next paths reject external, protocol-relative, and backslash forms", () => {
  assert.equal(isSafeNextPath("/workspace?tab=practice"), true);
  assert.equal(isSafeNextPath("/"), true);
  assert.equal(isSafeNextPath("//evil.example/path"), false);
  assert.equal(isSafeNextPath("/\\evil.example"), false);
  assert.equal(isSafeNextPath("https://evil.example"), false);
});

test("same-origin validation requires an exact origin", () => {
  assert.equal(hasSameOrigin(new Request("https://deems.dev/api/auth/login", { headers: { origin: "https://deems.dev" } })), true);
  assert.equal(hasSameOrigin(new Request("https://deems.dev/api/auth/login", { headers: { origin: "https://evil.example" } })), false);
  assert.equal(hasSameOrigin(new Request("https://deems.dev/api/auth/login")), false);
  const forwarded = new Request("http://0.0.0.0:3000/api/auth/login", {
    headers: { host: "deems.app", "x-forwarded-proto": "https", origin: "https://deems.app" },
  });
  assert.equal(getEffectiveRequestOrigin(forwarded), "https://deems.app");
  assert.equal(hasSameOrigin(forwarded), true);
  assert.equal(hasSameOrigin(new Request(forwarded.url, {
    headers: { host: "deems.app", "x-forwarded-proto": "https", origin: "https://other.example" },
  })), false);
});

test("request JSON is bounded and object-shaped", async () => {
  assert.deepEqual(await readBoundedJson(new Request("https://deems.dev", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "a" }),
  })), { username: "a" });
  assert.equal(await readBoundedJson(new Request("https://deems.dev", {
    method: "POST", headers: { "content-length": "20000" }, body: "{}",
  })), null);
  assert.equal(await readBoundedJson(new Request("https://deems.dev", { method: "POST", body: "[]" })), null);
});

test("challenge envelope encrypts Cognito session data and expires it quickly", async () => {
  const env = testEnvironment();
  const envelope = await createChallengeEnvelope({ name: "SOFTWARE_TOKEN_MFA", session: "cognito-session", username: "person@example.com" }, env);
  assert.equal(envelope.split(".").length, 5);
  assert.deepEqual(await readChallengeEnvelope(envelope, env), {
    name: "SOFTWARE_TOKEN_MFA", session: "cognito-session", username: "person@example.com",
  });
  await assert.rejects(() => readChallengeEnvelope(envelope, testEnvironment({ DEEMS_AUTH_SECRET: "another secret that is also longer than 32 chars" })));
  await assert.rejects(() => readChallengeEnvelope(envelope, testEnvironment({ DEEMS_COGNITO_CLIENT_ID: "other-client" })));
});

test("session cookies are host-only, secure, HttpOnly, and SameSite Lax", () => {
  const options = sessionCookieOptions(3600);
  assert.match(options, /HttpOnly/);
  assert.match(options, /Secure/);
  assert.match(options, /SameSite=Lax/);
  assert.match(options, /Path=\//);
  assert.doesNotMatch(options, /Domain=/i);
});

test("Cognito ID token verifies signature, issuer, client, token use, expiry, and allowed subject", async () => {
  const env = testEnvironment();
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid: keyId, use: "sig", alg: "RS256" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes(".well-known/jwks.json")) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    throw new Error("Unexpected network request in test");
  };
  try {
    const makeToken = (options: {
      claims?: Record<string, unknown>;
      exp?: number;
      includeExp?: boolean;
      includeIat?: boolean;
      iss?: string;
      aud?: string;
      sub?: string;
    } = {}) => {
      let token = new SignJWT(options.claims ?? { token_use: "id" })
        .setProtectedHeader({ alg: "RS256", kid: keyId });
      if (options.iss !== "") token = token.setIssuer(options.iss ?? issuer);
      if (options.aud !== "") token = token.setAudience(options.aud ?? "public-client");
      if (options.sub !== "") token = token.setSubject(options.sub ?? "allowed-user");
      if (options.includeIat !== false) token = token.setIssuedAt();
      if (options.includeExp !== false) token = token.setExpirationTime(options.exp ?? Math.floor(Date.now() / 1000) + 60);
      return token.sign(privateKey);
    };

    assert.equal((await verifyIdToken(await makeToken(), env)).sub, "allowed-user");
    const multiUser = { ...env, multiUser: true, allowedSubjects: new Set<string>() };
    const verifiedAccount = await makeToken({ sub: "new-account", claims: { token_use: "id", email: "account@example.com", email_verified: true } });
    assert.equal((await verifyIdToken(verifiedAccount, multiUser)).sub, "new-account");
    await assert.rejects(async () => verifyIdToken(await makeToken({ claims: { token_use: "id", email: "account@example.com", email_verified: false } }), multiUser), AuthSubjectDeniedError);
    await assert.rejects(async () => verifyIdToken(await makeToken(), multiUser), AuthSubjectDeniedError);
    await withProxyAuthEnvironment(async () => {
      const token = await makeToken();
      const stale = await proxy(new NextRequest("https://deems.dev/api/workspace", { headers: { cookie: `deems_session=${token}`, "x-deems-workspace": workspaceSchema("different-account") } }));
      assert.equal(stale.status, 409);
      assert.equal((await stale.json()).code, "workspace_changed");
      const own = await proxy(new NextRequest("https://deems.dev/api/workspace", { headers: { cookie: `deems_session=${token}`, "x-deems-workspace": workspaceSchema("allowed-user") } }));
      assert.equal(own.status, 200);
      assert.equal(own.headers.get("cache-control"), "private, no-store");
    }, true);
    await assert.rejects(async () => verifyIdToken(await makeToken({ claims: { token_use: "access" } }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ exp: Math.floor(Date.now() / 1000) - 60 }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ includeExp: false }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ includeIat: false }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ aud: "other-client" }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ iss: "https://wrong-issuer.example" }), env));
    await assert.rejects(async () => verifyIdToken(await makeToken({ sub: "someone-else" }), env), AuthSubjectDeniedError);
    const tampered = await makeToken();
    const pieces = tampered.split(".");
    pieces[2] = `${pieces[2].startsWith("A") ? "B" : "A"}${pieces[2].slice(1)}`;
    await assert.rejects(() => verifyIdToken(pieces.join("."), env));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auth APIs reject malformed and missing sign-in fields", async () => {
  const origin = "https://deems.dev";
  const malformed = await loginPost(new Request(`${origin}/api/auth/login`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: "{bad-json",
  }));
  assert.equal(malformed.status, 400);
  const missing = await loginPost(new Request(`${origin}/api/auth/login`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ username: "person@example.com" }),
  }));
  assert.equal(missing.status, 400);
  const reverseProxied = await loginPost(new Request("http://0.0.0.0:3000/api/auth/login", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3141", "x-forwarded-proto": "http", origin: "http://127.0.0.1:3141",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(reverseProxied.status, 400);

  const missingChallenge = await challengePost(new Request(`${origin}/api/auth/challenge`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({}),
  }));
  assert.equal(missingChallenge.status, 400);
});

test("auth challenge API rejects unsupported challenge types", async () => {
  const keys = [
    "DEEMS_COGNITO_REGION", "DEEMS_COGNITO_USER_POOL_ID", "DEEMS_COGNITO_CLIENT_ID",
    "DEEMS_COGNITO_ALLOWED_SUBS", "DEEMS_AUTH_SECRET",
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.DEEMS_COGNITO_REGION = "us-west-1";
  process.env.DEEMS_COGNITO_USER_POOL_ID = "us-west-1_testPool";
  process.env.DEEMS_COGNITO_CLIENT_ID = "public-client";
  process.env.DEEMS_COGNITO_ALLOWED_SUBS = "allowed-user";
  process.env.DEEMS_AUTH_SECRET = "a session secret with more than 32 characters";
  try {
    const newPasswordEnvelope = await createChallengeEnvelope({ name: "NEW_PASSWORD_REQUIRED", session: "session", username: "person@example.com" }, testEnvironment());
    const tooShortPassword = await challengePost(new Request("https://deems.dev/api/auth/challenge", {
      method: "POST",
      headers: { origin: "https://deems.dev", cookie: `deems_auth_challenge=${encodeURIComponent(newPasswordEnvelope)}`, "content-type": "application/json" },
      body: JSON.stringify({ newPassword: "short" }),
    }));
    assert.equal(tooShortPassword.status, 400);

    const envelope = await createChallengeEnvelope({ name: "UNSUPPORTED", session: "session", username: "person@example.com" }, testEnvironment());
    const response = await challengePost(new Request("https://deems.dev/api/auth/challenge", {
      method: "POST",
      headers: { origin: "https://deems.dev", cookie: `deems_auth_challenge=${encodeURIComponent(envelope)}`, "content-type": "application/json" },
      body: JSON.stringify({ code: "123456" }),
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "This sign-in challenge is not supported." });
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("proxy fails closed for missing auth setup and allows the login endpoint", async () => {
  await withProxyAuthEnvironment(async () => {
    const missing = await proxy(new NextRequest("https://deems.dev/workspace"));
    assert.equal(missing.status, 503);
    assert.equal(await missing.text(), "Sign-in setup is incomplete.");
  }, false);
});

test("proxy challenges every unauthenticated dynamic HTML and API route", async () => {
  await withProxyAuthEnvironment(async () => {
    const login = await proxy(new NextRequest("https://deems.dev/login"));
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("location"), null);

    const api = await proxy(new NextRequest("https://deems.dev/api/practice"));
    assert.equal(api.status, 401);
    assert.deepEqual(await api.json(), { error: "authentication_required" });

    const html = await proxy(new NextRequest("http://0.0.0.0:3000/workspace?tab=practice", {
      headers: { host: "deems.dev", "x-forwarded-proto": "https" },
    }));
    assert.equal(html.status, 307);
    const destination = new URL(html.headers.get("location") ?? "https://deems.dev/");
    assert.equal(destination.origin, "https://deems.dev");
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("next"), "/workspace?tab=practice");
  }, true);
});

test("proxy allows static assets without auth configuration", async () => {
  await withProxyAuthEnvironment(async () => {
    const asset = await proxy(new NextRequest("https://deems.dev/_next/static/chunks/app.js"));
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("location"), null);
    const brand = await proxy(new NextRequest("https://deems.dev/brand/deems-mark.svg"));
    assert.equal(brand.status, 200);
    const image = await proxy(new NextRequest("https://deems.dev/_next/image?url=%2Flogo.png"));
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("location"), null);
  }, false);
});

test("registration requires same-origin bounded inputs, verified codes and an enabled account mode", async () => {
  const request = (body: unknown, origin = "https://deems.dev") => new Request("https://deems.dev/api/auth/register", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await registerPost(request({ action: "signup", email: "test@example.com", password: "a valid long password" }, "https://other.example"))).status, 403);
  assert.equal((await registerPost(request({ action: "signup", email: "test@example.com", password: "short" }))).status, 400);
  assert.equal((await registerPost(request({ action: "confirm", email: "test@example.com", code: "123", workspaceId: "another-user" }))).status, 400);
  await withProxyAuthEnvironment(async () => {
    assert.equal((await registerPost(request({ action: "recover", email: "test@example.com" }))).status, 403);
    process.env.DEEMS_MULTIUSER = "true";
    const previousSignup = process.env.DEEMS_SIGNUP_ENABLED;
    process.env.DEEMS_SIGNUP_ENABLED = "true";
    const oldFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = async (_input, init) => {
      const target = new Headers(init?.headers).get("X-Amz-Target") ?? "";
      calls.push(target.split(".").pop()!);
      return new Response("{}", { status: 200 });
    };
    try {
      for (const body of [
        { action: "signup", email: "test@example.com", password: "a valid long password" },
        { action: "confirm", email: "test@example.com", code: "123456" },
        { action: "resend", email: "test@example.com" },
        { action: "recover", email: "test@example.com" },
        { action: "reset", email: "test@example.com", code: "123456", password: "another valid password" },
      ]) assert.equal((await registerPost(request(body))).status, 200);
      assert.deepEqual(calls, ["SignUp", "ConfirmSignUp", "ResendConfirmationCode", "ForgotPassword", "ConfirmForgotPassword"]);
      globalThis.fetch = async () => new Response(JSON.stringify({ __type: "UsernameExistsException" }), { status: 400 });
      const exists = await registerPost(request({ action: "signup", email: "test@example.com", password: "a valid long password" }));
      assert.equal(exists.status, 200);
      assert.deepEqual(await exists.json(), { accepted: true, confirmationRequired: true });
    } finally { globalThis.fetch = oldFetch; if (previousSignup === undefined) delete process.env.DEEMS_SIGNUP_ENABLED; else process.env.DEEMS_SIGNUP_ENABLED = previousSignup; }
  }, true);
});

test("registration defaults closed and robots excludes all crawlers", async () => {
  const previous = process.env.DEEMS_SIGNUP_ENABLED; delete process.env.DEEMS_SIGNUP_ENABLED;
  try {
    await withProxyAuthEnvironment(async () => {
      process.env.DEEMS_MULTIUSER = "true";
      const response = await registerPost(new Request("https://deems.dev/api/auth/register", {method:"POST",headers:{origin:"https://deems.dev","Content-Type":"application/json"},body:JSON.stringify({action:"signup",email:"test@example.com",password:"a valid long password"})}));
      assert.equal(response.status,403);
    }, true);
    const robots = await proxy(new NextRequest("https://deems.dev/robots.txt"));
    assert.equal(robots.status,200); assert.match(await robots.text(), /Disallow: \//);
  } finally { if (previous !== undefined) process.env.DEEMS_SIGNUP_ENABLED = previous; }
});
