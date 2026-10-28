"use client";

import { workspaceFetch } from "@/components/workspace-client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { companyBranding } from "@/data/company-branding";
import { researchCommandSchema, researchStateSchema, type ResearchState } from "@/contracts/company-research";
import type { TargetCompany } from "@/lib/target-types";
import "./company-research.css";

const focusOptions = ["AI engineering", "Full-stack", "Forward deployed", "Backend", "Frontend", "Management"] as const;
type Focus = typeof focusOptions[number];
type FormState = { name: string; websiteUrl: string; careersUrl: string; linkedinUrl: string; focus: Focus[] };
const blankState: ResearchState = { profiles: [], runs: [], sources: [], suggestions: [] };
function newKey() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join(""); }
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function canonicalHost(value: string) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }

export default function CompanyResearch({ companies, initialCompanyId, compact = false, onCompanyCreated }: { companies: TargetCompany[]; initialCompanyId?: string; compact?: boolean; onCompanyCreated?: (companyId: string) => Promise<void> | void }) {
  const [state, setState] = useState<ResearchState>(blankState);
  const [selectedId, setSelectedId] = useState(initialCompanyId ?? "");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", websiteUrl: "https://", careersUrl: "https://", linkedinUrl: "", focus: ["AI engineering", "Full-stack", "Forward deployed"] });
  const [profileDraft, setProfileDraft] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const createKey = useRef(newKey());
  const commandKey = useRef(newKey());
  const selected = companies.find(company => company.id === selectedId) ?? companies[0];
  const profile = state.profiles.find(item => item.companyId === selected?.id);
  const brand = selected ? companyBranding[selected.id] : undefined;
  const run = state.runs.filter(item => item.companyId === selected?.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
  const active = run?.status === "queued" || run?.status === "running";
  const sources = useMemo(() => state.sources.filter(item => item.companyId === selected?.id && item.runId === run?.id).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)), [state.sources, selected?.id, run?.id]);
  const suggestions = useMemo(() => state.suggestions.filter(item => item.companyId === selected?.id && item.runId === run?.id && item.status !== "dismissed"), [state.suggestions, selected?.id, run?.id]);

  const load = useCallback(async () => {
    try {
      const response = await workspaceFetch("/api/company-research", { cache: "no-store" });
      if (!response.ok) throw new Error("Company research is unavailable. Try again when the workspace is connected.");
      const next = researchStateSchema.parse(await response.json());
      setState(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load company research.");
      return null;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => window.clearInterval(timer);
  }, [active, load]);

  useEffect(() => {
    if (!selected) { setProfileDraft(null); return; }
    const current = profile;
    const fallback = companyBranding[selected.id];
    const websiteUrl = current?.websiteUrl ?? fallback?.websiteUrl ?? "https://";
    setProfileDraft({
      name: selected.name,
      websiteUrl,
      careersUrl: current?.careersUrl ?? (selected.careersUrl.startsWith("https://") ? selected.careersUrl : websiteUrl),
      linkedinUrl: current?.linkedinUrl ?? "",
      focus: (current?.focus ?? ["AI engineering", "Full-stack", "Forward deployed"]).filter((value): value is Focus => focusOptions.includes(value as Focus)),
    });
  }, [selected?.id, selected?.careersUrl, profile?.updatedAt, brand?.websiteUrl]);

  async function send(body: unknown) {
    setBusy(true); setError("");
    try {
      const command = researchCommandSchema.parse(body);
      const response = await workspaceFetch("/api/company-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save this research action.");
      const next = researchStateSchema.parse(payload);
      setState(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this research action.");
      return null;
    } finally { setBusy(false); }
  }

  async function createCompany(event: React.FormEvent) {
    event.preventDefault();
    const next = await send({ action: "createCompany", key: createKey.current, data: { name: form.name.trim(), websiteUrl: form.websiteUrl.trim(), careersUrl: form.careersUrl.trim(), linkedinUrl: form.linkedinUrl.trim() || null, focus: form.focus } });
    if (!next) return;
    createKey.current = newKey();
    setShowNew(false); setForm({ name: "", websiteUrl: "https://", careersUrl: "https://", linkedinUrl: "", focus: ["AI engineering", "Full-stack", "Forward deployed"] });
    const added = next.profiles.find(item => canonicalHost(item.websiteUrl) === canonicalHost(form.websiteUrl.trim()));
    if (added) { setSelectedId(added.companyId); await onCompanyCreated?.(added.companyId); }
  }

  async function researchAgain() {
    if (!selected || !profileDraft) return;
    const next = await send({ action: "researchCompany", key: commandKey.current, data: { companyId: selected.id, websiteUrl: profileDraft.websiteUrl.trim(), careersUrl: profileDraft.careersUrl.trim(), linkedinUrl: profileDraft.linkedinUrl.trim() || null, focus: profileDraft.focus } });
    if (next) { commandKey.current = newKey(); }
  }

  async function reviewSuggestion(suggestionId: string, decision: "accept" | "dismiss") {
    const next = await send({ action: "reviewSuggestion", key: commandKey.current, data: { suggestionId, decision } });
    if (next) { commandKey.current = newKey(); if (decision === "accept") await onCompanyCreated?.(selected?.id ?? ""); }
  }

  const addFocus = (value: Focus, current: Focus[]) => current.includes(value) ? current.filter(item => item !== value) : [...current, value];
  const renderFocus = (value: Focus[], update: (next: Focus[]) => void) => <fieldset className="cr-focus"><legend>Roles to look for</legend><div>{focusOptions.map(option => <label key={option}><input type="checkbox" checked={value.includes(option)} onChange={() => update(addFocus(option, value))} />{option}</label>)}</div></fieldset>;

  return <section className={`company-research ${compact ? "is-compact" : ""}`}>
    {!compact && <div className="cr-heading"><div><h2>Company research</h2><p>Review public sources and decide which roles belong in your pipeline.</p></div><button type="button" className="cr-action" onClick={() => setShowNew(value => !value)}><Plus size={15} />Add company</button></div>}
    {error && <p className="cr-error" role="alert">{error}</p>}
    {showNew && <form className="cr-form" onSubmit={createCompany}>
      <div className="cr-form-heading"><h3>New company</h3><button type="button" aria-label="Close company form" onClick={() => setShowNew(false)}><X size={16} /></button></div>
      <div className="cr-fields"><label>Company name<input required maxLength={160} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Website<input required type="url" value={form.websiteUrl} onChange={event => setForm({ ...form, websiteUrl: event.target.value })} /></label><label>Careers page<input required type="url" value={form.careersUrl} onChange={event => setForm({ ...form, careersUrl: event.target.value })} /></label><label>LinkedIn company page <span>optional</span><input type="url" value={form.linkedinUrl} onChange={event => setForm({ ...form, linkedinUrl: event.target.value })} /></label></div>
      {renderFocus(form.focus, focus => setForm({ ...form, focus }))}
      <button type="submit" className="cr-primary" disabled={busy || form.focus.length === 0}>{busy ? "Saving…" : "Save company"}</button>
    </form>}
    <div className="cr-layout">
      {!compact && <nav className="cr-company-list" aria-label="Companies to research">{companies.map(company => <button type="button" key={company.id} className={selected?.id === company.id ? "selected" : ""} onClick={() => setSelectedId(company.id)}><strong>{company.name}</strong><small>{state.runs.find(item => item.companyId === company.id)?.status === "running" ? "Researching" : company.researchStatus}</small></button>)}</nav>}
      {selected && profileDraft && <div className="cr-company-detail">
        {!compact && <div className="cr-company-title"><div><h3>{selected.name}</h3><p>{profile?.updatedAt ? `Company summary checked ${dateLabel(profile.updatedAt)}` : brand?.checkedAt ? `Company summary checked ${dateLabel(brand.checkedAt)}` : "Company summary"}</p></div>{profile?.descriptionSourceUrl && <a href={profile.descriptionSourceUrl} target="_blank" rel="noreferrer">Source<ExternalLink size={13} /></a>}</div>}
        {(!compact || !(brand?.overview || selected.summary || selected.focus)) && (profile?.overview || brand?.overview || selected.summary) && <p className="cr-overview">{profile?.overview || brand?.overview || selected.summary}</p>}
        {(!compact || !brand?.pitch) && (profile?.pitch || brand?.pitch) && <details className="cr-pitch"><summary>Elevator pitch</summary><p>{profile?.pitch || brand?.pitch}</p></details>}
        <div className="cr-run-toolbar"><strong>{run ? run.status === "queued" ? "Queued" : run.status === "running" ? "In progress" : run.status === "complete" ? "Complete" : run.status === "partial" ? "Partial" : "Failed" : "Not researched"}</strong><button type="button" className="cr-action" disabled={busy || active || !profileDraft.focus.length} onClick={researchAgain}><RefreshCw size={14} />{active ? "Researching…" : "Research again"}</button></div>
        {run?.error && <p className="cr-error" role="status">{run.error}</p>}
        {active && <div className="cr-progress" role="status"><Loader2 size={15} className="cr-spin" />Checking company and careers pages</div>}
        <details className="cr-profile-edit"><summary>Company links and role focus</summary><div className="cr-fields"><label>Website<input type="url" value={profileDraft.websiteUrl} onChange={event => setProfileDraft({ ...profileDraft, websiteUrl: event.target.value })} /></label><label>Careers page<input type="url" value={profileDraft.careersUrl} onChange={event => setProfileDraft({ ...profileDraft, careersUrl: event.target.value })} /></label><label>LinkedIn company page <span>optional</span><input type="url" value={profileDraft.linkedinUrl} onChange={event => setProfileDraft({ ...profileDraft, linkedinUrl: event.target.value })} /></label></div>{renderFocus(profileDraft.focus, focus => setProfileDraft({ ...profileDraft, focus }))}</details>
        <div className="cr-suggestions"><h4>Suggested roles <span>{suggestions.length}</span></h4>{suggestions.map(item => {
          const eligible = item.checks.officialSource && item.checks.detailFetched && !item.checks.duplicateRole && item.checks.activePosting !== "closed";
          return <article key={item.id}><div className="cr-suggestion-title"><div><h5>{item.title}</h5><span>{item.location || "Location not stated"}{item.status === "accepted" ? " · Added as prospect" : ""}</span></div><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><ExternalLink size={14} /></a></div>{item.excerpt && <p>{item.excerpt}</p>}<ul>{item.reasons.map((reason, index) => <li key={`${item.id}-${index}`}>{reason}</li>)}</ul><div className="cr-checks"><span>{item.checks.officialSource ? "Official source" : "Source not confirmed"}</span><span>{item.checks.detailFetched ? "Details read" : "Details unavailable"}</span><span>{item.checks.duplicateRole ? "Possible duplicate" : item.checks.activePosting === "closed" ? "Posting closed" : item.checks.activePosting === "verified" ? "Open posting confirmed" : "Posting status not verified"}</span></div>{item.status === "suggested" ? <div className="cr-suggestion-actions"><button type="button" className="cr-primary" disabled={busy || !eligible} title={!eligible ? "Accept when the source is official, details are available, and the role is not closed or a duplicate." : undefined} onClick={() => void reviewSuggestion(item.id, "accept")}><Check size={14} />Accept as prospect</button><button type="button" className="cr-dismiss" disabled={busy} onClick={() => void reviewSuggestion(item.id, "dismiss")}>Dismiss</button></div> : <p className="cr-accepted-status">Added as prospect{item.roleId ? ` · ${item.title}` : ""}</p>}</article>;
        })}{!suggestions.length && <p className="cr-empty">No role suggestions from the latest check.</p>}</div>
        <details className="cr-sources"><summary>Sources ({sources.length})</summary>{sources.length ? sources.map(source => <article key={source.id}><div><strong>{source.kind === "linkedin" ? "LinkedIn" : source.kind === "careers" ? "Careers page" : source.kind === "job" ? "Job posting" : "Company website"}</strong><span>{source.title || source.url}</span></div><span className={`cr-source-status status-${source.status}`}>{source.status === "cached" ? "Cached" : source.status === "fetched" ? "Available" : source.status === "blocked" ? "Blocked" : "Failed"}</span><a href={source.finalUrl ?? source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.title || source.url}`}><ExternalLink size={14} /></a><small>{dateLabel(source.capturedAt)}</small>{source.excerpt && <p>{source.excerpt.slice(0, 360)}{source.excerpt.length > 360 ? "…" : ""}</p>}</article>) : <p className="cr-empty">No source checks from the latest run.</p>}</details>
      </div>}
      {!selected && <p className="cr-empty">No companies yet. Add a company to begin.</p>}
    </div>
    {busy && <span className="cr-live-status" role="status">Saving research choice…<ArrowRight size={13} /></span>}
  </section>;
}
