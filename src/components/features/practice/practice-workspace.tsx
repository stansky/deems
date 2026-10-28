"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, Circle, Clock3, Code2, Layers3, Lightbulb, Loader2, Pause, Play, RotateCcw, Target } from "lucide-react";
import { exercises } from "@/data/prep";
import type { WorkspaceState } from "@/lib/types";
import type { PracticeAttempt, PracticeCommand, PracticeOrigin, PracticeSave } from "@/contracts/practice";
import { targetStateSchema } from "@/contracts/targets";
import type { TargetRole } from "@/lib/target-types";
import { snapshotExercise } from "@/domains/practice/content";
import { Badge, Button, Empty } from "@/components/ui";
import CodeEditor from "@/components/code-editor";
import DesignBoard from "@/components/design-board";
import { PracticeOriginBar, PracticeReflectionFields, SavedAttemptEvidence } from "./evidence";
import { emptyPracticeDraft, usePracticeDraft } from "./use-practice-draft";

function PageHeading({title}:{title:string}) {return <div className="page-heading"><h1>{title}</h1></div>;}
function sameOrigin(a: PracticeOrigin | null, b: PracticeOrigin | null): boolean {
  return a?.roleId === b?.roleId && a?.planStepId === b?.planStepId;
}

type Props = {
  exerciseId: string;
  select: (s: string) => void;
  state: WorkspaceState;
  saving: boolean;
  onCommand: (command: PracticeCommand) => Promise<PracticeAttempt | null>;
  origin: PracticeOrigin | null;
  onReturn: (origin: PracticeOrigin) => void;
  selectedAttemptId?: string;
};

