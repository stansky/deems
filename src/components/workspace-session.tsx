"use client";

import { useEffect, useState, type ReactNode } from "react";
import { authResponseSchema } from "@/contracts/auth";
import { setBrowserWorkspace } from "./workspace-client";
import "./workspace-session.css";

export function WorkspaceSession({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Session unavailable.");
      const session = authResponseSchema.parse(await response.json());
      if (!active) return;
      if (session.authRequired === false) setBrowserWorkspace("");
      else if (session.authenticated && session.workspaceKey) setBrowserWorkspace(session.workspaceKey);
      else { window.location.replace("/login"); return; }
      setReady(true);
    }).catch(() => { if (active) setError(true); });
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("deems-account");
    if (channel) channel.onmessage = () => window.location.reload();
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => { active = false; channel?.close(); window.removeEventListener("pageshow", restored); };
  }, []);
  if (!ready) return <main className="workspace-boot"><div role="status">{error ? <>Could not open your workspace. <button type="button" onClick={() => window.location.reload()}>Retry</button></> : "Opening your workspace…"}</div></main>;
  return children;
}
