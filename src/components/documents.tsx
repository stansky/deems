"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronDown, ExternalLink, FileText, Plus, Search } from "lucide-react";
import type { Application, SavedDocument, WorkspaceState } from "@/lib/types";
import { Badge, Button, Empty } from "@/components/ui";

type Save = (action: string, data: unknown) => Promise<boolean>;
function makeId() { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join(""); }
function capturedLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Import date unavailable" : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }

export function DocumentCard({ document }: { document: SavedDocument }) {
  const isLink = /^https?:\/\//i.test(document.sourceUrl);
  const title = document.title.replace(/: (recruiter-provided JD|archived role summary)$/i, "").replace(/^Ollama: /, "").replace(/, September 14-28.*$/, "");
  let body = document.body;
  let context = "";
  const opening = body.indexOf("BEGIN PROVIDED DESCRIPTION");
  const closing = body.indexOf("END PROVIDED DESCRIPTION");
  if (opening >= 0 && closing > opening) { context = body.slice(0, opening).trim() + "\n\n" + body.slice(closing + "END PROVIDED DESCRIPTION".length).trim(); body = body.slice(opening + "BEGIN PROVIDED DESCRIPTION".length, closing).trim(); }
  else if (/^(HISTORICAL RECRUITER|NORMALIZED HISTORY)/.test(body)) { const split = body.indexOf("\n\n"); if (split > 0) { context = body.slice(0, split); body = body.slice(split + 2); } }
  return <details className="document-card">
    <summary><span className="document-icon"><FileText size={18} /></span><span className="document-summary"><span>{document.company} <span className="document-meta-dot">·</span> {document.kind}</span><strong>{title}</strong>{document.sourceDate && <small>{document.sourceDate}</small>}</span><ChevronDown size={16} /></summary>
    <div className="document-content"><div className="document-reader"><section className="document-original"><div className="document-body">{body}</div></section>{(document.techStack.length > 0 || document.requirements.length > 0) && <aside className="document-notes">{document.techStack.length > 0 && <section><h4>Technology</h4><div className="technology-tags">{document.techStack.map((item, index) => <Badge key={`${item}-${index}`}>{item}</Badge>)}</div></section>}{document.requirements.length > 0 && <section><h4>Requirements</h4><ul>{document.requirements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}</aside>}</div><details className="document-source-details"><summary>Source details</summary><p>Saved locally {capturedLabel(document.capturedAt)}. Import date is separate from the original event or publication date.</p>{isLink && <a href={document.sourceUrl} target="_blank" rel="noreferrer">Original source<ExternalLink size={12} /></a>}{context && <div className="document-body">{context}</div>}<p>Saved snapshot. Current opening status is not established by this record.</p></details></div>
  </details>;
}

function DocumentForm({ applications, application, mutate, saving, close }: { applications: Application[]; application?: Application; mutate: Save; saving: boolean; close: () => void }) {
  const [applicationId, setApplicationId] = useState(application?.id ?? applications[0]?.id ?? "");
  const [title, setTitle] = useState(application ? `${application.title} job description` : "");
  const [kind, setKind] = useState("Job description");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [techStack, setTechStack] = useState("");
  const [requirements, setRequirements] = useState("");
  const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const selected = applications.find(item => item.id === applicationId);
    if (!selected || !title.trim() || !body.trim()) return;
    setFailed(false);
    const ok = await mutate("document", { id: makeId(), applicationId, company: selected.company, title: title.trim(), kind, body: body.trim(), sourceUrl: sourceUrl.trim(), sourceDate: sourceDate.trim(), capturedAt: new Date().toISOString(), techStack: techStack.split(",").map(item => item.trim()).filter(Boolean), requirements: requirements.split("\n").map(item => item.trim()).filter(Boolean) });
    if (ok) close(); else setFailed(true);
  }
  return <form className="document-form" onSubmit={submit}>
    <div className="document-form-heading"><h4>Save a source snapshot</h4></div>
    {!application && <label className="field-label">Related role<select value={applicationId} onChange={event => setApplicationId(event.target.value)} required>{applications.map(item => <option key={item.id} value={item.id}>{item.company} · {item.title}</option>)}</select></label>}
    <div className="document-form-grid"><label className="field-label">Title<input required value={title} onChange={event => setTitle(event.target.value)} placeholder="Role title or document name" /></label><label className="field-label">Source type<select value={kind} onChange={event => setKind(event.target.value)}><option>Job description</option><option>Conversation</option><option>Interview notes</option><option>Company notes</option></select></label></div>
    <label className="field-label">Original text<textarea className="notes-textarea document-body-input" required value={body} onChange={event => setBody(event.target.value)} placeholder="Paste the full job description, message, or notes..." /></label>
    <div className="document-form-grid"><label className="field-label">Source URL <span className="optional-label">optional</span><input type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://..." /></label><label className="field-label">Original date <span className="optional-label">if known</span><input value={sourceDate} onChange={event => setSourceDate(event.target.value)} placeholder="e.g. September, year unconfirmed" /></label></div>
    <label className="field-label">Technology <span className="optional-label">separate with commas</span><input value={techStack} onChange={event => setTechStack(event.target.value)} placeholder="Python, JavaScript, PostgreSQL..." /></label>
    <label className="field-label">Requirements <span className="optional-label">one per line</span><textarea className="notes-textarea short-textarea" value={requirements} onChange={event => setRequirements(event.target.value)} placeholder="Add requirements supported by the source..." /></label>
    <p className="field-help">Adds a new snapshot. Earlier versions are preserved.</p>
    {failed && <p className="document-save-error" role="alert">Could not save this snapshot. Your text is still here. Please try again.</p>}
    <div className="document-form-actions"><Button type="submit" disabled={saving || !applicationId || !title.trim() || !body.trim()}><Check size={15} />Save snapshot</Button><Button type="button" variant="ghost" onClick={close}>Cancel</Button></div>
  </form>;
}