export default function Practice({ exerciseId, select, state, saving, onCommand, origin, onReturn, selectedAttemptId }: Props) {
  const exercise = exercises.find(e => e.id === exerciseId) ?? exercises[0];
  const [running, setRunning] = useState(false);
  const [solution, setSolution] = useState(false);
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [targets, setTargets] = useState<TargetRole[]>([]);
  const [targetError, setTargetError] = useState("");
  const [targetLoading, setTargetLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [attachBusy, setAttachBusy] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | undefined>(selectedAttemptId);
  const startRef = useRef<number | null>(null);
  const selectedAttemptRef = useRef<HTMLDetailsElement | null>(null);
  const starter = exercise?.kind === "System design" ? "" : exercise?.languages?.[language]?.starter ?? exercise?.starter ?? "";
  const effectiveLanguage: PracticeSave["language"] = exercise?.kind === "System design" ? "design" : language;
  const referenceSolution = exercise?.kind === "System design" ? undefined : exercise?.languages?.[language]?.solution ?? exercise?.solution;
  const draftKey = `interview-draft-${exerciseId}-${exercise?.kind === "System design" ? "design" : language}`;
  const { draft, setDraft, ready } = usePracticeDraft(draftKey, starter, origin);
  const roleId = draft.origin?.roleId ?? origin?.roleId;
  const role = targets.find(item => item.id === roleId);
  const attempts = (state.practiceAttempts ?? []).filter(item => item.exerciseId === exercise?.id);
  const hasSaved = Boolean(draft.savedAttemptId);
  const frozen = hasSaved || Boolean(draft.pendingSave);
  const remaining = Math.max(0, (exercise?.duration ?? 60) * 60 - draft.elapsed);
  const content = useMemo(() => exercise ? snapshotExercise(exercise, effectiveLanguage) : undefined, [exercise, effectiveLanguage]);

  const update = useCallback((patch: Partial<typeof draft>) => setDraft(current => ({ ...current, ...patch })), [setDraft]);

  const loadTargets = useCallback(async () => {
    setTargetLoading(true); setTargetError("");
    try {
      const response = await fetch("/api/targets", { cache: "no-store" });
      if (!response.ok) throw new Error("Target roles could not be loaded.");
      const parsed = targetStateSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Target roles could not be read.");
      setTargets(parsed.data.roles);
    } catch (error) { setTargetError(error instanceof Error ? error.message : "Target roles could not be loaded."); }
    finally { setTargetLoading(false); }
  }, []);

  useEffect(() => { void loadTargets(); }, [loadTargets]);
  useEffect(() => {
    if (selectedAttemptId) setActiveAttemptId(selectedAttemptId);
    else if (ready && draft.savedAttemptId) setActiveAttemptId(draft.savedAttemptId);
  }, [selectedAttemptId, ready, draft.savedAttemptId]);
  useEffect(() => {
    if (!running || frozen) return;
    startRef.current = Date.now() - draft.elapsed * 1000;
    const timer = window.setInterval(() => {
      const next = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
      update({ elapsed: next });
      if (next >= (exercise?.duration ?? 60) * 60) setRunning(false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [running, frozen, exercise?.duration, update]);

  useEffect(() => {
    if (!activeAttemptId || !selectedAttemptRef.current) return;
    selectedAttemptRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeAttemptId, attempts.length]);

  if (!exercise) return <Empty title="No exercises yet">Practice exercises will appear here.</Empty>;

  async function saveAttempt() {
    setRunning(false); setSaveError("");
    let command = draft.pendingSave;
    if (!command) {
      if (!content) return;
      const id = crypto.randomUUID();
      const data: PracticeSave = {
        id, exerciseId: exercise.id, mode: draft.mode, notes: draft.notes, code: draft.code,
        elapsed: Math.min(draft.elapsed, 86400), completedAt: new Date().toISOString(), selfReview: draft.selfReview,
        language: effectiveLanguage, origin: draft.origin,
        content, assistance: { hintsRevealed: draft.hints, referenceSolutionViewed: draft.solutionSeen, otherHelp: draft.otherHelp, note: draft.assistanceNote },
        assessment: { source: "self_report", rubricVersion: 1, checkedItems: draft.checks, observedResult: draft.observedResult, limitations: draft.limitations, execution: "not_run" },
        nextAction: draft.nextAction,
      };
      command = { action: "save", data, meta: { expectedRevision: 0, producer: "deems-practice", key: crypto.randomUUID() } };
      update({ pendingSave: command });
      try { localStorage.setItem(draftKey, JSON.stringify({ ...draft, pendingSave: command })); } catch { /* Preserve the command in memory for this page session. */ }
    }
    try {
      const result = await onCommand(command);
      if (!result) { setSaveError("The save was not confirmed. Retry the same saved command or discard it while keeping this draft."); return; }
      update({ pendingSave: null, savedAttemptId: result.sessionId });
      setActiveAttemptId(result.sessionId);
    } catch {
      setSaveError("The save was not confirmed. Retry the same saved command or discard it while keeping this draft.");
    }
  }

  async function attachAttempt(attempt: PracticeAttempt, requirementId: string | null): Promise<boolean> {
    setAttachBusy(attempt.sessionId);
    try {
      const previous = draft.pendingAttachments[attempt.sessionId];
      const reusable = previous && previous.meta.expectedRevision === attempt.revision && previous.data.requirementId === requirementId;
      const command: Extract<PracticeCommand, {action:"attach"}> = reusable ? previous : {
        action: "attach", data: { sessionId: attempt.sessionId, requirementId },
        meta: { expectedRevision: attempt.revision, producer: "deems-practice", key: crypto.randomUUID() },
      };
      update({ pendingAttachments: { ...draft.pendingAttachments, [attempt.sessionId]: command } });
      try { localStorage.setItem(draftKey, JSON.stringify({ ...draft, pendingAttachments: { ...draft.pendingAttachments, [attempt.sessionId]: command } })); } catch { /* Keep this retry available in memory. */ }
      const result = await onCommand(command);
      if (!result) return false;
      const pendingAttachments = { ...draft.pendingAttachments }; delete pendingAttachments[attempt.sessionId];
      update({ pendingAttachments });
      return true;
    } catch { return false; }
    finally { setAttachBusy(null); }
  }

  function startNewAttempt() {
    if (draft.pendingSave) return;
    const next = emptyPracticeDraft(starter, draft.origin);
    setDraft(next); setRunning(false); setSolution(false); setSaveError("");
    try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* Keep the fresh attempt in memory. */ }
  }

  const launchDiffers = Boolean(origin && !sameOrigin(draft.origin, origin) && !hasSaved);
  const structuredIds = new Set(attempts.map(item => item.sessionId));
  const legacySessions = state.sessions.filter(session => session.exerciseId === exercise.id && !structuredIds.has(session.id)).slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return <><PageHeading title="Practice" />
    {targetError && <div className="field-help" role="alert">{targetError} <Button variant="secondary" onClick={() => void loadTargets()}>Retry</Button></div>}
    {targetLoading && (draft.origin || origin) && <p className="field-help">Loading role context…</p>}
    <PracticeOriginBar origin={draft.origin} role={role} onReturn={onReturn} />
    {draft.origin && !frozen && <Button type="button" variant="ghost" onClick={() => update({ origin: null })}>Clear plan link</Button>}
    {launchDiffers && <section className="exercise-section" aria-label="Practice plan choice"><p className="field-help">This draft has a different or unknown plan origin. Its saved context stays unchanged until you choose this plan step.</p><Button type="button" variant="secondary" disabled={frozen} onClick={() => update({ origin })}>Use this plan step</Button></section>}
    <div className="practice-layout"><aside className="exercise-index"><p className="nav-section-label">CHOOSE A SESSION</p>{exercises.map(e => <button key={e.id} className={e.id === exercise.id ? "selected" : ""} disabled={Boolean(draft.pendingSave)} onClick={() => { if (running) setRunning(false); select(e.id); }}><span className="exercise-kind">{e.kind === "System design" ? <Layers3 size={16} /> : <Code2 size={16} />}{e.kind}</span><strong>{e.title}</strong><span className="muted small">{e.duration} min<ChevronRight size={14} /></span></button>)}</aside>
      <div className="practice-content"><div className="session-toolbar"><div className="mode-toggle" aria-label="Practice mode">{(["Coach", "Mock"] as const).map(mode => <button key={mode} className={mode === draft.mode ? "selected" : ""} disabled={running || frozen} onClick={() => update({ mode })}>{mode === "Coach" ? <Lightbulb size={14} /> : <Target size={14} />}{mode}</button>)}</div>{exercise.kind !== "System design" && <select className="language-select" aria-label="Coding language" value={language} disabled={running || frozen} onChange={e => { setLanguage(e.target.value as "python" | "javascript"); }}><option value="python">Python</option><option value="javascript">JavaScript</option></select>}<div className={`timer ${remaining === 0 ? "timer-ended" : ""}`}><Clock3 size={17} /><span>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</span><button className="icon-button" aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning(!running)} disabled={remaining === 0 || frozen}>{running ? <Pause size={16} /> : <Play size={16} />}</button><button className="icon-button" aria-label="Reset timer" onClick={() => { setRunning(false); update({ elapsed: 0 }); }} disabled={frozen}><RotateCcw size={15} /></button></div></div>
        <article className="exercise-card"><div className="exercise-title"><Badge tone="blue">{exercise.kind}</Badge><span className="muted small">Suggested practice prompt</span><h2>{exercise.title}</h2><p>{exercise.description}</p></div><div className="exercise-section"><h3>Requirements</h3><ul className="requirements">{exercise.requirements.map(r => <li key={r}><Circle size={12} />{r}</li>)}</ul></div><div className="phase-strip">{exercise.phases.map((p, i) => <div key={p.label}><span>{String(i + 1).padStart(2, "0")}</span><strong>{p.label}</strong><small>{p.minutes} min</small></div>)}</div>
          <div className="exercise-section"><label className="field-label" htmlFor="practice-notes">{exercise.kind === "System design" ? "Your design and tradeoffs" : "Clarifications and approach"}</label><textarea id="practice-notes" className="notes-textarea" disabled={frozen} placeholder={exercise.kind === "System design" ? "Users and requirements\nCore data flow\nData model\nTradeoffs and failure cases" : "What would you clarify? What is the simplest useful solution?"} value={draft.notes} onChange={e => update({ notes: e.target.value })} /><p className="field-help">Draft saved in this browser. Finish the session to save to your database.</p></div>
          {exercise.kind !== "System design" && <div className="exercise-section"><div className="code-heading"><label className="field-label" htmlFor="practice-code">Your implementation</label><span>Scratchpad · code is not executed</span></div>{ready && <div aria-disabled={frozen}><CodeEditor value={draft.code} onChange={value => update({ code: value })} language={language} readOnly={frozen} /></div>}</div>}
          {exercise.kind === "System design" && <div className="exercise-section"><h3>Sketch the system</h3><p className="field-help">Use the board for components, data flow, and failure boundaries. The scene is saved with your session.</p>{ready && (frozen ? <pre aria-label="Saved design scene">{draft.code || "No design elements saved."}</pre> : <DesignBoard value={draft.code} onChange={value => update({ code: value })} />)}</div>}
          {draft.mode === "Coach" && <div className="exercise-section hint-section"><div className="inline-section-heading"><h3><Lightbulb size={17} />Hints</h3><Button variant="secondary" onClick={() => { update({ coachUsed: true, hints: Math.min(draft.hints + 1, exercise.hints.length) }); }} disabled={draft.hints >= exercise.hints.length || frozen}>Reveal hint{draft.hints < exercise.hints.length && <span>{draft.hints + 1}/{exercise.hints.length}</span>}</Button></div>{exercise.hints.slice(0, draft.hints).map((h, i) => <div className="hint" key={h}><span>{i + 1}</span><p>{h}</p></div>)}</div>}
          <div className="exercise-section"><h3>Self assessment</h3><div className="rubric-list">{exercise.rubric.map(r => <label key={r}><input type="checkbox" disabled={frozen} checked={draft.checks.includes(r)} onChange={e => update({ checks: e.target.checked ? [...draft.checks, r] : draft.checks.filter(x => x !== r) })} /><span>{r}</span></label>)}</div><textarea aria-label="Self assessment" disabled={frozen} className="notes-textarea short-textarea" value={draft.selfReview} onChange={e => update({ selfReview: e.target.value })} placeholder="What went well? Where did you get stuck? What is one thing to try next time?" /></div>
          {!hasSaved && <fieldset disabled={Boolean(draft.pendingSave)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><PracticeReflectionFields assistance={{ hintsRevealed: draft.hints, referenceSolutionViewed: draft.solutionSeen, otherHelp: draft.otherHelp, note: draft.assistanceNote }} assessment={{ source: "self_report", rubricVersion: 1, checkedItems: draft.checks, observedResult: draft.observedResult, limitations: draft.limitations, execution: "not_run" }} nextAction={draft.nextAction} onAssistance={value => update({ otherHelp: value.otherHelp, assistanceNote: value.note })} onAssessment={value => update({ checks: value.checkedItems, observedResult: value.observedResult, limitations: value.limitations })} onNextAction={value => update({ nextAction: value })} /></fieldset>}
          {referenceSolution && (draft.mode === "Coach" || hasSaved) && <div className="exercise-section solution-section"><button className="disclosure-button" disabled={frozen} onClick={() => { setSolution(!solution); update({ solutionSeen: true, coachUsed: true }); }}><BookOpen size={17} /><span>{solution ? "Hide" : "Reveal"} a reference solution</span><ChevronRight size={16} className={solution ? "rotate" : ""} /></button>{solution && <div className="reference-solution"><p className="field-help">One possible approach, not the only correct answer.</p><pre>{referenceSolution}</pre></div>}</div>}
          {saveError && <p className="field-help" role="alert">{saveError}</p>}
          <div className="exercise-footer"><span className="muted small">{attempts.length + legacySessions.length} previous attempts saved</span>{hasSaved ? <><span className="muted small">This saved attempt is immutable.</span><Button type="button" variant="secondary" onClick={startNewAttempt}>New attempt</Button></> : <><Button type="button" onClick={() => void saveAttempt()} disabled={saving || !ready}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}{draft.pendingSave ? "Retry saved command" : "Finish & save session"}</Button>{draft.pendingSave && <Button type="button" variant="ghost" onClick={() => { update({ pendingSave: null }); setSaveError(""); }}>Discard pending command</Button>}</>}</div>
        </article>
        <section className="saved-sessions"><h3>Previous attempts</h3>
          {attempts.map(attempt => {
            const attemptRole = targets.find(item => item.id === attempt.origin?.roleId);
            const session = state.sessions.find(item => item.id === attempt.sessionId);
            return <details key={attempt.sessionId} ref={activeAttemptId === attempt.sessionId ? selectedAttemptRef : undefined} open={activeAttemptId === attempt.sessionId} className="saved-practice-attempt"><summary><span>{attempt.content.title}</span><span>{new Date(attempt.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {attempt.content.kind}</span></summary><SavedAttemptEvidence attempt={attempt} role={attemptRole} onReturn={onReturn} onAttach={attachAttempt} busy={saving || attachBusy !== null} />{session && <section className="saved-attempt-artifact"><h4>Saved session work</h4><p>{session.notes || "No notes saved."}</p><h4>Reflection</h4><p>{session.selfReview || "No reflection saved."}</p>{session.code && attempt.language !== "design" && <CodeEditor value={session.code} onChange={() => undefined} language={attempt.language} readOnly />}{session.code && attempt.language === "design" && <pre aria-label="Saved design scene">{session.code}</pre>}</section>}</details>;
          })}
          {legacySessions.map(session => <details key={session.id}><summary><span>{new Date(session.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><span>{session.mode} · {Math.floor(session.elapsed / 60)} min</span></summary><p className="field-help">Unknown provenance. This legacy session has no structured practice evidence.</p><h4>Approach and notes</h4><p>{session.notes || "No notes saved."}</p><h4>Self assessment</h4><p>{session.selfReview || "No reflection saved."}</p>{session.code && exercise.kind !== "System design" && <pre>{session.code}</pre>}{session.code && exercise.kind === "System design" && <Button variant="secondary" onClick={() => { setDraft(current => ({ ...current, code: session.code, notes: session.notes, savedAttemptId: null })); }}>Load this diagram into the board</Button>}</details>)}
          {!attempts.length && !legacySessions.length && <p className="small muted">Finish a session to keep your work and reflection here.</p>}
        </section>
      </div>
    </div>
  </>;
}
