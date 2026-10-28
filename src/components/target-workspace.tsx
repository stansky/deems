"use client";

import { workspaceFetch, workspaceSessionStorage } from "@/components/workspace-client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3, ExternalLink, FileText, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Button as ActionButton } from "@/components/ui/button";
import { PageActions } from "@/components/ui/page-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalDraft } from "@/components/use-local-draft";
import { targetStateSchema, targetMutationSchema } from "@/contracts/targets";
import { useCommandDraft, type UseCommandDraftResult } from "@/components/use-command-draft";
import { boardStage, careerStages, type BoardStage, type CareerStage, type RecordRevision } from "@/domains/career/contracts";
import { CareerHistory } from "@/components/features/career/history";
import { companyBranding } from "@/data/company-branding";
import { companySurface } from "@/lib/company-colors";
import CompanyResearch from "@/components/features/companies/company-research";
import { researchStateSchema } from "@/contracts/company-research";
import type { WorkspaceState } from "@/lib/types";
import type { TargetAssessment, TargetDebrief, TargetInterview, TargetMutation, TargetProgress, TargetRequirement, TargetResource, TargetRole, TargetRoleState, TargetStep, TargetsState } from "@/lib/target-types";
import "./target-workspace.css";
import type { PracticeOrigin, PracticeAttempt } from "@/contracts/practice";
import { RequirementEvidenceEntry } from "@/components/features/practice/evidence";

