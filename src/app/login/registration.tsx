"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { authRegistrationSchema, authRegistrationResponseSchema } from "@/contracts/auth";

type Mode = "signup" | "confirm" | "recover" | "reset";
export function Registration({ initialMode, initialEmail, onBack, onComplete }: {
  initialMode: Mode; initialEmail: string; onBack: () => void;
  onComplete: (email: string, message: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const needsPassword = mode === "signup" || mode === "reset";
  const needsCode = mode === "confirm" || mode === "reset";

  async function send(action: Mode | "resend") {
    const input = { action, email: email.trim(), ...(action === "signup" || action === "reset" ? { password } : {}), ...(action === "confirm" || action === "reset" ? { code: code.trim() } : {}) };
    const parsed = authRegistrationSchema.safeParse(input);
    if (!parsed.success) { setError("Enter a valid email, a password with at least 12 characters, and a six-digit code where requested."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(parsed.data) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "The account request could not be completed.";
        throw new Error(message);
      }
      authRegistrationResponseSchema.parse(body);
      if (action === "signup") {
        setMode("confirm"); setPassword(""); setNotice("Check your inbox for a six-digit code. Already have an account? Sign in instead.");
      } else if (action === "confirm") {
        onComplete(email.trim(), "Email verified. Sign in to open your workspace.");
      } else if (action === "recover") {
        setMode("reset"); setNotice("If an account uses this email, a reset code is on its way.");
      } else if (action === "reset") {
        setPassword(""); onComplete(email.trim(), "Password updated. You can sign in now.");
      } else setNotice("If verification is needed, a new code is on its way.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not reach the account service."); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(mode); }
  const title = mode === "signup" ? "Create your account" : mode === "confirm" ? "Verify your email" : mode === "recover" ? "Reset your password" : "Choose a new password";
  return <>
    <div className="deems-login-heading">
      <h1 id="login-title">{title}</h1>
      <p>{needsCode ? `Enter the six-digit code sent to ${email}.` : mode === "signup" ? "Your interview prep, in your own private workspace." : "We’ll email you a code to reset your password."}</p>
    </div>
    {notice && <p className="deems-login-notice" role="status">{notice}</p>}
    {error && <p className="deems-login-error" role="alert">{error}</p>}
    <form className="deems-login-form" onSubmit={submit}>
      {!needsCode && <label className="deems-login-field" htmlFor="account-email">
        <span>Email</span>
        <input id="account-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={320} required value={email} onChange={event => setEmail(event.target.value)} />
      </label>}
      {needsCode && <label className="deems-login-field" htmlFor="account-code">
        <span>Verification code</span>
        <input id="account-code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value)} />
      </label>}
      {needsPassword && <div className="deems-login-field">
        <label htmlFor="account-password">{mode === "reset" ? "New password" : "Password"}</label>
        <span className="deems-login-password-wrap">
          <input id="account-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} aria-describedby="account-password-help" />
          <button type="button" className="deems-login-reveal" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>{visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
        </span>
        <small id="account-password-help">At least 12 characters.</small>
      </div>}
      <button className="deems-login-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="deems-login-spinner" aria-hidden="true" /> Please wait</> : mode === "signup" ? "Create account" : mode === "confirm" ? "Verify email" : mode === "recover" ? "Send reset code" : "Update password"}</button>
      {mode === "confirm" && <button className="deems-login-back" type="button" onClick={() => { void send("resend"); }} disabled={busy}>Resend code</button>}
      <button className="deems-login-back" type="button" onClick={onBack} disabled={busy}>Back to sign in</button>
    </form>
  </>;
}
