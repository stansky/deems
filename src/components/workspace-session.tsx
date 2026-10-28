"use client";

import { useEffect, useState, type ReactNode } from "react";
import { authResponseSchema } from "@/contracts/auth";
import { setBrowserWorkspace } from "./workspace-client";
import { BrandState } from "./brand";
import { Button } from "./ui";
import "./workspace-session.css";

export function WorkspaceSession({ children }: { children: ReactNode }) {
  const [showLoading, setShowLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const reveal = window.setTimeout(() => setShowLoading(true), 250);
    const deadline = window.setTimeout(() => controller.abort(), 15000);
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Session unavailable.");
      const session = authResponseSchema.parse(await response.json());
      if (!active) return;
      if (session.authRequired === false) setBrowserWorkspace("");
      else if (session.authenticated && session.workspaceKey) setBrowserWorkspace(session.workspaceKey);
      else { window.location.replace("/login"); return; }
      setReady(true);
    }).catch(() => { if (active) setError(true); }).finally(() => window.clearTimeout(deadline));
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("deems-account");
    if (channel) channel.onmessage = () => window.location.reload();
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => { active = false; controller.abort(); window.clearTimeout(reveal); window.clearTimeout(deadline); channel?.close(); window.removeEventListener("pageshow", restored); };
  }, []);
  if (!ready) return <main className="workspace-boot">{(showLoading || error) && <BrandState kind={error ? "error" : "loading"} title={error ? "Could not open your workspace" : "Opening your workspace"} description={error ? "Your saved work is unchanged. Check your connection and try again." : "Checking your private workspace…"} action={error ? <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button> : undefined} />}</main>;
  return children;
}
