"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Link2, Unlink } from "lucide-react";
import type { PracticeAttempt, PracticeOrigin, PracticeSave } from "@/contracts/practice";
import type { TargetRole } from "@/lib/target-types";
import { Button } from "@/components/ui";
import "./evidence.css";

type PracticeOriginBarProps = {
  origin: PracticeOrigin | null;
  role?: TargetRole;
  onReturn: (origin: PracticeOrigin) => void;
};

export function PracticeOriginBar({ origin, role, onReturn }: PracticeOriginBarProps) {
  if (!origin) return null;

  const step = role?.id === origin.roleId ? role.steps.find(item => item.id === origin.planStepId) : undefined;
  const resolved = Boolean(role && step);

  return <section className="practice-origin" aria-label="Practice origin">
    <div className="practice-origin-copy">
      <span className="practice-evidence-eyebrow">PRACTICING FOR</span>
      {resolved ? <>
        <strong>{role!.title}</strong>
        <span>{step!.title}</span>
      </> : <>
        <strong>Plan context unavailable</strong>
        <span>The saved origin is {origin.roleId} / {origin.planStepId}. Its role or step could not be loaded.</span>
      </>}
    </div>
    {resolved && <Button type="button" variant="secondary" className="practice-evidence-button" onClick={() => onReturn(origin)}>
      <ArrowLeft size={14} aria-hidden="true" /> Back to plan step
    </Button>}
  </section>;
}

type PracticeReflectionFieldsProps = {
  assistance: PracticeSave["assistance"];
  assessment: PracticeSave["assessment"];
  nextAction: string;
  onAssistance: (value: PracticeSave["assistance"]) => void;
  onAssessment: (value: PracticeSave["assessment"]) => void;
  onNextAction: (value: string) => void;
};

const helpOptions: Array<{ value: PracticeSave["assistance"]["otherHelp"]; label: string }> = [
  { value: "unknown", label: "Not recorded" },
  { value: "none", label: "No other help" },
  { value: "ai", label: "AI assistance" },
  { value: "person", label: "Help from a person" },
  { value: "reference", label: "External reference" },
  { value: "mixed", label: "More than one kind of help" },
];

