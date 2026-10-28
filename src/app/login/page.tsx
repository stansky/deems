"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import "./login.css";
import { DeemsBrand } from "@/components/brand";
import { Registration } from "./registration";
import { notifyAccountChange } from "@/components/workspace-client";

type Challenge = "SOFTWARE_TOKEN_MFA" | "SMS_MFA" | "NEW_PASSWORD_REQUIRED";
type LoginResponse = {
  authenticated?: boolean;
  challenge?: Challenge;
  error?: string;
  code?: string;
  registrationEnabled?: boolean;
};
type Screen = "signin" | "challenge" | "signup" | "confirm" | "recover";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const destination = new URL(value, window.location.origin);
    if (destination.origin !== window.location.origin) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

async function readResponse(response: Response): Promise<LoginResponse> {
  try {
    return await response.json() as LoginResponse;
  } catch {
    return {};
  }
}

function responseMessage(response: Response, body: LoginResponse): string {
  if (response.status === 503) return "Sign-in is not configured for this environment yet. Contact your workspace administrator.";
  if (body.error?.trim()) return body.error.trim();
  if (response.status === 401) return "The email or password could not be verified. Check your details and try again.";
  return "Sign-in could not be completed. Try again.";
}

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>("signin");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const nextPath = useRef("/");

  useEffect(() => {
    let active = true;
    nextPath.current = safeNext(new URLSearchParams(window.location.search).get("next"));
    
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", { method: "GET", cache: "no-store", credentials: "same-origin" });
        const body = await readResponse(response);
        if (!active) return;
        setRegistrationEnabled(body.registrationEnabled === true);
        if (body.registrationEnabled === true && new URLSearchParams(window.location.search).get("mode") === "signup") setScreen("signup");
        if (response.ok && body.authenticated) {
          window.location.replace(nextPath.current);
          return;
        }
        if (response.status === 503) setNotice(responseMessage(response, body));
      } catch {
        if (active) setNotice("Your sign-in session could not be checked. You can still try to sign in.");
      } finally {
        if (active) setSessionChecked(true);
      }
    }
    void checkSession();
    return () => { active = false; };
  }, []);

  function finishSignIn() {
    notifyAccountChange();
    window.location.replace(nextPath.current);
  }

  async function send(path: "/api/auth/login" | "/api/auth/challenge", data: Record<string, string>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await readResponse(response);
      if (body.code === "verification_required") {
        setScreen("confirm"); setPassword(""); return;
      }
      if (response.status === 200 && body.authenticated) {
        finishSignIn();
        return;
      }
      if (response.status === 202 && body.challenge && ["SOFTWARE_TOKEN_MFA", "SMS_MFA", "NEW_PASSWORD_REQUIRED"].includes(body.challenge)) {
        setChallenge(body.challenge);
        setScreen("challenge");
        setCode("");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        return;
      }
      setError(responseMessage(response, body));
    } catch {
      setError("Could not reach the sign-in service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send("/api/auth/login", { username: email.trim(), password });
  }

  function submitChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challenge === "NEW_PASSWORD_REQUIRED") {
      if (newPassword !== confirmPassword) {
        setError("The new passwords do not match.");
        return;
      }
      void send("/api/auth/challenge", { newPassword });
      return;
    }
    void send("/api/auth/challenge", { code: code.trim() });
  }

  function returnToSignIn() {
    setPassword("");
    setScreen("signin");
    setChallenge(null);
    setError("");
    setNotice("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const title = challenge === "SOFTWARE_TOKEN_MFA"
    ? "Authenticator code"
    : challenge === "SMS_MFA"
      ? "Text message code"
      : challenge === "NEW_PASSWORD_REQUIRED"
        ? "Choose a new password"
        : "Welcome back";

  const accountForm = screen === "signup" || screen === "confirm" || screen === "recover";
  return <main className="deems-login-page">
    <section className={`deems-login-card${accountForm ? " deems-login-card-registration" : ""}`} aria-labelledby="login-title">
      <header className="deems-login-brand"><DeemsBrand /></header>

      <div className="deems-login-content">
      {screen === "signup" || screen === "confirm" || screen === "recover" ? <Registration key={screen} initialMode={screen} initialEmail={email} onBack={returnToSignIn} onComplete={(address, message) => { setEmail(address); returnToSignIn(); setNotice(message); }} /> : <>
      <div className="deems-login-heading">
        <h1 id="login-title">{title}</h1>
        <p>{screen === "signin" ? "Your personal space to learn and grow." : challenge === "NEW_PASSWORD_REQUIRED"
            ? "Your account needs a new password before you can continue."
            : `Enter the verification code for ${email}.`}</p>
      </div>

      {notice && <p className="deems-login-notice" role="status">{notice}</p>}
      {error && <p className="deems-login-error" role="alert">{error}</p>}

      {screen === "signin" ? <form className="deems-login-form" onSubmit={submitSignIn}>
        <label className="deems-login-field" htmlFor="login-email">
          <span>Email</span>
          <input id="login-email" name="username" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <div className="deems-login-field">
          <div className="deems-login-password-label"><label htmlFor="login-password">Password</label><button className="deems-login-forgot" type="button" onClick={() => { setError(""); setScreen("recover"); }} disabled={busy}>Forgot password?</button></div>
          <span className="deems-login-password-wrap">
            <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" className="deems-login-reveal" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </span>
        </div>
        <button className="deems-login-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="deems-login-spinner" aria-hidden="true" /> Signing in</> : "Sign in"}
        </button>
        {registrationEnabled && <button className="deems-login-back" type="button" onClick={() => { setError(""); setScreen("signup"); }} disabled={busy}>Create an account</button>}
      </form> : <form className="deems-login-form" onSubmit={submitChallenge}>
        {challenge === "NEW_PASSWORD_REQUIRED" ? <>
          <div className="deems-login-field">
            <label htmlFor="login-new-password">New password</label>
            <span className="deems-login-password-wrap">
              <input id="login-new-password" name="newPassword" type={showNewPassword ? "text" : "password"} autoComplete="new-password" required value={newPassword} onChange={event => setNewPassword(event.target.value)} />
              <button type="button" className="deems-login-reveal" onClick={() => setShowNewPassword(value => !value)} aria-label={showNewPassword ? "Hide new password" : "Show new password"} aria-pressed={showNewPassword}>
                {showNewPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </span>
          </div>
          <div className="deems-login-field">
            <label htmlFor="login-confirm-password">Confirm new password</label>
            <span className="deems-login-password-wrap">
              <input id="login-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              <button type="button" className="deems-login-reveal" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword}>
                {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </span>
          </div>
        </> : <label className="deems-login-field" htmlFor="login-code">
          <span>{challenge === "SMS_MFA" ? "Text message code" : "Authenticator code"}</span>
          <input id="login-code" name="code" type="text" autoComplete="one-time-code" inputMode="numeric" autoCapitalize="none" spellCheck={false} required value={code} onChange={event => setCode(event.target.value)} />
        </label>}
        <button className="deems-login-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="deems-login-spinner" aria-hidden="true" /> Verifying</> : challenge === "NEW_PASSWORD_REQUIRED" ? "Set password" : "Verify code"}
        </button>
        <button className="deems-login-back" type="button" onClick={returnToSignIn} disabled={busy}>Back to sign in</button>
      </form>}
      </>}
      </div>

      {!accountForm && <footer className="deems-login-footer">
        <span>{sessionChecked ? "Your workspace is private to your account" : "Checking sign-in session"}</span>
      </footer>}
    </section>
    <aside className="deems-login-art-panel" aria-label="An illustrated learning studio">
      <img className="deems-login-scene" src="/brand/learning-studio.webp" alt="" aria-hidden="true" width="1024" height="1536" fetchPriority="high" />
      <div className="deems-login-scene-copy"><p>Your personal learning space</p><h2>Make room for<br />what’s next.</h2></div>
    </aside>
  </main>;
}