type Props = { workspace: WorkspaceState; onResource: (resource: TargetResource, origin?:PracticeOrigin) => void; onViewAttempt:(attempt:PracticeAttempt)=>void; onApplication: (id: string) => void };
type Save = (mutation: TargetMutation, command?: UseCommandDraftResult) => Promise<boolean>;
type Tab = "Company" | "Plan" | "Requirements" | "Research" | "Interviews" | "Sources";
type ConflictRecord = { entityType: string; entityId: string };
const phases = ["Understand", "Practice", "Demonstrate", "Interview"] as const;
function detailedForBoard(stage?: BoardStage): CareerStage {
  if (stage === "active") return "In progress";
  if (stage === "offer") return "Offer";
  if (stage === "rejected") return "Rejected";
  if (stage === "withdrawn") return "Withdrawn";
  if (stage === "needs-review") return "Needs review";
  return "Interested";
}
function candidacyId(role: TargetRole) { return role.applicationId ? `application:${role.applicationId}` : `role:${role.id}`; }
function conflictFor(mutation: TargetMutation, roles: TargetRole[]): ConflictRecord | null {
  if (mutation.action === "roleState") { const role = roles.find(item => item.id === mutation.data.roleId); return { entityType: "candidacy", entityId: role ? candidacyId(role) : `role:${mutation.data.roleId}` }; }
  if (mutation.action === "interview") return { entityType: "interview", entityId: mutation.data.id };
  if (mutation.action === "debrief" || mutation.action === "resolve") return { entityType: "debrief", entityId: mutation.data.id };
  return null;
}
function isProtected(action: TargetMutation["action"]) { return action === "roleState" || action === "interview" || action === "debrief" || action === "resolve"; }
function newId() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join(""); }
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function localTime(iso: string | null) { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function external(url: string) { return /^https?:\/\//.test(url); }
function rolePriority(role: TargetRole) { return role.id === "sycamore-products" ? 1 : ({ Primary: 0, Adjacent: 2, Stretch: 3, Explore: 4 })[role.priority]; }
function LinkedSourceText({body}:{body:string}) {
  const parts=body.split(/(https?:\/\/[^\s<>]+)/g);
  return <>{parts.map((part,index)=>{if(!/^https?:\/\//.test(part))return part;const url=part.replace(/[.,;:!?)\]]+$/g,"");const suffix=part.slice(url.length);try{const parsed=new URL(url);if(parsed.protocol!=="http:"&&parsed.protocol!=="https:")return part;return <span key={index}><a href={url} target="_blank" rel="noreferrer">{url}</a>{suffix}</span>;}catch{return part;}})}</>;
}

export default function TargetWorkspace({ workspace, onResource, onApplication, onViewAttempt }: Props) {
  const [overview, setOverview] = useState(true);
  const [selectionReady, setSelectionReady] = useState(false);
  const [data, setData] = useState<TargetsState | null>(null);
  const [companyId, setCompanyId] = useState("sycamore");
  const [roleId, setRoleId] = useState("sycamore-fde");
  const [tab, setTab] = useState<Tab>("Plan");
  const [sourceId, setSourceId] = useState("");
  const [returnStep, setReturnStep] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<ConflictRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function load(): Promise<TargetsState | null> {
    setError("");
    try { const response = await workspaceFetch("/api/targets", { cache: "no-store" }); if (!response.ok) throw new Error("Could not load your target plans. Retry when your workspace is available."); const next = targetStateSchema.parse(await response.json()); setData(next); return next; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load targets."); return null; }
  }
  useEffect(() => { void load().then(next => {
    const params=new URLSearchParams(window.location.search);
    const requested=next?.roles.find(item=>item.id===params.get("role"));
    if(requested) {setRoleId(requested.id);setCompanyId(requested.companyId);setOverview(false);setTab("Plan");setReturnStep(params.get("step")??"");}
  }); try { const stored = JSON.parse(workspaceSessionStorage.getItem("interview-target-selection") || "null"); if (stored) { setCompanyId(stored.companyId || "sycamore"); setRoleId(stored.roleId || "sycamore-fde"); setOverview(stored.overview !== false); if (["Company","Plan","Requirements","Research","Interviews","Sources"].includes(stored.tab)) setTab(stored.tab); } } catch {} setSelectionReady(true); }, []);
  useEffect(() => { if (selectionReady) try { workspaceSessionStorage.setItem("interview-target-selection",JSON.stringify({companyId,roleId,overview,tab})); } catch {} }, [companyId,roleId,overview,tab,selectionReady]);
  async function save(mutation: TargetMutation, command?: UseCommandDraftResult) {
    setSaving(true); setSaved(false); setError("");
    try {
      if (isProtected(mutation.action) && !command) throw new Error("Reload this record before saving. Revision information is missing.");
      const meta = isProtected(mutation.action) ? command!.meta(mutation.action, mutation.data) : undefined;
      const payload = meta ? { ...mutation, meta } : mutation;
      const response = await workspaceFetch("/api/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(targetMutationSchema.parse(payload)) });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409 && body.code === "revision_conflict") {
          const record = conflictFor(mutation, data?.roles ?? []);
          const refreshed = await load();
          if (record && refreshed) { setConflict(record); setError(""); }
          else setError(body.error || "This record changed. Reload and review the saved version before retrying.");
          return false;
        }
        throw new Error(body.error || "Could not save. Your draft is still here.");
      }
      const next = targetStateSchema.parse(body);
      setData(next); setConflict(null); setSaved(true);
      if (meta) {
        const revision = next.commandResult?.revision;
        if (!Number.isSafeInteger(revision) || revision! < 0) throw new Error("The save was accepted, but its revision was not returned. Reload before editing again.");
        command!.commit(revision!);
      }
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your draft is still here."); return false; }
    finally { setSaving(false); }
  }
  if (!data) return <section className="targets-workspace"><div className="page-heading"><h1>Interviews</h1></div>{error ? <div className="notice notice-error" role="alert">{error}<Button variant="secondary" onClick={load}>Retry</Button></div> : <p className="target-loading"><Loader2 className="spin" size={16} />Loading company plans...</p>}</section>;
  const company = data.companies.find(item => item.id === companyId) ?? data.companies[0];
  const companyRoles = data.roles.filter(item => item.companyId === company?.id).sort((a,b)=>rolePriority(a)-rolePriority(b));
  const role = companyRoles.find(item => item.id === roleId) ?? companyRoles[0];
  const companySources = data.sources.filter(item => item.companyId === company?.id || item.companyId === "general");
  const sources = companySources.filter(item=>!item.id.startsWith("research-"));
  const researchSources = companySources.filter(item=>item.id.startsWith("research-")).sort((a,b)=>Number(b.companyId===company?.id)-Number(a.companyId===company?.id));
  const readerSources = tab === "Research" ? researchSources : sources;
  const source = readerSources.find(item => item.id === sourceId) ?? readerSources[0];
  const progress = data.progress.filter(item => item.roleId === role?.id);
  const assessments = data.assessments.filter(item => item.roleId === role?.id);
  const debriefs = data.debriefs.filter(item => item.roleId === role?.id).sort((a,b) => b.occurredOn.localeCompare(a.occurredOn));
  const nextActions = debriefs.filter(item => !item.resolvedAt && item.nextAction.trim());
  const application = workspace.applications.find(item => item.id === role?.applicationId);
  const done = role?.steps.filter(step => progress.some(item => item.itemId === step.id && item.status === "done")).length ?? 0;
  const scheduled = data.interviews.filter(item => item.companyId === company?.id && item.status === "scheduled" && item.scheduledAt && new Date(item.scheduledAt).getTime() >= Date.now()).sort((a,b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  function resourceOpen(resource: TargetResource) { if (resource.kind === "source") { setSourceId(resource.id); setTab(resource.id.startsWith("research-") ? "Research" : "Sources"); } else onResource(resource); }
  function openRole(id: string) { const target=data!.roles.find(item=>item.id===id); if(target){setCompanyId(target.companyId);setRoleId(target.id);setOverview(false);setTab("Plan");window.scrollTo({top:0,behavior:"instant"});} }
  if(overview) return <section className="targets-workspace company-board" aria-label="Interview preparation">{error&&<div className="notice notice-error" role="alert">{error}</div>}<Pipeline data={data} onOpen={openRole} onOpenCompany={id => { setCompanyId(id); setRoleId(data.roles.find(item => item.companyId === id)?.id ?? ""); setOverview(false); setTab("Company");window.scrollTo({top:0,behavior:"instant"}); }} onCompanyCreated={async id => { const refreshed = await load(); if (refreshed) { const firstRole = refreshed.roles.find(item => item.companyId === id); setCompanyId(id); setRoleId(firstRole?.id ?? ""); setOverview(false); setTab(firstRole ? "Plan" : "Research"); } }}/></section>;
  if (tab === "Company" && company) return <section className="targets-workspace company-home">
    <button className="text-button target-back" onClick={()=>setOverview(true)}>All companies<ChevronRight size={13}/>{company.name}</button>
    <CompanyHome company={company} data={data} workspace={workspace} onRole={openRole} onApplication={onApplication} onResearch={()=>setTab("Research")} />
  </section>;
  return <section className={`targets-workspace target-detail-workspace ${!role || tab === "Research" ? "target-research-workspace" : ""}`}>
    <button className="text-button target-back" onClick={()=>setOverview(true)}>All interviews<ChevronRight size={13}/>{company?.name}</button>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <nav className="target-company-nav" aria-label="Target company">{data.companies.map(item => <button key={item.id} className={company?.id === item.id ? "selected" : ""} aria-current={company?.id === item.id ? "true" : undefined} onClick={() => { setCompanyId(item.id); setRoleId(data.roles.find(r => r.companyId === item.id)?.id ?? ""); setSourceId(""); setSaved(false); }}><span className="target-company-mark">{item.id === "general" ? <BookOpen size={14} /> : item.name.slice(0,1)}</span>{item.name}</button>)}</nav>
    {company && <><div className="target-company-heading"><CompanyIdentity companyId={company.id} name={company.name} level="h1" /><span className="target-save-status" role="status">{saving ? <><Loader2 size={13} className="spin" />Saving...</> : saved ? <><Check size={13} />Saved locally</> : null}</span>{external(company.careersUrl) && <a href={company.careersUrl} target="_blank" rel="noreferrer">Careers<ExternalLink size={13}/></a>}</div>
    <CompanySummary companyId={company.id} summary={company.summary} focus={company.focus}/>
    {scheduled.length > 0 && <div className="target-upcoming"><CalendarDays size={16}/><div><strong>Next scheduled</strong><span>{scheduled[0].title} · {new Date(scheduled[0].scheduledAt!).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"})}</span></div><button className="text-button" onClick={() => { setRoleId(scheduled[0].roleId); setTab("Interviews"); }}>Open<ArrowRight size={14}/></button></div>}
    {companyRoles.length > 0 && <div className="target-role-selector"><label htmlFor="target-role">Target role</label><select id="target-role" value={role?.id ?? ""} onChange={e => { setRoleId(e.target.value); setSaved(false); }}>{companyRoles.map(item => <option key={item.id} value={item.id}>{item.title} · {item.priority}</option>)}</select>{role && <Badge tone={role.priority === "Primary" ? "blue" : "neutral"}>{role.priority}</Badge>}{application && <button className="text-button" onClick={() => onApplication(application.id)}>Application<ArrowRight size={13}/></button>}</div>}
    {role ? <><RoleStage key={`stage-${role.id}`} role={role} current={data.roleStates?.find(item=>item.roleId===role.id)} revisions={data.revisions??[]} conflict={conflict} clearConflict={()=>setConflict(null)} save={save} saving={saving}/><div className="target-role-context"><details><summary>Role fit and context</summary><p>{role.rationale}</p>{company.focus&&<p>{company.focus}</p>}</details>{external(role.sourceUrl) && <a href={role.sourceUrl} target="_blank" rel="noreferrer">Role source<ExternalLink size={12}/></a>}</div>
    <div className="tab-bar target-tabs" role="tablist" aria-label="Target details">{(["Plan","Requirements","Research","Interviews","Sources"] as Tab[]).map(item => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}{item === "Plan" && <span>{done}/{role.steps.length}</span>}</button>)}</div>
    <div key={`content-${role.id}`} className="target-tab-content">
    {tab === "Plan" && <div className="target-plan-layout"><div>
      {nextActions.length > 0 && <section className="target-next-actions"><div className="target-section-heading"><h3>From your last interviews</h3><span>{nextActions.length} open</span></div>{nextActions.map(item => <div key={item.id} className="target-action-row"><RotateCcw size={16}/><div><strong>{item.nextAction}</strong><p>{item.struggled || item.feedback}</p><small>{item.occurredOn} · {item.outcome === "rejected" ? "Not selected" : item.outcome}</small>{item.requirementIds.length>0&&<button className="target-linked-requirements" onClick={()=>setTab("Requirements")}>{item.requirementIds.map(id=>role.requirements.find(r=>r.id===id)?.title??id).join(" · ")}<ArrowRight size={12}/></button>}</div><ResolveControl key={`resolve-${item.id}-${item.revision??0}`} item={item} revisions={data.revisions??[]} conflict={conflict} clearConflict={()=>setConflict(null)} saving={saving} save={save}/></div>)}</section>}
      {assessments.some(item=>item.level==="gap"||item.level==="developing")&&<section className="target-gap-focus"><h3>Focus areas</h3>{assessments.filter(item=>item.level==="gap"||item.level==="developing").map(item=>{const requirement=role.requirements.find(r=>r.id===item.requirementId);return requirement?<div key={item.requirementId}><button className="text-button" onClick={()=>setTab("Requirements")}>{requirement.title}<ArrowRight size={12}/></button><p>{requirement.gap}</p></div>:null;})}</section>}
      <div className="target-section-heading target-plan-title"><h3>Study plan</h3><span>Suggested practice</span></div>
      {phases.map(phase => { const steps=role.steps.filter(item => item.phase===phase); return steps.length ? <section className="target-phase" key={phase}><h4>{phase}</h4>{steps.map(step => <StepRow key={step.id} roleId={role.id} step={step} progress={progress.find(item => item.itemId===step.id)} save={save} saving={saving} autoOpen={returnStep===step.id} onResource={resource=>{if(resource.kind==="exercise")onResource(resource,{roleId:role.id,planStepId:step.id});else resourceOpen(resource);}}/>)}</section> : null; })}
    </div><aside className="target-plan-aside"><section><h3>Interview process</h3>{role.publishedProcess.length ? <ol>{role.publishedProcess.map((item,index) => <li key={index}>{item}</li>)}</ol> : <p>Confirm format, timing, and tool permissions with the recruiter.</p>}<small>Source details are in the role record. Your actual invitation takes precedence.</small></section><section><h3>Your evidence</h3><dl><div><dt>Strengths recorded</dt><dd>{assessments.filter(item=>item.level==="strength").length}</dd></div><div><dt>Gaps to work on</dt><dd>{assessments.filter(item=>item.level==="gap"||item.level==="developing").length}</dd></div><div><dt>Not assessed</dt><dd>{role.requirements.filter(item=>!assessments.some(a=>a.requirementId===item.id&&a.level!=="unassessed")).length}</dd></div></dl><button className="text-button" onClick={()=>setTab("Requirements")}>Review requirements<ArrowRight size={13}/></button></section>{role.stack.length>0&&<section><h3>Stack to recognize</h3><p className="target-stack">{role.stack.join(" · ")}</p></section>}</aside></div>}
    {tab === "Requirements" && <div className="target-requirements"><div className="target-section-heading"><h3>Strengths and gaps</h3><span>Self-assessed, with evidence</span></div><p className="target-explainer">Resume connections are starting points. Record what you can demonstrate and what still needs work.</p>{role.requirements.map(item => <div key={item.id}><RequirementRow roleId={role.id} requirement={item} assessment={assessments.find(a=>a.requirementId===item.id)} feedback={debriefs.filter(d=>d.requirementIds.includes(item.id))} save={save} saving={saving}/>{(workspace.practiceAttempts??[]).filter(attempt=>attempt.origin?.roleId===role.id&&attempt.attachment?.requirementId===item.id).map(attempt=><RequirementEvidenceEntry key={attempt.sessionId} attempt={attempt} onView={()=>onViewAttempt(attempt)}/>)}</div>)}</div>}
    {tab === "Interviews" && <Interviews role={role} data={data} conflict={conflict} clearConflict={()=>setConflict(null)} save={save} saving={saving}/>}
    {tab === "Research" && <CompanyResearch companies={data.companies.filter(item => item.id !== "general")} initialCompanyId={company.id} compact onCompanyCreated={async id => { const refreshed = await load(); if (refreshed) { setCompanyId(id); setRoleId(refreshed.roles.find(item => item.companyId === id)?.id ?? ""); } }}/ >}
    {(tab === "Sources" || tab === "Research") && <>{tab === "Research"&&<div className="target-research-heading"><h3>Saved research notes</h3><span>Source dates and provenance retained</span></div>}<div className="target-sources"><div className="target-source-index"><h3>{tab === "Research" ? "Research notes" : "Saved sources"}</h3>{readerSources.map(item=><button key={item.id} className={source?.id===item.id?"selected":""} onClick={()=>setSourceId(item.id)}><FileText size={16}/><span><strong>{item.title}</strong><small>{item.companyId==="general"?"General library":company.name}</small></span><ChevronRight size={14}/></button>)}{!readerSources.length&&<p>{tab === "Research" ? "No saved notes for this company yet." : "No additional source documents yet."}</p>}{external(role.sourceUrl)&&<a className="target-public-source" href={role.sourceUrl} target="_blank" rel="noreferrer">Current role posting<ExternalLink size={13}/></a>}</div><article className="target-source-reader">{source?<><h3>{source.title}</h3><p className="target-source-provenance">{source.provenance}</p><small>Captured {source.capturedAt.slice(0,10)}</small><div className="target-source-body"><LinkedSourceText body={source.body}/></div></>:<div className="target-source-empty"><FileText size={24}/><h3>Read the source</h3><p>Select a saved guide or recruiter note. Public role postings open at their source.</p></div>}</article></div></>}
    </div></> : <CompanyResearch companies={[company]} initialCompanyId={company.id} compact onCompanyCreated={async id => { const refreshed = await load(); if (refreshed) { setCompanyId(id); setRoleId(refreshed.roles.find(item => item.companyId === id)?.id ?? ""); } }}/>}</>}
  </section>;
}

function StepRow({roleId,step,progress,save,saving,onResource,autoOpen}:{autoOpen?:boolean;roleId:string;step:TargetStep;progress?:TargetProgress;save:Save;saving:boolean;onResource:(resource:TargetResource)=>void}) {
  const [expanded,setExpanded]=useState(Boolean(autoOpen));
  useEffect(()=>{if(autoOpen){setExpanded(true);requestAnimationFrame(()=>document.getElementById(`plan-step-${roleId}-${step.id}`)?.scrollIntoView({block:"center"}));}},[autoOpen,roleId,step.id]);
  const {draft,setDraft,clearDraft,hasDraft}=useLocalDraft(`progress:${roleId}:${step.id}`, {evidence:progress?.evidence??"",status:progress?.status??"todo"});
  const {evidence,status}=draft;
  const setEvidence=(value:string)=>setDraft(current=>({...current,evidence:value}));
  const setStatus=(value:TargetProgress["status"])=>setDraft(current=>({...current,status:value}));
  return <div id={`plan-step-${roleId}-${step.id}`} className={`target-step ${progress?.status==="done"?"done":""}`}><button className="target-step-summary" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{progress?.status==="done"?<CheckCircle2 size={19}/>:progress?.status==="working"?<Clock3 size={19}/>:<Circle size={19}/>}<span><strong>{step.title}</strong><small>{step.detail}</small></span><span className="target-step-duration">{step.minutes>0?`${step.minutes} min`:""}</span><ChevronDown size={15} className={expanded?"rotated":""}/></button>{expanded&&<div className="target-step-detail"><div className="target-done-when"><span>Done when</span><p>{step.doneWhen}</p></div>{step.resources.length>0&&<div className="target-resources">{step.resources.map((item,index)=><button key={`${item.kind}-${item.id}-${index}`} onClick={()=>onResource(item)}><BookOpen size={13}/>{item.title}<ArrowRight size={12}/></button>)}</div>}<label className="target-field">Evidence or notes<textarea disabled={saving} rows={2} maxLength={8000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="What did you build, explain, or verify?"/></label><div className="target-inline-form"><label className="target-status-field">Status<select disabled={saving} value={status} onChange={e=>setStatus(e.target.value as TargetProgress["status"])}><option value="todo">To do</option><option value="working">Working on it</option><option value="done">Done</option></select></label><Button variant="secondary" disabled={saving} onClick={async()=>{if(await save({action:"progress",data:{roleId,itemId:step.id,status,evidence}}))clearDraft();}}>Save progress</Button>{hasDraft&&<small className="muted">Draft kept in this tab</small>}</div></div>}</div>;
}

function RequirementRow({roleId,requirement,assessment,feedback,save,saving}:{roleId:string;requirement:TargetRequirement;assessment?:TargetAssessment;feedback:TargetDebrief[];save:Save;saving:boolean}) {
  const {draft,setDraft,clearDraft,hasDraft}=useLocalDraft(`assessment:${roleId}:${requirement.id}`, {level:assessment?.level??"unassessed",evidence:assessment?.evidence??""});
  const {level,evidence}=draft;
  const setLevel=(value:TargetAssessment["level"])=>setDraft(current=>({...current,level:value}));
  const setEvidence=(value:string)=>setDraft(current=>({...current,evidence:value}));
  return <section className="target-requirement"><div className="target-requirement-heading"><h4>{requirement.title}</h4>{external(requirement.sourceUrl)&&<a href={requirement.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source for ${requirement.title}`}><ExternalLink size={13}/></a>}</div><p>{requirement.detail}</p><div className="target-evidence-context"><div><span>Possible connection</span><p>{requirement.evidence||"Add a concrete example from your experience."}</p></div><div><span>What to verify</span><p>{requirement.gap||"Demonstrate the requirement in a practice session."}</p></div></div>{feedback.length>0&&<div className="target-requirement-feedback"><span>Interview evidence</span>{feedback.map(item=><p key={item.id}><strong>{item.occurredOn}</strong> {item.struggled||item.feedback||item.worked}{item.nextAction&&<small>Next: {item.nextAction}{item.resolvedAt?" (completed)":""}</small>}</p>)}</div>}<label className="target-field">Your evidence<textarea disabled={saving} rows={2} maxLength={8000} placeholder="A project, a decision, an outcome, or where you got stuck." value={evidence} onChange={e=>setEvidence(e.target.value)}/></label><div className="target-inline-form"><label className="target-status-field">Readiness<select disabled={saving} value={level} onChange={e=>setLevel(e.target.value as TargetAssessment["level"])}><option value="unassessed">Not assessed</option><option value="strength">Strength</option><option value="developing">Developing</option><option value="gap">Gap</option></select></label><Button variant="secondary" disabled={saving} onClick={async()=>{if(await save({action:"assessment",data:{roleId,requirementId:requirement.id,level,evidence}}))clearDraft();}}>Save assessment</Button>{hasDraft&&<small className="muted">Draft kept in this tab</small>}</div></section>;
}

function Interviews({role,data,conflict,clearConflict,save,saving}:{role:TargetRole;data:TargetsState;conflict:ConflictRecord|null;clearConflict:()=>void;save:Save;saving:boolean}) {
  const [editing,setEditing]=useState<TargetInterview|"new"|null>(null);
  const [editingDebrief,setEditingDebrief]=useState<TargetDebrief|"new"|null>(null);
  const interviews=data.interviews.filter(item=>item.roleId===role.id).sort((a,b)=>{const rank={scheduled:0,target:1,completed:2,cancelled:3};return rank[a.status]-rank[b.status]||(a.scheduledAt??"9999").localeCompare(b.scheduledAt??"9999");});
  const debriefs=data.debriefs.filter(item=>item.roleId===role.id).sort((a,b)=>b.occurredOn.localeCompare(a.occurredOn));
  const revisions=data.revisions??[];
  const latestInterview=editing&&editing!=="new"?interviews.find(item=>item.id===editing.id)??editing:undefined;
  const latestDebrief=editingDebrief&&editingDebrief!=="new"?debriefs.find(item=>item.id===editingDebrief.id)??editingDebrief:undefined;
  return <div className="target-interviews"><section><div className="target-section-heading"><h3>Interviews</h3><Button variant="secondary" onClick={()=>setEditing("new")}><Plus size={14}/>Add interview</Button></div>{editing&&<InterviewForm key={editing==="new"?"new":editing.id} role={role} existing={editing==="new"?undefined:latestInterview} revisions={revisions} conflict={conflict} clearConflict={clearConflict} save={save} saving={saving} close={()=>setEditing(null)}/>}<div className="target-interview-list">{interviews.map(item=><div className="target-interview-record" key={item.id}><button onClick={()=>setEditing(item)}><CalendarDays size={18}/><span><strong>{item.title}</strong><small>{item.scheduledAt?new Date(item.scheduledAt).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"Date not set"}{item.format?` · ${item.format}`:""}</small></span><Badge tone={item.status==="scheduled"?"blue":"neutral"}>{item.status}</Badge><ChevronRight size={14}/></button><details className="target-history-section"><summary>Saved history</summary><CareerHistory revisions={revisions} entityType="interview" entityId={item.id}/></details></div>)}{!interviews.length&&!editing&&<p className="target-empty">No interview saved for this role. Add a target or a confirmed date.</p>}</div></section><section className="target-debrief-section"><div className="target-section-heading"><h3>Interview debriefs</h3><Button variant="secondary" onClick={()=>setEditingDebrief("new")}><Plus size={14}/>Add debrief</Button></div>{editingDebrief&&<DebriefForm key={editingDebrief==="new"?"new":editingDebrief.id} role={role} existing={editingDebrief==="new"?undefined:latestDebrief} interviews={interviews} revisions={revisions} conflict={conflict} clearConflict={clearConflict} save={save} saving={saving} close={()=>setEditingDebrief(null)}/>}<div>{debriefs.map(item=><DebriefRecord key={item.id} role={role} item={item} revisions={revisions} conflict={conflict} clearConflict={clearConflict} saving={saving} save={save} onEdit={()=>setEditingDebrief(item)}/>) }{!debriefs.length&&!editingDebrief&&<p className="target-empty">Capture the ask, the hard part, and one change for next time. Unfinished follow-ups appear at the top of your plan.</p>}</div></section></div>;
}

function RecordReview({command,entityType,entityId,revision,revisions,conflict,clearConflict}:{command:UseCommandDraftResult;entityType:string;entityId:string;revision:number;revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void}) {
  const hasConflict=conflict?.entityType===entityType&&conflict.entityId===entityId;
  if(!hasConflict&&!command.reviewRequired)return null;
  return <div className="career-conflict-review" role="status"><strong>{hasConflict?"This record changed while you were editing.":"Review this saved draft before sending it."}</strong><p>The latest saved snapshot is open below. Your draft is still here.</p><CareerHistory revisions={revisions} entityType={entityType} entityId={entityId}/><Button type="button" variant="secondary" onClick={()=>{command.acceptRevision(revision);clearConflict();}}>Use current revision for my draft</Button></div>;
}

function ResolveControl({item,revisions,conflict,clearConflict,saving,save}:{item:TargetDebrief;revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void;saving:boolean;save:Save}) {
  const command=useCommandDraft(`debrief-resolve:${item.id}`,item.revision??0);
  const needsReview=command.reviewRequired||(conflict?.entityType==="debrief"&&conflict.entityId===item.id);
  return <div className="career-resolve-control"><Button variant="ghost" disabled={saving||needsReview} onClick={()=>void save({action:"resolve",data:{id:item.id,resolved:!item.resolvedAt}},command)}>{item.resolvedAt?<><RotateCcw size={13}/>Reopen</>:<><Check size={13}/>{"Complete"}</>}</Button><RecordReview command={command} entityType="debrief" entityId={item.id} revision={item.revision??0} revisions={revisions} conflict={conflict} clearConflict={clearConflict}/></div>;
}

function DebriefRecord({role,item,revisions,conflict,clearConflict,saving,save,onEdit}:{role:TargetRole;item:TargetDebrief;revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void;saving:boolean;save:Save;onEdit:()=>void}) {
  return <article className="target-debrief" key={item.id}><div className="target-section-heading"><h4>{item.occurredOn}</h4><Button variant="ghost" onClick={onEdit}>Edit debrief</Button><Badge tone={item.outcome==="passed"?"green":item.outcome==="rejected"?"amber":"neutral"}>{item.outcome==="rejected"?"Not selected":item.outcome}</Badge></div>{item.prompt&&<p className="target-debrief-prompt">{item.prompt}</p>}<dl>{[["What worked",item.worked],["Where I struggled",item.struggled],["Feedback received",item.feedback]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{item.nextAction&&<div className={`target-debrief-action ${item.resolvedAt?"resolved":""}`}><div><span>{item.resolvedAt?"Completed follow-up":"Next action"}</span><p>{item.nextAction}</p></div><ResolveControl key={`resolve-${item.id}-${item.revision??0}`} item={item} revisions={revisions} conflict={conflict} clearConflict={clearConflict} saving={saving} save={save}/></div>}{item.requirementIds.length>0&&<p className="target-related">Related: {item.requirementIds.map(id=>role.requirements.find(r=>r.id===id)?.title??id).join(" · ")}</p>}<details className="target-history-section"><summary>Saved debrief history</summary><CareerHistory revisions={revisions} entityType="debrief" entityId={item.id}/></details></article>;
}

function InterviewForm({role,existing,revisions,conflict,clearConflict,save,saving,close}:{role:TargetRole;existing?:TargetInterview;revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void;save:Save;saving:boolean;close:()=>void}) {
  const [initialId]=useState(()=>existing?.id??newId());
  const command=useCommandDraft(`interview:${role.id}:${existing?.id??"new"}`,existing?.revision??0);
  const {draft,setDraft,clearDraft,hasDraft}=useLocalDraft(`interview:${role.id}:${existing?.id??"new"}`, {id:initialId,title:existing?.title??"",date:localTime(existing?.scheduledAt??null),status:existing?.status??"target",format:existing?.format??"",notes:existing?.notes??""});
  const {id,title,date,status,format,notes}=draft;
  const setTitle=(value:string)=>setDraft(current=>({...current,title:value}));
  const setDate=(value:string)=>setDraft(current=>({...current,date:value}));
  const setStatus=(value:TargetInterview["status"])=>setDraft(current=>({...current,status:value}));
  const setFormat=(value:string)=>setDraft(current=>({...current,format:value}));
  const setNotes=(value:string)=>setDraft(current=>({...current,notes:value}));
  const needsReview=command.reviewRequired||(conflict?.entityType==="interview"&&conflict.entityId===id);
  return <form className="target-form" onSubmit={async e=>{e.preventDefault();const ok=await save({action:"interview",data:{id,companyId:role.companyId,roleId:role.id,title:title.trim(),scheduledAt:date?new Date(date).toISOString():null,status,format,notes}},command);if(ok){clearDraft();close();}}}><div className="target-form-title"><h4>{existing?"Edit interview":"New interview"}</h4><button type="button" aria-label="Close interview form" onClick={close}><X size={17}/></button></div><RecordReview command={command} entityType="interview" entityId={id} revision={existing?.revision??0} revisions={revisions} conflict={conflict} clearConflict={clearConflict}/><label className="target-field">Title<input disabled={saving} required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Technical interview, system design"/></label><div className="target-form-grid"><label className="target-field">Status<select disabled={saving} value={status} onChange={e=>setStatus(e.target.value as TargetInterview["status"])}><option value="target">Target</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label className="target-field">Date and time ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input disabled={saving} type="datetime-local" value={date} required={status==="scheduled"} onChange={e=>setDate(e.target.value)}/></label></div><label className="target-field">Format<input disabled={saving} maxLength={200} value={format} onChange={e=>setFormat(e.target.value)} placeholder="60 min coding, 60 min system design"/></label><label className="target-field">Notes<textarea disabled={saving} rows={3} maxLength={8000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Interviewer, meeting link, tool permissions, questions to confirm"/></label><div className="target-form-actions">{hasDraft&&<small className="muted">Draft kept in this tab</small>}<Button type="button" variant="ghost" onClick={close}>Close</Button><Button disabled={saving||needsReview||!title.trim()} type="submit">Save interview</Button></div></form>;
}

function DebriefForm({role,existing,interviews,revisions,conflict,clearConflict,save,saving,close}:{role:TargetRole;existing?:TargetDebrief;interviews:TargetInterview[];revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void;save:Save;saving:boolean;close:()=>void}) {
  const [initialId]=useState(()=>existing?.id??newId());
  const command=useCommandDraft(`debrief:${role.id}:${existing?.id??"new"}`,existing?.revision??0);
  const {draft,setDraft,clearDraft,hasDraft}=useLocalDraft(`debrief:${role.id}:${existing?.id??"new"}`, {id:initialId,date:existing?.occurredOn??localDate(),outcome:existing?.outcome??"pending",interviewId:existing?.interviewId??"",prompt:existing?.prompt??"",worked:existing?.worked??"",struggled:existing?.struggled??"",feedback:existing?.feedback??"",nextAction:existing?.nextAction??"",requirementIds:existing?.requirementIds??[] as string[]});
  const {id,date,outcome,interviewId,prompt,worked,struggled,feedback,nextAction,requirementIds}=draft;
  const setDate=(value:string)=>setDraft(current=>({...current,date:value}));
  const setOutcome=(value:TargetDebrief["outcome"])=>setDraft(current=>({...current,outcome:value}));
  const setInterviewId=(value:string)=>setDraft(current=>({...current,interviewId:value}));
  const setPrompt=(value:string)=>setDraft(current=>({...current,prompt:value}));
  const setWorked=(value:string)=>setDraft(current=>({...current,worked:value}));
  const setStruggled=(value:string)=>setDraft(current=>({...current,struggled:value}));
  const setFeedback=(value:string)=>setDraft(current=>({...current,feedback:value}));
  const setNextAction=(value:string)=>setDraft(current=>({...current,nextAction:value}));
  const setRequirementIds=(value:string[])=>setDraft(current=>({...current,requirementIds:value}));
  const needsReview=command.reviewRequired||(conflict?.entityType==="debrief"&&conflict.entityId===id);
  return <form className="target-form" onSubmit={async e=>{e.preventDefault();const ok=await save({action:"debrief",data:{id,roleId:role.id,interviewId:interviewId||null,occurredOn:date,outcome,prompt,worked,struggled,feedback,nextAction,requirementIds}},command);if(ok){clearDraft();close();}}}><div className="target-form-title"><h4>{existing?"Edit debrief":"What to take into the next interview"}</h4><button type="button" aria-label="Close debrief form" onClick={close}><X size={17}/></button></div><RecordReview command={command} entityType="debrief" entityId={id} revision={existing?.revision??0} revisions={revisions} conflict={conflict} clearConflict={clearConflict}/><div className="target-form-grid"><label className="target-field">Date<input disabled={saving} type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label className="target-field">Outcome<select disabled={saving} value={outcome} onChange={e=>setOutcome(e.target.value as TargetDebrief["outcome"])}><option value="pending">Waiting for feedback</option><option value="passed">Passed</option><option value="rejected">Not selected</option><option value="practice">Practice session</option></select></label></div><label className="target-field">Interview<select disabled={saving||Boolean(existing)} value={interviewId} onChange={e=>setInterviewId(e.target.value)}><option value="">Not linked to an interview</option>{interviews.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="target-field">What were you asked?<textarea disabled={saving} rows={2} maxLength={12000} value={prompt} onChange={e=>setPrompt(e.target.value)}/></label><div className="target-form-grid"><label className="target-field">What worked<textarea disabled={saving} rows={3} maxLength={8000} value={worked} onChange={e=>setWorked(e.target.value)}/></label><label className="target-field">Where I struggled<textarea disabled={saving} rows={3} maxLength={8000} value={struggled} onChange={e=>setStruggled(e.target.value)}/></label></div><label className="target-field">Feedback received<textarea disabled={saving} rows={2} maxLength={8000} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Keep their feedback separate from your own interpretation."/></label><label className="target-field">Next action<textarea disabled={saving} rows={2} maxLength={4000} value={nextAction} onChange={e=>setNextAction(e.target.value)} placeholder="One specific thing to practice or change. This goes to the top of your plan."/></label><fieldset className="target-related-fields"><legend>Connect to requirements</legend>{role.requirements.map(item=><label key={item.id}><input disabled={saving} type="checkbox" checked={requirementIds.includes(item.id)} onChange={e=>setRequirementIds(e.target.checked?[...requirementIds,item.id]:requirementIds.filter(id=>id!==item.id))}/>{item.title}</label>)}</fieldset><div className="target-form-actions">{hasDraft&&<small className="muted">Draft kept in this tab</small>}<Button type="button" variant="ghost" onClick={close}>Close</Button><Button disabled={saving||needsReview||![prompt,worked,struggled,feedback,nextAction].some(text=>text.trim())} type="submit">Save debrief</Button></div></form>;
}

function RoleStage({role,current,revisions,conflict,clearConflict,save,saving}:{role:TargetRole;current?:TargetRoleState;revisions:RecordRevision[];conflict:ConflictRecord|null;clearConflict:()=>void;save:Save;saving:boolean}) {
  const revision = current?.revision ?? 0;
  const command = useCommandDraft(`pipeline:${role.id}`, revision);
  const currentStage = current?.detailedStage ?? detailedForBoard(current?.stage);
  const {draft,setDraft,clearDraft,hasDraft}=useLocalDraft(`pipeline:${role.id}`, {stage:current?.stage??boardStage(currentStage),detailedStage:currentStage,notes:current?.notes??""});
  const notes=draft.notes;
  const selectedStage = command.reviewRequired && hasDraft && boardStage(draft.detailedStage) !== draft.stage
    ? detailedForBoard(draft.stage)
    : careerStages.includes(draft.detailedStage) ? draft.detailedStage : currentStage;
  const setNotes=(value:string)=>setDraft(valueDraft=>({...valueDraft,notes:value}));
  const stageRecordId=candidacyId(role);
  const hasConflict=conflict?.entityType==="candidacy"&&conflict.entityId===stageRecordId;
  const canReview=hasConflict||command.reviewRequired;
  const dirty=selectedStage!==currentStage||notes!==(current?.notes??"");
  function stageMutation(detailedStage:CareerStage, pipelineNotes:string) {
    return {action:"roleState",data:{roleId:role.id,stage:boardStage(detailedStage),detailedStage,notes:pipelineNotes}} as const;
  }
  async function saveStage(detailedStage=selectedStage,pipelineNotes=notes) {
    if(await save(stageMutation(detailedStage,pipelineNotes),command)) clearDraft();
  }
  function acceptCurrent() { setDraft(value=>({...value,detailedStage:selectedStage,stage:boardStage(selectedStage)})); command.acceptRevision(revision); clearConflict(); }
  const [expanded,setExpanded]=useState(false);
  if(role.companyId==="general")return null;
  return <div className="target-pipeline-edit"><label>Pipeline<select aria-label="Role pipeline stage" disabled={saving||canReview} value={selectedStage} onChange={e=>{const detailedStage=e.target.value as CareerStage;setDraft(value=>({...value,detailedStage,stage:boardStage(detailedStage)}));if(!command.reviewRequired)void saveStage(detailedStage,notes);}}>{careerStages.map(stage=><option key={stage} value={stage}>{stage}</option>)}</select></label><button className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?"Hide notes":"Pipeline notes"}<ChevronDown size={12}/></button>{canReview&&<div className="career-conflict-review" role="status"><strong>{hasConflict?"This record changed while you were editing.":"Review this saved draft before sending it."}</strong><p>The latest saved snapshot is open below. Your draft is still here.</p><CareerHistory revisions={revisions} entityType="candidacy" entityId={stageRecordId}/><div className="career-conflict-actions"><Button variant="secondary" disabled={saving} onClick={acceptCurrent}>Use current revision for my draft</Button></div></div>}{!canReview&&dirty&&<Button variant="secondary" disabled={saving} onClick={()=>void saveStage()}>Save stage and notes</Button>}{expanded&&<div className="target-pipeline-notes"><label className="target-field">Status notes<textarea disabled={saving} rows={2} maxLength={8000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Recruiter follow-up, next step, or reason for closing this role"/></label>{hasDraft&&!canReview&&<small className="muted">Draft kept in this tab</small>}<div className="target-history-section"><details><summary>Saved stage history</summary><CareerHistory revisions={revisions} entityType="candidacy" entityId={stageRecordId}/></details></div></div>}</div>;
}

function Pipeline({ data, onOpen, onOpenCompany, onCompanyCreated }: { data: TargetsState; onOpen: (id: string) => void; onOpenCompany: (id: string) => void; onCompanyCreated: (id: string) => Promise<void> }) {
  const [companyFilter, setCompanyFilter] = useState("all");
  const [showResearch, setShowResearch] = useState(false);
  const stageByRole = new Map((data.roleStates ?? []).map(item => [item.roleId, item.stage]));
  const companies = new Map(data.companies.map(company => [company.id, company]));
  const now = Date.now();
  const currentRounds = data.interviews.filter(item => item.status === "scheduled" && item.scheduledAt && Date.parse(item.scheduledAt) >= now);
  const pastRounds = data.interviews.filter(item => item.status === "completed" || item.status === "cancelled" || (item.scheduledAt && Date.parse(item.scheduledAt) < now && item.status === "scheduled"));
  const currentRoles = data.roles.filter(role => role.companyId !== "general" && (stageByRole.get(role.id) === "active" || stageByRole.get(role.id) === "offer" || currentRounds.some(round => round.roleId === role.id)));
  const prospectRoles = data.roles.filter(role => role.companyId !== "general" && (!stageByRole.has(role.id) || stageByRole.get(role.id) === "prospect" || stageByRole.get(role.id) === "needs-review"));
  const pastRoles = data.roles.filter(role => role.companyId !== "general" && (stageByRole.get(role.id) === "rejected" || stageByRole.get(role.id) === "withdrawn"));
  // A company has one place on the board. Its roles keep their own stages.
  const currentCompanies = new Set([...currentRoles.map(role => role.companyId), ...currentRounds.map(round => round.companyId)]);
  const prospectCompanies = new Set([...prospectRoles.map(role => role.companyId), ...data.companies.filter(company => company.id !== "general" && !data.roles.some(role => role.companyId === company.id)).map(company => company.id)].filter(id => !currentCompanies.has(id)));
  const pastCompanies = new Set([...pastRoles.map(role => role.companyId), ...pastRounds.map(round => round.companyId)].filter(id => !currentCompanies.has(id) && !prospectCompanies.has(id)));
  const sections = [
    {id:"current",title:"Current interviews",companyIds:currentCompanies,empty:"No active interviews or scheduled rounds."},
    {id:"prospects",title:"Prospects",companyIds:prospectCompanies,empty:"No prospects yet. Add a company to get started."},
    {id:"past",title:"Past interviews",companyIds:pastCompanies,empty:"Completed rounds and closed applications will appear here."},
  ];
  return <div className="target-pipeline target-pipeline-grid">
    <PageActions className="company-board-actions">
      <Select value={companyFilter} onValueChange={setCompanyFilter}>
        <SelectTrigger aria-label="Filter by company"><SelectValue placeholder="All companies" /></SelectTrigger>
        <SelectContent position="popper" align="end"><SelectItem value="all">All companies</SelectItem>{data.companies.filter(item => item.id !== "general").map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
      </Select>
      <ActionButton aria-expanded={showResearch} onClick={() => setShowResearch(value => !value)}>{showResearch ? <X /> : <Plus />}{showResearch ? "Close research" : "Add company"}</ActionButton>
    </PageActions>
    {showResearch && <CompanyResearch companies={data.companies.filter(company => company.id !== "general")} onCompanyCreated={onCompanyCreated} />}
    {sections.map(section => {
      const uniqueCompanyIds = [...section.companyIds].filter(id => id !== "general" && (companyFilter === "all" || id === companyFilter)).sort((a,b) => Number(b === "sycamore") - Number(a === "sycamore") || (companies.get(a)?.name ?? a).localeCompare(companies.get(b)?.name ?? b));
      return <section className="target-pipeline-section" key={section.id} aria-labelledby={`pipeline-${section.id}`}>
      <header className="target-pipeline-section-heading"><h2 id={`pipeline-${section.id}`}>{section.title}</h2><span>{uniqueCompanyIds.length}</span></header>
    <div className="target-company-groups" aria-label={section.title}>{uniqueCompanyIds.map(companyId => {
      const company = companies.get(companyId);
      if (!company) return null;
      const roles = data.roles.filter(role => role.companyId === companyId);
      const rounds = pastRounds.filter(round => round.companyId === companyId);
      const brand = companyBranding[companyId];
      return <button className="company-tile" key={companyId} style={companySurface(brand?.accent)} onClick={()=>onOpenCompany(companyId)} aria-label={`Open ${company.name} company details`}>
        <span className="company-tile-logo">{brand?.logoPath ? <img src={brand.logoPath} alt=""/> : <span>{company.name.slice(0,1)}</span>}</span>
        <strong>{company.name}</strong>
        <span className="company-tile-count">{roles.length ? `${roles.length} ${roles.length === 1 ? "role" : "roles"}` : rounds.length ? `${rounds.length} past rounds` : "Company prospect"}</span>
      </button>;
    })}</div>
    {!uniqueCompanyIds.length && <p className="target-section-empty">{companyFilter === "all" ? section.empty : "No matching companies in this section."}</p>}
    </section>;
    })}
    {data.roles.find(role => role.companyId === "general") && <button className="target-general-link" onClick={() => onOpen(data.roles.find(role => role.companyId === "general")!.id)}><BookOpen size={17} /><span><strong>General preparation</strong><small>Shared foundations across every company</small></span><ArrowRight size={14} /></button>}
  </div>;
}

function CompanyHome({company,data,workspace,onRole,onApplication,onResearch}:{company:TargetsState["companies"][number];data:TargetsState;workspace:WorkspaceState;onRole:(id:string)=>void;onApplication:(id:string)=>void;onResearch:()=>void}) {
  const brand=companyBranding[company.id];
  const roles=data.roles.filter(role=>role.companyId===company.id);
  const applicationIds=new Set(roles.map(role=>role.applicationId).filter(Boolean));
  const applications=workspace.applications.filter(item=>applicationIds.has(item.id)||item.company.toLowerCase()===company.name.toLowerCase());
  const activity=workspace.activities.filter(item=>applications.some(app=>app.id===item.applicationId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const rounds=data.interviews.filter(item=>item.companyId===company.id);
  const [profile,setProfile]=useState<ReturnType<typeof researchStateSchema.parse>["profiles"][number]|null>(null);
  useEffect(()=>{let cancelled=false;workspaceFetch("/api/company-research",{cache:"no-store"}).then(async r=>r.ok?researchStateSchema.parse(await r.json()):null).then(state=>{if(!cancelled)setProfile(state?.profiles.find(p=>p.companyId===company.id)??null);}).catch(()=>{});return()=>{cancelled=true;};},[company.id]);
  return <>
    <header className="company-home-heading"><span className="company-home-logo" style={companySurface(brand?.accent)}>{brand?.logoPath?<img src={brand.logoPath} alt=""/>:<strong>{company.name.slice(0,1)}</strong>}</span><div><h1>{company.name}</h1><p>{profile?.overview||brand?.overview||company.summary||company.focus}</p></div></header>
    {(profile?.pitch||brand?.pitch)&&<section className="company-home-pitch"><h2>Elevator pitch</h2><p>{profile?.pitch||brand?.pitch}</p></section>}
    <section className="company-home-section"><header><h2>Careers</h2><button onClick={onResearch}>Research openings<ArrowRight size={14}/></button></header>
      {roles.length?<div className="company-careers-scroll"><table className="company-careers"><thead><tr><th>Role</th><th>Stage</th><th>Preparation</th></tr></thead><tbody>{roles.map(role=>{const state=data.roleStates.find(item=>item.roleId===role.id);const completed=data.progress.filter(item=>item.roleId===role.id&&item.status==="done").length;return <tr key={role.id}><td><button onClick={()=>onRole(role.id)}>{role.title}<ArrowRight size={14}/></button></td><td>{state?.detailedStage??state?.stage??"Prospect"}</td><td>{completed}/{role.steps.length} steps</td></tr>;})}</tbody></table></div>:<p className="company-home-empty">No saved roles yet. Research openings to find relevant positions.</p>}
    </section>
    <section className="company-home-section"><header><h2>Learning tracks</h2></header><div className="company-track-grid">{roles.map(role=><button key={role.id} onClick={()=>onRole(role.id)}><BookOpen size={23}/><strong>{role.title}</strong><span>{role.steps.length} preparation steps</span></button>)}</div>{!roles.length&&<p className="company-home-empty">Learning tracks appear when you add a role.</p>}</section>
    <section className="company-home-section"><header><h2>Activity</h2></header>{activity.length||rounds.length?<div className="company-activity">{rounds.map(round=><button key={round.id} onClick={()=>onRole(round.roleId)}><CalendarDays size={16}/><span><strong>{round.title}</strong><small>{round.status} · {round.scheduledAt?new Date(round.scheduledAt).toLocaleString():"Date not set"}</small></span></button>)}{activity.map(item=><button key={item.id} onClick={()=>onApplication(item.applicationId)}><Clock3 size={16}/><span><strong>{item.kind} · {new Date(item.createdAt).toLocaleDateString()}</strong><p>{item.body}</p></span></button>)}</div>:<p className="company-home-empty">No saved activity or interview rounds yet.</p>}</section>
  </>;
}

function CompanyIdentity({ companyId, name, level = "h2" }: { companyId: string; name: string; level?: "h1" | "h2" | "h3" }) {
  const brand = companyBranding[companyId];
  const Heading = level;
  return <div className="target-company-identity"><span className="target-company-logo">{brand?.logoPath ? <img src={brand.logoPath} alt="" /> : <span>{name.slice(0, 1)}</span>}</span><Heading>{name}</Heading></div>;
}

function CompanySummary({ companyId, summary, focus }: { companyId: string; summary: string; focus: string }) {
  const brand = companyBranding[companyId];
  const overview = brand?.overview || summary || focus;
  if (!overview && !brand?.pitch && !brand?.sourceUrl) return null;
  return <section className="target-company-summary"><p>{overview}</p>{brand?.pitch && <details><summary>Elevator pitch</summary><p>{brand.pitch}</p></details>}{brand?.sourceUrl && <a href={brand.sourceUrl} target="_blank" rel="noreferrer">Overview source<ExternalLink size={12} /></a>}</section>;
}