export function PracticeReflectionFields({ assistance, assessment, nextAction, onAssistance, onAssessment, onNextAction }: PracticeReflectionFieldsProps) {
  return <div className="practice-reflection-fields">
    <section className="practice-reflection-section" aria-labelledby="practice-assistance-heading">
      <div className="practice-evidence-section-heading">
        <h3 id="practice-assistance-heading">Assistance used</h3>
        <span>Recorded separately from Coach or Mock mode</span>
      </div>
      <p className="practice-evidence-readonly">Static help: {assistance.hintsRevealed} hint{assistance.hintsRevealed === 1 ? "" : "s"} revealed · Reference solution {assistance.referenceSolutionViewed ? "viewed" : "not viewed"}</p>
      <label className="practice-evidence-field">
        Other help
        <select value={assistance.otherHelp} onChange={event => onAssistance({ ...assistance, otherHelp: event.target.value as PracticeSave["assistance"]["otherHelp"] })}>
          {helpOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="practice-evidence-field">
        Note about assistance <span className="practice-evidence-optional">optional</span>
        <textarea rows={2} maxLength={2000} value={assistance.note} onChange={event => onAssistance({ ...assistance, note: event.target.value })} placeholder="Add context about the help you used." />
      </label>
    </section>

    <section className="practice-reflection-section" aria-labelledby="practice-assessment-heading">
      <div className="practice-evidence-section-heading">
        <h3 id="practice-assessment-heading">Observed result</h3>
        <span>Self-reported · code is not run</span>
      </div>

      <label className="practice-evidence-field">
        Observed result
        <textarea rows={3} maxLength={8000} value={assessment.observedResult} onChange={event => onAssessment({ ...assessment, observedResult: event.target.value })} placeholder="What did you observe in your own work?" />
      </label>
      <label className="practice-evidence-field">
        Limitations
        <textarea rows={2} maxLength={4000} value={assessment.limitations} onChange={event => onAssessment({ ...assessment, limitations: event.target.value })} placeholder="What remains uncertain or was not checked?" />
      </label>
      <p className="practice-evidence-limit">Execution status: <strong>Not run</strong>. This records your report and does not verify correctness.</p>
    </section>

    <label className="practice-evidence-field">
      Next action <span className="practice-evidence-optional">optional</span>
      <textarea rows={2} maxLength={4000} value={nextAction} onChange={event => onNextAction(event.target.value)} placeholder="One useful thing to try next." />
    </label>
  </div>;
}

type SavedAttemptEvidenceProps = {
  attempt: PracticeAttempt;
  role?: TargetRole;
  onReturn: (origin: PracticeOrigin) => void;
  onAttach: (attempt: PracticeAttempt, requirementId: string | null) => Promise<boolean>;
  busy: boolean;
};

export function SavedAttemptEvidence({ attempt, role, onReturn, onAttach, busy }: SavedAttemptEvidenceProps) {
  const origin = attempt.origin;
  const matchingRole = origin && role?.id === origin.roleId ? role : undefined;
  const requirements = matchingRole?.requirements ?? [];
  const attachedId = attempt.attachment?.requirementId ?? "";
  const [selectedId, setSelectedId] = useState(attachedId);
  const [attachError, setAttachError] = useState("");
  const previousAttachment = useRef({sessionId:attempt.sessionId,id:attachedId});

  useEffect(() => {
    const previous = previousAttachment.current;
    setSelectedId(selected => previous.sessionId !== attempt.sessionId || selected === previous.id ? attachedId : selected);
    previousAttachment.current = {sessionId:attempt.sessionId,id:attachedId};
    setAttachError("");
  }, [attempt.sessionId, attachedId]);

  const changed = selectedId !== attachedId;
  const canApply = Boolean(matchingRole && (selectedId !== "" || attachedId !== "") && changed && !busy);
  async function applyAttachment() {
    if (!canApply || !matchingRole) return;
    setAttachError("");
    try {
      const success = await onAttach(attempt, selectedId || null);
      if (!success) setAttachError("The change was not saved. Your selection is still here. Review the latest attempt state before retrying.");
    } catch {
      setAttachError("The change was not saved. Your selection is still here. Try again when ready.");
    }
  }

  return <section className="saved-attempt-evidence" aria-labelledby={`saved-attempt-${attempt.sessionId}`}>
    <header className="saved-attempt-header">
      <div>
        <span className="practice-evidence-eyebrow">SAVED PRACTICE ATTEMPT</span>
        <h3 id={`saved-attempt-${attempt.sessionId}`}>{attempt.content.title}</h3>
        <p>{attempt.content.kind} · Saved {formatSavedAt(attempt.savedAt)} · {attempt.language === "design" ? "Design board" : attempt.language}</p>
      </div>
      {origin && <Button type="button" variant="ghost" className="practice-evidence-button" onClick={() => onReturn(origin)}><ArrowLeft size={14} aria-hidden="true" /> Back to plan step</Button>}
    </header>

    <div className="saved-attempt-facts">
      <div><span>Assistance</span><strong>{assistanceLabel(attempt.assistance.otherHelp)}</strong><small>{attempt.assistance.hintsRevealed} hints · Reference solution {attempt.assistance.referenceSolutionViewed ? "viewed" : "not viewed"}</small>{attempt.assistance.note && <small>{attempt.assistance.note}</small>}</div>
      <div><span>Assessment</span><strong>Self-report</strong><small>{attempt.assessment.checkedItems.length ? `${attempt.assessment.checkedItems.length} rubric item${attempt.assessment.checkedItems.length === 1 ? "" : "s"} selected` : "No rubric items selected"}</small></div>
      <div><span>Execution</span><strong>Not run</strong><small>{attempt.assessment.limitations || "Correctness was not verified."}</small></div>
      {attempt.nextAction && <div><span>Next action</span><strong>{attempt.nextAction}</strong></div>}
    </div>

    {attempt.assessment.observedResult && <div className="practice-evidence-observation"><h4>Observed result</h4><p>{attempt.assessment.observedResult}</p></div>}
    <details className="saved-attempt-snapshot">
      <summary><ChevronRight size={14} aria-hidden="true" /> Prompt and rubric snapshot</summary>
      <div className="saved-attempt-snapshot-body">
        <p>{attempt.content.description || "No additional prompt description."}</p>
        {attempt.content.requirements.length > 0 && <div><h4>Requirements</h4><ul>{attempt.content.requirements.map(item => <li key={item}>{item}</li>)}</ul></div>}
        <div><h4>Rubric</h4>{attempt.content.rubric.length ? <ul>{attempt.content.rubric.map(item => <li key={item}>{attempt.assessment.checkedItems.includes(item) ? "Self-reported: " : "Not selected: "}{item}</li>)}</ul> : <p>No rubric items in this snapshot.</p>}</div>
        <small>Snapshot version {attempt.contentVersion.slice(0, 12)} · Attempt revision {attempt.revision}</small>
      </div>
    </details>

    <div className="saved-attempt-attach">
      <div className="practice-evidence-section-heading">
        <h4>Requirement evidence</h4>
        {attempt.attachment ? <span>Currently attached</span> : <span>Optional, explicit link</span>}
      </div>
      {!origin && <p className="practice-evidence-readonly">This attempt has no role origin, so there is no role requirement to select here.</p>}
      {origin && !matchingRole && <p className="practice-evidence-readonly">The originating role is unavailable. Its requirement list cannot be confirmed, so this attempt cannot be attached here.</p>}
      {matchingRole && <>
        <label className="practice-evidence-field" htmlFor={`attempt-requirement-${attempt.sessionId}`}>
          {attempt.attachment ? "Change or remove requirement" : "Choose a requirement"}
          <select id={`attempt-requirement-${attempt.sessionId}`} value={selectedId} disabled={busy || requirements.length === 0} onChange={event => { setSelectedId(event.target.value); setAttachError(""); }}>
            <option value="">{attempt.attachment ? "Remove current attachment" : "No requirement selected"}</option>
            {requirements.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}
          </select>
        </label>
        {requirements.length === 0 && <p className="practice-evidence-readonly">No requirements are available for this role.</p>}
        <div className="saved-attempt-attach-actions">
          <Button type="button" variant="secondary" className="practice-evidence-button" disabled={!canApply} onClick={() => void applyAttachment()}>
            {selectedId ? <><Link2 size={14} aria-hidden="true" />{attempt.attachment ? "Change attachment" : "Attach attempt"}</> : <><Unlink size={14} aria-hidden="true" />Remove attachment</>}
          </Button>
          {attempt.attachment && !changed && <span className="saved-attempt-attached"><Check size={13} aria-hidden="true" /> Attached to {requirements.find(item => item.id === attachedId)?.title ?? "a requirement"}</span>}
        </div>
        {attachError && <p className="practice-evidence-error" role="alert">{attachError}</p>}
      </>}
    </div>
  </section>;
}

type RequirementEvidenceEntryProps = { attempt: PracticeAttempt; onView: () => void };

export function RequirementEvidenceEntry({ attempt, onView }: RequirementEvidenceEntryProps) {
  return <article className="requirement-evidence-entry">
    <div className="requirement-evidence-main">
      <span className="practice-evidence-eyebrow">PRACTICE ATTEMPT · SELF-REPORT</span>
      <strong>{attempt.content.title}</strong>
      <small>{formatSavedAt(attempt.savedAt)} · {assistanceLabel(attempt.assistance.otherHelp)} · Code or design was not run</small>
      {attempt.assessment.observedResult && <p>{attempt.assessment.observedResult}</p>}
      {attempt.assessment.limitations && <p className="requirement-evidence-limit">Limit: {attempt.assessment.limitations}</p>}
      {attempt.nextAction && <p><b>Next action:</b> {attempt.nextAction}</p>}
    </div>
    <Button type="button" variant="ghost" className="practice-evidence-button" onClick={onView}>View attempt <ArrowRight size={14} aria-hidden="true" /></Button>
  </article>;
}

function assistanceLabel(value: PracticeSave["assistance"]["otherHelp"]): string {
  return ({ unknown: "Other help not recorded", none: "No other help reported", ai: "AI help reported", person: "Help from a person reported", reference: "External reference reported", mixed: "Multiple kinds of help reported" })[value];
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