export function ApplicationDocuments({ application, state, mutate, saving }: { application: Application; state: WorkspaceState; mutate: Save; saving: boolean }) {
  const [adding, setAdding] = useState(false);
  const documents = (state.documents ?? []).filter(item => item.applicationId === application.id).slice().sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return <section className="application-documents"><div className="document-section-heading"><h3><FileText size={17} />Role sources <span>{documents.length}</span></h3><Button variant="secondary" onClick={() => setAdding(!adding)}><Plus size={14} />Save job description</Button></div>{adding && <DocumentForm applications={state.applications} application={application} mutate={mutate} saving={saving} close={() => setAdding(false)} />}<div className="document-list">{documents.map(document => <DocumentCard key={document.id} document={document} />)}</div>{!documents.length && !adding && <p className="document-empty">No saved sources.</p>}</section>;
}

export function RoleLibrary({ state, mutate, saving }: { state: WorkspaceState; mutate: Save; saving: boolean }) {
  const [company, setCompany] = useState("All companies");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const documents = state.documents ?? [];
  const companies = Array.from(new Set(documents.map(document => document.company))).sort();
  const filtered = documents.filter(document => (company === "All companies" || document.company === company) && `${document.title} ${document.company} ${document.body} ${document.techStack.join(" ")} ${document.requirements.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice().sort((a, b) => a.company.localeCompare(b.company) || b.capturedAt.localeCompare(a.capturedAt));
  return <section className="role-library">{adding && <DocumentForm applications={state.applications} mutate={mutate} saving={saving} close={() => setAdding(false)} />}<div className="list-toolbar"><label className="search-input"><Search size={16} /><input aria-label="Search role library" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search roles, requirements, technology..." /></label><select aria-label="Filter library by company" value={company} onChange={event => setCompany(event.target.value)}><option>All companies</option>{companies.map(item => <option key={item}>{item}</option>)}</select><Button variant="secondary" onClick={() => setAdding(!adding)} disabled={!state.applications.length}><Plus size={15} />Save a source</Button></div><div className="library-count">{filtered.length} saved {filtered.length === 1 ? "source" : "sources"}</div><div className="document-list">{filtered.map(document => <DocumentCard key={document.id} document={document} />)}</div>{!filtered.length && <Empty title="No sources match">Choose another company or save a job description to a role.</Empty>}</section>;
}
