"use client";
import { reviewCounts } from "@/lib/review-summary";
import LearningHome from "@/components/learning-home";
import { PageFrame, WorkspaceHeader, WorkspaceSections, type WorkspaceView } from "@/components/workspace-chrome";
import { PracticeHub } from "@/components/practice-hub";
import { studyCourses } from "@/data/study-courses";
import { studyPaths } from "@/data/study-catalog";
import { isInLearning, learningSelection } from "@/lib/learning-catalog";
import { WorkspaceSession } from "@/components/workspace-session";
import { notifyAccountChange, workspaceSessionStorage } from "@/components/workspace-client";

import { workspaceFetch } from "@/components/workspace-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, Circle, Clock3, Code2, ExternalLink, FileText, Flag, Layers3, Lightbulb, Loader2, Menu, MessageSquare, MoreHorizontal, Pause, Play, Plus, Printer, RotateCcw, Search, Sparkles, Target, Timer, UserRound, X } from "lucide-react";
import { roles, cheatSheets, flashcards, exercises, stories } from "@/data/prep";
import type { Application, Exercise, WorkspaceState } from "@/lib/types";
import { Badge, Button, Empty, PageHeader } from "@/components/ui";
import Practice from "@/components/features/practice/practice-workspace";
import type { PracticeOrigin, PracticeCommand, PracticeAttempt } from "@/contracts/practice";
import { practiceCommandSchema, practiceResponseSchema } from "@/contracts/practice";
import DesignBoard from "@/components/design-board";
import { ApplicationDocuments, RoleLibrary } from "@/components/documents";
import AlgorithmLab from "@/components/algorithm-lab";
import KnowledgeLibrary from "@/components/knowledge-library";
import StudyWorkspace from "@/components/features/study/study-workspace";
import { DeemsBrand, BrandState } from "@/components/brand";
import "./learning-shell.css";
import "./desk-navigation.css";
import "./lms-theme.css";
import PrepLibrary, { type PrepCategory } from "@/components/features/prep/prep-library";
import { studyRouteKey, learningSelectionKey, type StudyTab, type StudyLaunch } from "@/contracts/study";
import { workspaceStateSchema, workspaceMutationSchema } from "@/contracts/workspace";
import { targetStateSchema } from "@/contracts/targets";
import TargetWorkspace from "@/components/target-workspace";
import { careerStages, type CommandMeta } from "@/domains/career/contracts";
import type { TargetsState } from "@/lib/target-types";
import { useLocalDraft } from "@/components/use-local-draft";
import { useCommandDraft } from "@/components/use-command-draft";
import { CareerHistory } from "@/components/features/career/history";
import { RevisionNote } from "@/components/revision-note";
import { personalPrepResponseSchema, type PersonalStory } from "@/contracts/personal-prep";

type View = WorkspaceView;

const navigation = [{ name: "Interviews", icon: Target }, { name: "Today", icon: Clock3 }, { name: "Study", icon: BookOpen }, { name: "Practice", icon: Code2 }, { name: "Algorithms", icon: Layers3 }, { name: "Reference", icon: FileText }, { name: "Applications", icon: BriefcaseBusiness }, { name: "Experience", icon: UserRound }] as const;
const blank: WorkspaceState = { applications: [], reviews: [], sessions: [], activities: [], notes: {}, settings: {} };
function newId() { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
const stages = careerStages;

function InterviewDesk() {
  const [view, setView] = useState<View>("Home");
  const [prepCategory, setPrepCategory] = useState<PrepCategory>("Coding");
  const [state, setState] = useState<WorkspaceState>(blank);
  const [loading, setLoading] = useState(true);
  const [workspaceUnavailable, setWorkspaceUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(()=>{void workspaceFetch("/api/auth/session",{cache:"no-store"}).then(response=>response.json()).then(data=>setAuthenticated(data.authenticated===true)).catch(()=>{});},[]);
  async function signOut() {
    try {
      const response=await workspaceFetch("/api/auth/logout",{method:"POST"});
      if(!response.ok) throw new Error("Could not sign out. Please retry.");
      notifyAccountChange(); window.location.assign("/login");
    } catch(error) {setError(error instanceof Error?error.message:"Could not sign out.");}
  }
  const [mobileMenu, setMobileMenu] = useState(false);
  const [headerDate, setHeaderDate] = useState("");
  useEffect(() => {
    const refreshDate = () => setHeaderDate(new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
    refreshDate();
    window.addEventListener("focus", refreshDate);
    return () => window.removeEventListener("focus", refreshDate);
  }, []);
  const [studyTab, updateStudyTab] = useState<StudyTab>("Courses");
  const [studyLaunch, setStudyLaunch] = useState<StudyLaunch | null | undefined>(undefined);
  const [studyNavigationKey, setStudyNavigationKey] = useState(0);
  const [careerNavigationKey, setCareerNavigationKey] = useState(0);
  function setStudyTab(tab: StudyTab) {
    updateStudyTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("format", tab === "My learning" ? "my-learning" : tab.toLowerCase());
    window.history.replaceState(null, "", url);
  }
  useEffect(() => {
    const restoreView = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "practice") {
        const exercise = params.get("exercise");
        if (exercise && exercises.some(item => item.id === exercise)) setSelectedExercise(exercise);
        setPracticeOrigin(params.get("role") && params.get("step") ? {roleId:params.get("role")!,planStepId:params.get("step")!} : null);
        setSelectedAttemptId(params.get("attempt") ?? undefined);
      }
      if (params.get("view") === "study") {
        setView("Study");
        const format = params.get("format");
        updateStudyTab(format === "my-learning" ? "My learning" : format === "quizzes" ? "Quizzes" : format === "guides" ? "Guides" : format === "flashcards" ? "Flashcards" : "Courses");
      } else if (params.get("view") === "practicehub") {
        setView("PracticeHub");
      } else if (params.get("view") === "preparation") {
        setView("Preparation");
        const category = params.get("category");
        setPrepCategory(category === "System design" || category === "Behavioral" || category === "Management" ? category : "Coding");
      } else {
        const found = navigation.find(item => item.name.toLowerCase() === params.get("view"));
        setView(params.get("view") === "home" ? "Home" : found?.name ?? "Home");
      }
    };
    restoreView();
    window.addEventListener("popstate", restoreView);
    return () => window.removeEventListener("popstate", restoreView);
  }, []);
  const [selectedGuide, setSelectedGuide] = useState("agent-design");
  const [selectedExercise, setSelectedExercise] = useState(exercises[0]?.id ?? "");
  const [practiceOrigin, setPracticeOrigin] = useState<PracticeOrigin | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | undefined>();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | undefined>();
  const [selectedReference, setSelectedReference] = useState<string | undefined>();
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await workspaceFetch("/api/workspace", { cache: "no-store" }); if (!response.ok) throw new Error("Your workspace could not be reached. Your saved data has not been changed."); setState(workspaceStateSchema.parse(await response.json())); setWorkspaceUnavailable(false); return true; }
    catch (e) { setWorkspaceUnavailable(true); setError(e instanceof Error ? e.message : "Could not load your workspace."); return false; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [view]);

  async function mutate(action: string, data: unknown, meta?: CommandMeta) {
    setSaving(true); setError(""); setSaved("");
    try {
      const response = await workspaceFetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspaceMutationSchema.parse({ action, data, meta })) });
      if (!response.ok) { const problem = await response.json().catch(() => ({})); if(response.status===409 || response.status===428) { const fresh=await workspaceFetch("/api/workspace",{cache:"no-store"}); if(fresh.ok)setState(workspaceStateSchema.parse(await fresh.json())); } throw new Error(problem.error || "Could not save your changes. Please try again."); }
      const next = workspaceStateSchema.parse(await response.json());
      if (next.applications && next.sessions) setState(next); else { const refresh = await workspaceFetch("/api/workspace", { cache: "no-store" }); if (!refresh.ok) throw new Error("Saved, but could not refresh the workspace. Reload to verify."); setState(workspaceStateSchema.parse(await refresh.json())); }
      setSaved("Saved"); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); return false; }
    finally { setSaving(false); }
  }

  function navigate(next: View) {
    const show=()=>{
      setView(next);setMobileMenu(false);setSaved("");
      const url = new URL(window.location.href);
      if (next === "Study") url.searchParams.set("view", "study");
      else { url.searchParams.set("view", next.toLowerCase()); url.searchParams.delete("format"); }
      if (next !== "Preparation") url.searchParams.delete("category");
      window.history.replaceState(null, "", url);
    };
    show();
    if(next==="Study"||next==="Applications"||next==="Experience"||next==="Algorithms") void load();
  }
  function openExercise(id: string, origin: PracticeOrigin | null = null, attemptId?: string) {
    setSelectedExercise(id); setPracticeOrigin(origin); setSelectedAttemptId(attemptId); navigate("Practice");
    const url = new URL(window.location.href);
    url.searchParams.set("exercise",id);
    for (const key of ["role","step","attempt"]) url.searchParams.delete(key);
    if (origin) {url.searchParams.set("role",origin.roleId);url.searchParams.set("step",origin.planStepId);}
    if (attemptId) url.searchParams.set("attempt",attemptId);
    window.history.replaceState(null,"",url);
  }
  function openPractice(kind?: string) {openExercise(exercises.find(item=>item.kind===kind)?.id ?? selectedExercise);}
  function returnToPlan(origin: PracticeOrigin) {
    navigate("Interviews");
    const url = new URL(window.location.href);
    url.searchParams.set("role",origin.roleId);url.searchParams.set("step",origin.planStepId);
    url.searchParams.delete("attempt");url.searchParams.delete("exercise");
    window.history.replaceState(null,"",url);
  }
  async function practiceCommand(command: PracticeCommand): Promise<PracticeAttempt | null> {
    setSaving(true);setError("");
    try {
      const response = await workspaceFetch("/api/practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(practiceCommandSchema.parse(command))});
      if (!response.ok) {
        const problem=await response.json().catch(()=>({}));
        if(response.status===409) await load();
        throw new Error(problem.error || "Practice save could not be confirmed. Retry with your saved draft.");
      }
      const {attempt}=practiceResponseSchema.parse(await response.json());
      const refreshed=await load();
      if(!refreshed) throw new Error("The save was accepted, but readback failed. Retry the same save to confirm it.");
      setSaved("Saved");return attempt;
    } catch(error) {setError(error instanceof Error?error.message:"Practice save failed.");return null;}
    finally {setSaving(false);}
  }
  function openStudy(id?: string) { if (id) setSelectedGuide(id); library("Guides"); }
  const activeApplication = state.applications.find(a => a.id === selectedApplication);
  function openCategory(category: PrepCategory) {
    setPrepCategory(category); navigate("Preparation");
    const url = new URL(window.location.href); url.searchParams.set("category", category); window.history.replaceState(null, "", url);
  }
  function library(tab: StudyTab) {
    setStudyLaunch(null); setStudyNavigationKey(key => key + 1);
    try { workspaceSessionStorage.removeItem(studyRouteKey); } catch { /* The in-memory route still opens the requested view. */ }
    setStudyTab(tab); navigate("Study");
  }
  async function openCourse(courseId: string, lessonId?: string, mode: "course" | "quiz" = "course") {
    const course = studyCourses.find(item => item.id === courseId);
    if (!course) return;
    const lesson = course.lessons.find(item => item.id === lessonId);
    if (lesson) {
      const selection = learningSelection(state.settings, "course", course.id, true, { lessonId: lesson.id, mode });
      if (!await mutate("setting", { key: learningSelectionKey("course", course.id), value: JSON.stringify(selection) })) return;
    }
    const route: StudyLaunch = { courseId: course.id, ...(lesson ? { lessonId: lesson.id } : {}), mode };
    setStudyLaunch(route); setStudyNavigationKey(key => key + 1);
    try { workspaceSessionStorage.setItem(studyRouteKey, JSON.stringify(route)); } catch { /* The in-memory route still opens the requested course. */ }
    setStudyTab(isInLearning({ kind: "course", item: course }, state.settings) ? "My learning" : "Courses"); navigate("Study");
  }
  function openPath(pathId: string) {
    const path = studyPaths.find(item => item.id === pathId);
    if (!path) return;
    const route: StudyLaunch = { pathId };
    setStudyLaunch(route); setStudyNavigationKey(key => key + 1);
    try { workspaceSessionStorage.setItem(studyRouteKey, JSON.stringify(route)); } catch { /* The in-memory route still opens this path. */ }
    setStudyTab(isInLearning({ kind: "path", item: path }, state.settings) ? "My learning" : "Courses"); navigate("Study");
  }
  function openCareer(companyId?: string, roleId?: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "interviews");
    for (const key of ["role", "company", "step", "format", "exercise", "attempt"]) url.searchParams.delete(key);
    if (companyId) url.searchParams.set("company", companyId);
    if (roleId) url.searchParams.set("role", roleId);
    if (!companyId && !roleId) url.searchParams.set("overview", "companies");
    else url.searchParams.delete("overview");
    window.history.replaceState(null, "", url);
    setCareerNavigationKey(key => key + 1);
    setView("Interviews"); window.scrollTo({ top: 0, behavior: "instant" });
  }
  const focused = view === "Home" || view === "Study" || view === "Interviews" || view === "Preparation" || view === "PracticeHub";

  return <div className={`app-shell desk-shell light-lms ${focused ? "learning-shell" : ""}`}>
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate("Home"); }}><DeemsBrand /></a>
      <nav aria-label="Main navigation">{navigation.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${view === name ? "active" : ""}`} onClick={() => navigate(name)} aria-current={view === name ? "page" : undefined}><Icon size={18} /><span>{name}</span>{name === "Applications" && <span className="nav-count">{state.applications.length || roles.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><span className="profile-avatar">D</span><div><strong>Your workspace</strong><span>Personal workspace</span></div></div></div>
    </aside>
    {mobileMenu && <button aria-label="Close navigation" className="sidebar-scrim" onClick={() => setMobileMenu(false)} />}
    <div className="main-shell">
      <WorkspaceHeader view={view} studyTab={studyTab} authenticated={authenticated} onSignOut={() => void signOut()} onNavigate={navigate} onLibrary={library} onCategory={openCategory} onCareer={() => openCareer()} />
      <PageFrame workbench={view === "Algorithms"} className={view === "Study" ? "study-main" : focused ? "prep-main" : ""}>
        <WorkspaceSections view={view} studyTab={studyTab} category={prepCategory} onNavigate={navigate} onLibrary={library} onCategory={openCategory} onCareer={() => openCareer()} />
        {error && (view !== "Home" || !workspaceUnavailable) && <div className="notice notice-error" role="alert"><span>{error}</span><Button variant="ghost" onClick={load}>Retry connection</Button></div>}
        <div className={`save-status ${saving || saved ? "is-visible" : ""}`} role="status">{saving ? <><Loader2 size={13} className="spin" />Saving...</> : saved ? <><Check size={13} />{saved}</> : null}</div>
        {view === "Home" && <LearningHome onCareer={openCareer} state={state} loading={loading} onOpenCourse={openCourse} onOpenPath={openPath} onMyLearning={() => library("My learning")} onReview={() => library("Flashcards")} historyUnavailable={workspaceUnavailable} onRetry={() => void load()} onCourses={() => library("Courses")} onArea={area => { if (area === "Coding") openCategory("Coding"); else if (area === "AI & systems") library("Courses"); else if (area === "Frameworks & tools") navigate("Reference"); else if (area === "Team management") openCategory("Management"); else openCategory("Behavioral"); }} />}
        {view === "PracticeHub" && <PracticeHub state={state} loading={loading} unavailable={workspaceUnavailable} onLibrary={library} onCategory={openCategory} onAlgorithms={() => navigate("Algorithms")} onExercise={openPractice} />}
        {view === "Preparation" && <PrepLibrary category={prepCategory} onGuide={openStudy} onPractice={openPractice} onAlgorithms={()=>navigate("Algorithms")} onStories={()=>navigate("Experience")} onStudy={()=>library("Courses")} onReference={()=>navigate("Reference")}/>}
        {view === "Interviews" && <TargetWorkspace key={careerNavigationKey} onGeneralPreparation={() => { const url = new URL(window.location.href); url.searchParams.delete("role"); url.searchParams.delete("step"); window.history.replaceState(null, "", url); navigate("Preparation"); }} workspace={state} onApplication={id => { setSelectedApplication(id); navigate("Applications"); }} onViewAttempt={attempt => openExercise(attempt.exerciseId,attempt.origin,attempt.sessionId)} onResource={(resource, origin) => { if (resource.kind === "guide") openStudy(resource.id); else if (resource.kind === "exercise") { openExercise(resource.id, origin ?? null); } else if (resource.kind === "algorithm") { setSelectedAlgorithm(resource.id); navigate("Algorithms"); } else if (resource.kind === "reference") { setSelectedReference(resource.id); navigate("Reference"); } }} />}
        {view === "Today" && <Today state={state} onPractice={openPractice} onStudy={openStudy} onNavigate={navigate} onApplication={id => { setSelectedApplication(id); navigate("Applications"); }} onReview={() => { setStudyTab("Flashcards"); navigate("Study"); }} />}
        {view === "Study" && (state === blank && studyTab !== "Courses" && studyTab !== "Guides" ? <BrandState kind={loading ? "loading" : "error"} title={loading ? "Loading your learning progress" : "Could not load your progress"} action={!loading ? <Button onClick={load}>Try again</Button> : undefined} /> : <StudyWorkspace key={studyNavigationKey} initialRoute={studyLaunch} onCareer={openCareer} state={state} tab={studyTab} setTab={setStudyTab} selected={selectedGuide} setSelected={setSelectedGuide} mutate={mutate} saving={saving} onPractice={id => openExercise(id)} />)}
        {view === "Practice" && <Practice key={selectedExercise} exerciseId={selectedExercise} select={id=>openExercise(id)} state={state} onCommand={practiceCommand} saving={saving} origin={practiceOrigin} onReturn={returnToPlan} selectedAttemptId={selectedAttemptId} />}
        {view === "Algorithms" && <AlgorithmLab initialSelectedId={selectedAlgorithm} state={state} mutate={mutate} saving={saving} />}
        {view === "Reference" && <KnowledgeLibrary initialSelectedId={selectedReference} />}
        {view === "Applications" && <Applications state={state} selected={activeApplication} select={setSelectedApplication} mutate={mutate} saving={saving} loading={loading} />}
        {view === "Experience" && <Background state={state} mutate={mutate} saving={saving} />}
      </PageFrame>
    </div>
  </div>;
}

function PageHeading({ title, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <PageHeader title={title} actions={action} />; }

function Today({ state, onPractice, onStudy, onNavigate, onApplication, onReview }: { state: WorkspaceState; onPractice: (kind?: string) => void; onStudy: (id?: string) => void; onNavigate: (v: View) => void; onApplication: (id: string) => void; onReview: () => void }) {
  const [schedule,setSchedule]=useState<TargetsState|null>(null);
  const [scheduleError,setScheduleError]=useState("");
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{ let cancelled=false;
    async function refresh(){ try {const response=await workspaceFetch("/api/targets",{cache:"no-store"});if(!response.ok)throw new Error("Schedule unavailable. Retry by reopening Today.");const data=targetStateSchema.parse(await response.json());if(!cancelled){setSchedule(data);setScheduleError("");setNow(Date.now());}}catch(error){if(!cancelled)setScheduleError(error instanceof Error?error.message:"Schedule unavailable.");}}
    void refresh();window.addEventListener("focus",refresh);const timer=window.setInterval(()=>setNow(Date.now()),60000);
    return()=>{cancelled=true;window.removeEventListener("focus",refresh);window.clearInterval(timer);};
  },[]);
  const upcoming=schedule?.interviews.filter(round=>round.status==="scheduled"&&round.scheduledAt&&Date.parse(round.scheduledAt)>=now).sort((a,b)=>Date.parse(a.scheduledAt!)-Date.parse(b.scheduledAt!)||a.id.localeCompare(b.id))[0];
  const nextCompany=schedule?.companies.find(company=>company.id===upcoming?.companyId);
  const nextRole=schedule?.roles.find(role=>role.id===upcoming?.roleId);

  const reviewSummary = reviewCounts(state.reviews);
  const due = reviewSummary.due;
  const activeRoles = state.applications.slice().sort((a, b) => Number(b.roleId === "fde") - Number(a.roleId === "fde") || Number(b.company === "Ollama") - Number(a.company === "Ollama")).slice(0, 3);
  const sourceRoles = [state.applications.find(a => a.roleId === "fde"), state.applications.find(a => a.company === "Ollama")].filter((a): a is Application => Boolean(a));
  const prep = ["coding-collab", "agent-design", "math-patterns"].map(id => cheatSheets.find(guide => guide.id === id)).filter((guide): guide is typeof cheatSheets[number] => Boolean(guide));
  return <div className="today-workbench">
    <PageHeading title="Upcoming" action={<Button variant="secondary" onClick={() => window.print()}><Printer size={15} />Print</Button>} />
    <section className="interview-workbench">
      <div className="interview-workbench-heading"><div><span className="section-kicker">{upcoming?"NEXT INTERVIEW":"PREPARATION"}</span><h2>{upcoming?nextCompany?.name??"Upcoming interview":"Keep preparing"}</h2><p>{upcoming?`${nextRole?.title??""} · ${upcoming.title}`:scheduleError||(!schedule?"Loading saved schedule...":"No upcoming interview is scheduled.")}</p></div>{upcoming?.scheduledAt&&<div className="interview-time"><strong>{new Date(upcoming.scheduledAt).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit",timeZoneName:"short"})}</strong><span>{new Date(upcoming.scheduledAt).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span></div>}</div>
      <div className="interview-practice-options"><div><span className="workbench-icon"><Code2 size={21} /></span><div><h3>Live coding</h3><p>60 min · Python / JavaScript</p></div><Button onClick={() => onPractice("Live coding")}>Practice<ArrowRight size={15} /></Button></div><div><span className="workbench-icon"><Layers3 size={21} /></span><div><h3>System design</h3><p>60 min · Architecture & tradeoffs</p></div><Button variant="secondary" onClick={() => onPractice("System design")}>Practice<ArrowRight size={15} /></Button></div></div>
      <div className="interview-open-questions"><Flag size={13} /><span>Confirm the role, session format, and tool permissions before a scheduled round.</span></div>
    </section>
    <div className="workbench-columns"><div><section className="workbench-section"><div className="section-heading"><h2>Study</h2><button className="text-button" onClick={() => onStudy()}>All guides<ArrowRight size={14} /></button></div><div className="workbench-list">{prep.map(guide => <button key={guide.id} onClick={() => onStudy(guide.id)}><BookOpen size={17} /><span><strong>{guide.title}</strong>{guide.category !== guide.title && <small>{guide.category}</small>}</span><ChevronRight size={15} /></button>)}<button onClick={onReview}><Layers3 size={17} /><span><strong>Review cards</strong><small>{due > 0 ? `${due} due` : reviewSummary.fresh > 0 ? `${reviewSummary.fresh} new cards` : "Up to date"}</small></span><ChevronRight size={15} /></button><button onClick={() => onNavigate("Experience")}><MessageSquare size={17} /><span><strong>Project stories</strong><small>{stories.length} from your resume</small></span><ChevronRight size={15} /></button></div></section><section className="workbench-section practice-history"><div className="section-heading"><h2>Recent practice</h2><span className="small muted">{state.sessions.length} saved</span></div>{state.sessions.length ? <div className="workbench-list">{state.sessions.slice(0, 2).map(session => { const exercise = exercises.find(item => item.id === session.exerciseId); return <button key={session.id} onClick={() => onPractice(exercise?.kind)}><CheckCircle2 size={17} /><span><strong>{exercise?.title ?? "Practice session"}</strong><small>{session.mode} · {Math.floor(session.elapsed / 60)} min</small></span><span className="session-date">{new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></button>; })}</div> : <p className="workbench-empty">No saved sessions yet.</p>}</section></div>
    <div><section className="workbench-section"><div className="section-heading"><h2>Applications</h2><button className="text-button" onClick={() => onNavigate("Applications")}>View all {state.applications.length}<ArrowRight size={14} /></button></div><div className="workbench-list application-shortlist">{activeRoles.map(application => <button key={application.id} onClick={() => onApplication(application.id)}><span className="company-avatar">{application.company[0]}</span><span><strong>{application.company}</strong><small>{application.title}</small></span><ChevronRight size={15} /></button>)}</div></section><section className="workbench-section"><div className="section-heading"><h2>Role sources</h2><span className="small muted">{state.documents?.length ?? 0} saved</span></div><div className="workbench-list">{sourceRoles.map(application => { const count = (state.documents ?? []).filter(document => document.applicationId === application.id).length; return <button key={application.id} onClick={() => onApplication(application.id)}><FileText size={17} /><span><strong>{application.company}</strong><small>{count} {count === 1 ? "source" : "sources"} · {state.activities.filter(activity => activity.applicationId === application.id).length} updates</small></span><ChevronRight size={15} /></button>; })}</div></section></div></div>
  </div>;
}


function Applications({ state, selected, select, mutate, saving, loading }: { state: WorkspaceState; selected?: Application; select: (s: string | null) => void; mutate: (a: string, d: unknown, meta?: CommandMeta) => Promise<boolean>; saving: boolean; loading: boolean }) {
  const [newApplicationId,setNewApplicationId]=useState(newId);
  const createCommand=useCommandDraft(`new-application:${newApplicationId}`,0);

  const [applicationTab, setApplicationTab] = useState<"Roles" | "Role library">("Roles");
  const [filter, setFilter] = useState("All stages");
  const [adding, setAdding] = useState(false);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  async function addApplication(e: React.FormEvent) { e.preventDefault(); if (!company.trim() || !title.trim()) return; const id = newApplicationId; const data={ id, roleId: id, company: company.trim(), title: title.trim(), stage: "Interested", nextAction: "Review the role and decide next steps", notes: "" }; if (await mutate("application", data, createCommand.meta("application",data))) { createCommand.commit(1);setNewApplicationId(newId());setAdding(false); setCompany(""); setTitle(""); select(id); } }
  const [search, setSearch] = useState("");
  const filtered = state.applications.filter(a => (filter === "All stages" || a.stage === filter) && `${a.title} ${a.company}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading title="Applications" action={<Button onClick={() => setAdding(!adding)}><Plus size={15} />Add a role</Button>} />{adding && <form className="add-application-form" onSubmit={addApplication}><label className="field-label">Company<input required autoFocus value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" /></label><label className="field-label">Role<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Role title" /></label><Button disabled={saving} type="submit">Save role<Check size={15} /></Button><Button variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button></form>}<div className="tab-bar" role="tablist" aria-label="Application views">{(["Roles", "Role library"] as const).map(tab => <button key={tab} role="tab" aria-selected={applicationTab === tab} className={applicationTab === tab ? "selected" : ""} onClick={() => setApplicationTab(tab)}>{tab === "Roles" ? <BriefcaseBusiness size={16} /> : <BookOpen size={16} />}{tab}<span>{tab === "Roles" ? state.applications.length : state.documents?.length ?? 0}</span></button>)}</div>{applicationTab === "Role library" ? <RoleLibrary state={state} mutate={mutate} saving={saving} /> : <><div className="list-toolbar"><label className="search-input"><Search size={16} /><input aria-label="Search applications" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a company or role..." /></label><select aria-label="Filter by application stage" value={filter} onChange={e => setFilter(e.target.value)}><option>All stages</option>{stages.map(s => <option key={s}>{s}</option>)}</select></div><div className="application-table"><div className="table-heading"><span>ROLE / COMPANY</span><span>STAGE</span><span>NEXT ACTION</span><span /></div>{filtered.map(a => <button key={a.id} className="application-row" onClick={() => select(a.id)}><span className="application-role"><span className="company-avatar">{a.company.slice(0, 1)}</span><span><strong>{a.title}</strong><span>{a.company}</span></span></span><span><Badge tone={a.stage === "Interviewing" ? "blue" : a.stage === "Offer" ? "green" : "neutral"}>{a.stage}</Badge></span><span className="next-action">{a.nextAction || "Choose your next action"}</span><ChevronRight size={16} /></button>)}{!filtered.length && <Empty title={loading ? "Loading your workspace" : "No roles match"}>{loading ? "Opening your workspace." : "Try another search or stage."}</Empty>}</div></>}{selected && <ApplicationDetail key={selected.id} application={selected} state={state} close={() => select(null)} mutate={mutate} saving={saving} />}</>;
}

function ApplicationDetail({ application, state, close, mutate, saving }: { application: Application; state: WorkspaceState; close: () => void; mutate: (a: string, d: unknown, meta?: CommandMeta) => Promise<boolean>; saving: boolean }) {
  const {draft,setDraft,clearDraft}=useLocalDraft(`application:${application.id}`,{stage:application.stage,next:application.nextAction,notes:application.notes});
  const {stage,next,notes}=draft;
  const setStage=(stage:string)=>{setDraft(d=>({...d,stage}));setApplicationSaved(false);};
  const setNext=(next:string)=>{setDraft(d=>({...d,next}));setApplicationSaved(false);};
  const setNotes=(notes:string)=>{setDraft(d=>({...d,notes}));setApplicationSaved(false);};
  const command=useCommandDraft(`application:${application.id}`,application.revision??0);
  const [commandError,setCommandError]=useState("");
  const [applicationSaved,setApplicationSaved]=useState(false);
  async function saveApplication(){setCommandError("");setApplicationSaved(false);try{const data={id:application.id,roleId:application.roleId,company:application.company,title:application.title,stage,nextAction:next,notes};const meta=command.meta("application",data);if(await mutate("application",data,meta)){command.commit(meta.expectedRevision+1);clearDraft();setApplicationSaved(true);}else{setCommandError("Save not confirmed. Your draft is still here.");}}catch(e){setCommandError(e instanceof Error?e.message:"Could not save your draft.");}}
  const [message, setMessage] = useState("");
  const role = roles.find(r => r.id === application.roleId);
  const dialogRef = useRef<HTMLElement>(null);
  const timeline = state.activities.filter(a => a.applicationId === application.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); if (e.key === "Tab") { const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea'); if (!nodes?.length) return; const first = nodes[0]; const last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [close]);
  async function addNote() { if (!message.trim()) return; if (await mutate("activity", { id: newId(), applicationId: application.id, kind: "Note", body: message.trim(), createdAt: new Date().toISOString() })) setMessage(""); }
  return <div className="drawer-overlay" onClick={close}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="role-title" className="application-drawer" onClick={e => e.stopPropagation()}><div className="drawer-top"><span className="small muted">APPLICATION DETAILS</span><button autoFocus className="icon-button" aria-label="Close application details" onClick={close}><X size={20} /></button></div><Badge>{application.company}</Badge><h2 id="role-title">{application.title}</h2>{role && <p className="drawer-summary">{role.summary}</p>}<div className="form-grid"><label className="field-label">Stage<select value={stage} onChange={e => setStage(e.target.value)}>{stages.map(s => <option key={s}>{s}</option>)}</select></label><label className="field-label">Next action<input value={next} onChange={e => setNext(e.target.value)} placeholder="What happens next?" /></label></div><label className="field-label">Application notes<textarea className="notes-textarea short-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Links, context, or questions to remember..." /></label>{commandError&&<p role="alert">{commandError}</p>}{(command.reviewRequired||command.baseRevision!==(application.revision??0))&&<div className="notice"><p>Review the saved version before applying your draft.</p><p>Saved stage: {application.stage}</p><p>Saved next action: {application.nextAction||"None"}</p><p style={{whiteSpace:"pre-wrap"}}>Saved notes: {application.notes||"None"}</p><Button variant="secondary" onClick={()=>command.acceptRevision(application.revision??0)}>Use current revision for my draft</Button></div>}<Button disabled={saving} onClick={saveApplication}>Save application<Check size={15} /></Button>{applicationSaved&&<p role="status">Saved locally</p>}<details className="target-history-section"><summary>Saved application history</summary><CareerHistory revisions={state.careerRevisions??[]} entityType="candidacy" entityId={`application:${application.id}`}/></details>{role && <div className="role-context"><h3>What this role emphasizes</h3><ul>{role.priorities.map(p => <li key={p}>{p}</li>)}</ul><h3>Experience to connect</h3><ul>{role.fit.map(f => <li key={f}>{f}</li>)}</ul><h3>Areas to prepare</h3><ul>{role.gaps.map(g => <li key={g}>{g}</li>)}</ul><a className="source-link" href={role.source.url} target="_blank" rel="noreferrer">{role.source.title}<ExternalLink size={13} /></a></div>}<ApplicationDocuments application={application} state={state} mutate={mutate} saving={saving} /><div className="conversation-section"><h3><MessageSquare size={17} />Conversations & updates</h3><textarea aria-label="New conversation note" className="notes-textarea short-textarea" placeholder="Paste a message or add a dated conversation note..." value={message} onChange={e => setMessage(e.target.value)} /><Button variant="secondary" disabled={saving || !message.trim()} onClick={addNote}><Plus size={15} />Add update</Button><div className="timeline">{timeline.map(a => <div className="timeline-entry" key={a.id}><span className="timeline-dot" /><div><span className="small muted">{new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {a.kind}</span><p>{a.body}</p></div></div>)}{!timeline.length && <p className="small muted">Your conversation history will appear here.</p>}</div></div></section></div>;
}

function Background({ state, mutate, saving }: { state: WorkspaceState; mutate: (a: string, d: unknown, meta?: CommandMeta) => Promise<boolean>; saving: boolean }) {
  const [personalStories, setPersonalStories] = useState<PersonalStory[]>(stories);
  const [selected, setSelected] = useState(stories[0]?.id ?? "");
  useEffect(() => {
    let active = true;
    void workspaceFetch("/api/personal-prep")
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!active || payload === null) return;
        const parsed = personalPrepResponseSchema.safeParse(payload);
        if (parsed.success) setPersonalStories(parsed.data.stories);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const story = personalStories.find(s => s.id === selected) ?? personalStories[0];
  return <><PageHeading title="Experience" action={<div className="background-links"><a className="button button-secondary" href="/api/resume" target="_blank" rel="noreferrer"><FileText size={15} />Original resume</a></div>} /><div className="background-layout"><aside className="story-index">{personalStories.map(s => <button key={s.id} className={selected === s.id ? "selected" : ""} onClick={() => setSelected(s.id)}><span>{s.company}</span><strong>{s.title}</strong><ChevronRight size={15} /></button>)}</aside>{story && <article className="story-article"><Badge tone="blue">{story.company}</Badge><h2>{story.title}</h2><p className="story-summary">{story.summary}</p><h3>Talking points</h3><ul className="story-points">{story.talkingPoints.map((p, i) => <li key={p}><span>{i + 1}</span>{p}</li>)}</ul><div className="followup-block"><h3>Follow-up questions</h3>{story.followUps.map(f => <p key={f}><ChevronRight size={14} />{f}</p>)}</div><RevisionNote key={story.id} noteKey={`story:${story.id}`} value={state.notes[`story:${story.id}`]??""} revision={state.noteRevisions?.[`story:${story.id}`]??0} revisions={state.careerRevisions??[]} saving={saving} mutate={mutate}/><p className="story-source"><FileText size={13} />Source: {story.source}</p></article>}</div></>;
}

export default function Page() { return <WorkspaceSession><InterviewDesk /></WorkspaceSession>; }
