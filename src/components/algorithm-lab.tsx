"use client";

import { QuestionSession } from "@/components/features/learning/question-session";
import { GripVertical } from "lucide-react";
import { workspaceFetch } from "@/components/workspace-client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, Lightbulb, Loader2, RotateCcw, Search, Settings2, Sparkles } from "lucide-react";
import { learningConcepts } from "@/data/algorithms";
import { algorithmLanguageSchema, algorithmsResponseSchema, coachInputSchema, coachingHistoryResponseSchema, coachingRecordSchema, coachingResponseSchema } from "@/contracts/learning";
import type { AlgorithmLanguage, AlgorithmQuestionData, CoachRequest, CoachingRecord } from "@/contracts/learning";
import type { WorkspaceState } from "@/lib/types";
import type { CommandMeta } from "@/domains/career/contracts";
import { RevisionNote } from "@/components/revision-note";
import CodeEditor from "@/components/code-editor";
import { CodingWorkbench } from "@/components/coding-workbench";
import { runnableQuestionIds } from "@/data/coding-problems";
import { Badge, Button, Empty, PageHeader } from "@/components/ui";
import "./algorithm-lab.css";

type Save = (action: string, data: unknown, meta?: CommandMeta) => Promise<boolean>;
type LearningProfile = { style: "systems" | "steps" | "visual"; concerns: string[]; notes: string };
const languageNames: Record<AlgorithmLanguage, string> = { python: "Python", javascript: "JavaScript", go: "Go", php: "PHP" };
const explanationStyles = [{ id: "systems", label: "APIs & systems" }, { id: "steps", label: "Step by step" }, { id: "visual", label: "Everyday analogy" }] as const;
function readProfile(raw?: string): LearningProfile {
  try { const value = JSON.parse(raw ?? "{}"); return { style: ["systems", "steps", "visual"].includes(value.style) ? value.style : "systems", concerns: Array.isArray(value.concerns) ? value.concerns.filter((id: unknown) => typeof id === "string") : [], notes: typeof value.notes === "string" ? value.notes : "" }; }
  catch { return { style: "systems", concerns: [], notes: "" }; }
}
function inferredConcerns(text: string) {
  const patterns: [string, RegExp][] = [["ternary", /ternar|inline\s+if|shorthand\s+if/i], ["median", /median|middle\s+(number|value)|mean\s+vs/i], ["control-flow", /control.?flow|branch|condition|\bloop/i], ["memoization", /memoiz|memois|\bmemos?\b|cach|remember.*result/i], ["recursion", /recurs|base\s+case|call.*itself/i], ["pointers", /pointer|two.?pointer|indices|indexing/i], ["complexity", /complexity|big[ -]?o|runtime|logarith|quadratic|\bmath/i]];
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}
function systemsExplanation(question: AlgorithmQuestionData) {
  const pattern = `${question.pattern} ${question.title}`.toLowerCase();
  if (/hash|two sum|duplicate|anagram|frequency/.test(pattern)) return "Think of the lookup table as a small database index. Each item you have already read becomes a key you can find directly. Before doing more work, ask whether the index already contains the information you need.";
  if (/window/.test(pattern)) return "Think of a rolling request window. Keep only the state needed for the current range, add the item arriving at the right edge, and remove what leaves at the left edge. Reuse that state instead of recomputing the entire range.";
  if (/binary search/.test(pattern)) return "Think of searching a sorted index. Each comparison tells you which half cannot contain the answer. The important part is keeping the remaining search range correct, including its first and last positions.";
  if (/stack|parenthes/.test(pattern)) return "Think of nested transactions or a call stack. The most recently opened operation must be resolved first. Store the unfinished work in that same last-in, first-out order.";
  if (/linked|pointer|reverse|cycle/.test(pattern)) return "Think of records linked by references. A pointer is the location of a record or item, not a mysterious calculation. Name what each pointer represents, then track which reference changes on each step.";
  if (/dynamic|memo|climb|fibonacci/.test(pattern)) return "Think of caching an expensive computation. First identify the inputs that define a smaller problem. Save its result under that state, and reuse it whenever the same smaller problem comes up again.";
  if (/tree|depth|recurs/.test(pattern)) return "Think of a nested folder or dependency tree. Each call handles one small node, asks its children for their results, and combines them. The base case is the smallest request that can return without making another call.";
  if (/interval|merge/.test(pattern)) return "Think of merging maintenance windows. Sort the windows by start time so adjacent records can be compared. Then keep the current combined window and either extend it or finish it.";
  return "Treat this as a small data-processing job. State the input, the output, and the information you must keep between items. Trace one concrete example before trying to optimize the work.";
}

function ArrayExample({ question }: { question: AlgorithmQuestionData }) {
  if (question.id !== "two-sum") return null;
  try {
    const values: unknown = JSON.parse(question.example.input.match(/\[[^\]]+\]/)?.[0] ?? "null");
    const target = question.example.input.match(/target\s*=\s*(-?\d+)/)?.[1];
    if (!Array.isArray(values) || values.length < 2 || values.length > 8 || !values.every(value => typeof value === "number" && Number.isFinite(value)) || !target) return null;
    return <figure className="qs-array-stage"><figcaption><span>INPUT ARRAY</span><span>target <strong>{target}</strong></span></figcaption><div className="qs-array-values">{values.map((value, index) => <div key={index}><span>{index}</span><strong>{value}</strong></div>)}</div><div className="qs-array-caption"><code>nums</code><span>Expected positions <code>{question.example.output}</code></span></div></figure>;
  } catch { return null; }
}

export default function AlgorithmLab({ state, mutate, saving, initialSelectedId = "" }: { state: WorkspaceState; mutate: Save; saving: boolean; initialSelectedId?: string }) {
  const [questions, setQuestions] = useState<AlgorithmQuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [active, setActive] = useState(Boolean(initialSelectedId));
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All levels");
  const [runnableOnly, setRunnableOnly] = useState(!initialSelectedId || runnableQuestionIds.includes(initialSelectedId));
  const [language, setLanguage] = useState<AlgorithmLanguage>("python");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<LearningProfile>(() => readProfile(state.settings["learning-profile"]));
  useEffect(() => { setProfile(readProfile(state.settings["learning-profile"])); }, [state.settings]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await workspaceFetch("/api/algorithms", { cache: "no-store" }); if (!response.ok) throw new Error("Could not load the question bank."); const data = algorithmsResponseSchema.parse(await response.json()); setQuestions(data.questions); setSelectedId(id => id || data.questions[0]?.id || ""); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not load the question bank."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (initialSelectedId) {setSelectedId(initialSelectedId);setActive(true);} }, [initialSelectedId]);
  const filtered = questions.filter(question => (!runnableOnly || runnableQuestionIds.includes(question.id)) && (difficulty === "All levels" || question.difficulty === difficulty) && `${question.title} ${question.pattern}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find(question => question.id === selectedId) ?? filtered[0];
  return <div className="algorithm-lab">
    <PageHeader title="Coding" />
    {profileOpen && <LearningPreferences savedProfile={profile} mutate={mutate} saving={saving} onSaved={() => setProfileOpen(false)} />}
    {error && <div className="notice notice-error" role="alert"><span>{error}</span><Button variant="ghost" onClick={load}><RotateCcw size={14} />Retry</Button></div>}
    <div className="algorithm-toolbar"><label className="search-input"><Search size={16} /><input aria-label="Search algorithm questions" placeholder="Search questions or patterns" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter algorithm difficulty" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option>All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select><label className="coding-runnable-filter"><input type="checkbox" checked={runnableOnly} onChange={event=>setRunnableOnly(event.target.checked)}/>Runnable only</label><span>{filtered.length} questions</span><Button variant="secondary" onClick={() => setProfileOpen(open => !open)} aria-expanded={profileOpen}><Settings2 size={15} />How I learn{profile.concerns.length > 0 && <span className="algorithm-profile-count">{profile.concerns.length}</span>}</Button></div>
    {loading ? <div className="algorithm-loading" role="status"><Loader2 size={18} className="spin" />Loading question bank...</div> : selected ? <div className="algorithm-bank"><aside className="algorithm-index" aria-label="Algorithm questions">{filtered.map(question => <button key={question.id} className={question.id === selected.id ? "selected" : ""} onClick={() => {setSelectedId(question.id);setActive(true);}} aria-current={question.id === selected.id ? "true" : undefined}><span className="algorithm-question-number">{filtered.indexOf(question) + 1 < 10 ? "0" : ""}{filtered.indexOf(question) + 1}</span><span><strong>{question.title}</strong><small><span className={`difficulty-dot difficulty-${question.difficulty.toLowerCase()}`} />{question.difficulty}<span className="algorithm-index-divider">·</span>{question.pattern}</small></span><ChevronRight size={14} /></button>)}</aside>{active && <QuestionWorkspace onExit={() => setActive(false)} key={selected.id} question={selected} language={language} setLanguage={setLanguage} profile={profile} state={state} mutate={mutate} saving={saving} />}</div> : !error && <Empty title="No matching questions">Try another search or difficulty.</Empty>}
  </div>;
}

function LearningPreferences({ savedProfile, mutate, saving, onSaved }: { savedProfile: LearningProfile; mutate: Save; saving: boolean; onSaved: () => void }) {
  const [draft, setDraft] = useState(savedProfile);
  const [failed, setFailed] = useState(false);
  async function save() { setFailed(false); const next = { ...draft, concerns: Array.from(new Set([...draft.concerns, ...inferredConcerns(draft.notes)])) }; const ok = await mutate("setting", { key: "learning-profile", value: JSON.stringify(next) }); if (ok) onSaved(); else setFailed(true); }
  return <section className="learning-preferences"><div className="learning-preferences-heading"><h2>How I learn</h2><span>Saved across questions</span></div><fieldset><legend>Start explanations with</legend><div className="learning-style-options">{explanationStyles.map(style => <label key={style.id} className={draft.style === style.id ? "selected" : ""}><input type="radio" name="learning-style" checked={draft.style === style.id} onChange={() => setDraft(value => ({ ...value, style: style.id }))} /><span>{style.label}</span></label>)}</div></fieldset><label className="field-label">What trips me up?<textarea className="notes-textarea short-textarea" value={draft.notes} onChange={event => setDraft(value => ({ ...value, notes: event.target.value }))} placeholder="For example: I understand APIs, but ternaries and recursion confuse me." /></label><fieldset><legend>Concepts to explain</legend><div className="learning-concept-options">{learningConcepts.map(concept => <label key={concept.id}><input type="checkbox" checked={draft.concerns.includes(concept.id)} onChange={event => setDraft(value => ({ ...value, concerns: event.target.checked ? [...value.concerns, concept.id] : value.concerns.filter(id => id !== concept.id) }))} /><span>{concept.label}</span></label>)}</div></fieldset><div className="learning-preferences-footer"><span>Recognized concepts in your note are added when you save.</span><Button disabled={saving} onClick={save}><Check size={15} />Save preferences</Button></div>{failed && <p className="algorithm-inline-error" role="alert">Preferences could not be saved. Your changes are still here.</p>}</section>;
}

function QuestionWorkspace({ question, language, setLanguage, profile, state, mutate, saving, onExit }: { onExit: () => void; question: AlgorithmQuestionData; language: AlgorithmLanguage; setLanguage: (language: AlgorithmLanguage) => void; profile: LearningProfile; state: WorkspaceState; mutate: Save; saving: boolean }) {
  const [split, setSplit] = useState(41);
  const [revealed, setRevealed] = useState(false);
  const [panel, setPanel] = useState("Description");
  const [explanation, setExplanation] = useState(profile.style);
  const noteKey = `algorithm:${question.id}`;
  useEffect(() => { setExplanation(profile.style); }, [profile.style]);
  const solution = question.solutions[language];
  const relevant = Array.from(new Set([...profile.concerns, ...question.concepts])).map(id => learningConcepts.find(concept => concept.id === id)).filter((concept): concept is typeof learningConcepts[number] => Boolean(concept));
  function anotherWay() { const index = explanationStyles.findIndex(style => style.id === explanation); setExplanation(explanationStyles[(index + 1) % explanationStyles.length].id); }
  return <QuestionSession title={question.title} context={`Coding / ${question.pattern}`} onExit={onExit} className="qs-coding"><article className="algorithm-question" style={{gridTemplateColumns:`${split}% 8px minmax(0,1fr)`}}><div className="algorithm-reading"><nav className="algorithm-panel-tabs" aria-label="Problem panels">{["Description", "Solution", "Notes", "Coach"].map(tab => <button key={tab} type="button" aria-pressed={panel === tab} onClick={() => setPanel(tab)}>{tab}</button>)}</nav><div className="algorithm-panel-body"><div hidden={panel !== "Description"}><header className="algorithm-question-heading"><div className="algorithm-question-meta"><Badge tone={question.difficulty === "Easy" ? "green" : question.difficulty === "Medium" ? "blue" : "amber"}>{question.difficulty}</Badge><span>{question.pattern}</span><a href={question.url} target="_blank" rel="noreferrer">Original problem<ExternalLink size={12} /></a></div><div className="algorithm-title-row"><h2>{question.title}</h2></div><p>{question.summary}</p></header><ArrayExample question={question} /><section className="algorithm-example"><div><span>Input</span><code>{question.example.input}</code></div><ArrowRight size={16} /><div><span>Output</span><code>{question.example.output}</code></div></section></div><div hidden={panel !== "Notes"}><section className="algorithm-approach"><RevisionNote noteKey={noteKey} value={state.notes[noteKey] ?? ""} revision={state.noteRevisions?.[noteKey] ?? 0} revisions={state.careerRevisions ?? []} saving={saving} mutate={mutate} label="Your approach" saveLabel="Save notes" placeholder="What would you keep track of? Walk through the example before coding." /></section>
</div>
    <div hidden={panel !== "Solution"}>{!revealed ? <div className="algorithm-reveal"><Button onClick={() => setRevealed(true)}><BookOpen size={16} />Show solution<ChevronDown size={15} /></Button></div> : <div className="algorithm-solution"><div className="algorithm-solution-toolbar"><h3>Solution</h3><span className="algorithm-solution-language">{languageNames[language]}</span></div><CodeEditor value={solution.code} onChange={() => undefined} language={language} readOnly /><div className="algorithm-explanation-heading"><h3>Understand the approach</h3><button className="text-button" onClick={anotherWay}><RotateCcw size={13} />Explain another way</button></div><div className="algorithm-explanation-tabs" role="tablist" aria-label="Explanation style">{explanationStyles.map(style => <button role="tab" aria-selected={explanation === style.id} key={style.id} className={explanation === style.id ? "selected" : ""} onClick={() => setExplanation(style.id)}>{style.label}</button>)}</div><div className="algorithm-explanation">{explanation === "systems" ? <p>{systemsExplanation(question)}</p> : explanation === "visual" ? <p>{question.analogy}</p> : <ol>{question.walkthrough.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>}</div><details className="algorithm-code-notes" open={explanation === "steps"}><summary>Read the {languageNames[language]} code<ChevronDown size={14} /></summary><ol>{solution.explanation.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></details><div className="algorithm-complexity"><div><span>Time</span><code>{question.complexity.time}</code></div><div><span>Space</span><code>{question.complexity.space}</code></div><p>{question.complexity.plain}</p></div></div>}</div>
    <div hidden={panel !== "Coach"}><AiCoach question={question} language={language} revealed={revealed} /></div>
    <div hidden={panel !== "Description"}>
    {relevant.length > 0 && <section className="algorithm-concepts"><div className="algorithm-section-title"><Lightbulb size={17} /><h3>Concept help</h3></div>{relevant.map(concept => <details key={concept.id} open={profile.concerns.includes(concept.id)}><summary><span>{concept.label}</span>{profile.concerns.includes(concept.id) && <small>Your focus</small>}<ChevronDown size={14} /></summary><div><p>{concept.explanation}</p><p className="concept-analogy">{concept.analogy}</p><ol>{concept.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></div></details>)}</section>}
    </div></div></div><div className="qs-split-handle" role="separator" aria-label="Resize problem and editor" aria-orientation="vertical" tabIndex={0} aria-valuemin={30} aria-valuemax={60} aria-valuenow={split} onKeyDown={event => {if(event.key === "ArrowLeft" || event.key === "ArrowRight"){event.preventDefault();setSplit(value=>Math.max(30,Math.min(60,value+(event.key === "ArrowLeft" ? -2 : 2))));}}} onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={event => {if(event.currentTarget.hasPointerCapture(event.pointerId)){const parent=event.currentTarget.parentElement!.getBoundingClientRect();setSplit(Math.max(30,Math.min(60,(event.clientX-parent.left)/parent.width*100)));}}}><GripVertical size={13} /></div><div className="algorithm-editor-pane"><div className="algorithm-editor-toolbar"><strong>Code</strong><label className="algorithm-language-choice"><span>Language</span><select aria-label="Algorithm language" value={language} onChange={event => setLanguage(algorithmLanguageSchema.parse(event.target.value))}>{Object.entries(languageNames).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>{(language === "python" || language === "javascript") && runnableQuestionIds.includes(question.id) ? <CodingWorkbench key={`${question.id}:${language}`} questionId={question.id} language={language} fill/> : <p className="coding-not-supported">{runnableQuestionIds.includes(question.id) ? "Switch to JavaScript or Python to run your solution." : "Executable tests are not available for this problem yet. Reference solutions are below."}</p>}</div>
  </article></QuestionSession>;
}

type CoachMode = CoachRequest["mode"];
function AiCoach({ question, language, revealed }: { question: AlgorithmQuestionData; language: AlgorithmLanguage; revealed: boolean }) {
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<CoachingRecord[]>([]);
  const [lastMode, setLastMode] = useState<CoachMode>("explain");
  const [activeAnswer, setActiveAnswer] = useState<CoachingRecord | null>(null);
  const load = useCallback(async () => {
    setChecking(true); setError("");
    try { const response = await workspaceFetch(`/api/coach?questionId=${encodeURIComponent(question.id)}`, { cache: "no-store" }); if (!response.ok) throw new Error("Could not connect to the coach."); const data = coachingHistoryResponseSchema.parse(await response.json()); setConfigured(data.configured); setHistory(data.history); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Could not connect to the coach."); }
    finally { setChecking(false); }
  }, [question.id]);
  useEffect(() => { void load(); }, [load]);
  async function ask(mode: CoachMode) {
    setLastMode(mode); setPending(true); setError("");
    try {
      const request = coachInputSchema.parse({ questionId: question.id, language, message: message.trim() || (mode === "rephrase" ? "Rephrase this question using my learning preferences." : mode === "hint" ? "Give me a small hint for my next step." : "Explain this using my learning preferences."), mode, revealSolution: revealed });
      const response = await workspaceFetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const problem = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "The coach could not respond. Please try again.";
        throw new Error(problem);
      }
      const data = coachingResponseSchema.parse(payload);
      const result = coachingRecordSchema.parse(data);
      setActiveAnswer(result); setHistory(value => [result, ...value.filter(item => item.id !== result.id)]);
    }
    catch (issue) { setError(issue instanceof Error ? issue.message : "The coach could not respond."); }
    finally { setPending(false); }
  }
  return <section className="algorithm-coach"><div className="algorithm-section-title"><Sparkles size={17} /><h3>AI coach</h3>{checking && <Loader2 size={13} className="spin" />}</div><label className="field-label" htmlFor={`coach-${question.id}`}>What is confusing?<textarea id={`coach-${question.id}`} className="notes-textarea short-textarea" value={message} onChange={event => setMessage(event.target.value)} placeholder="For example: Why do we check the map before adding the current number?" /></label><div className="algorithm-coach-actions"><Button variant="secondary" disabled={pending || checking || !configured} onClick={() => ask("rephrase")}>Rephrase</Button><Button variant="secondary" disabled={pending || checking || !configured} onClick={() => ask("hint")}>Hint</Button><Button disabled={pending || checking || !configured} onClick={() => ask("explain")}>{pending ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}Explain</Button></div><p className="algorithm-coach-disclosure">Sends the question and learning context to OpenAI. Jev selects the teaching style when configured.</p>{!checking && !configured && !error && <p className="algorithm-inline-error">AI coach is not configured on this machine.</p>}{error && <div className="algorithm-coach-error" role="alert"><span>{error}</span><Button variant="ghost" disabled={pending} onClick={() => configured ? ask(lastMode) : load()}><RotateCcw size={13} />Retry</Button></div>}{activeAnswer && <CoachResponse result={activeAnswer} />}{history.length > 0 && <details className="algorithm-coach-history"><summary>Saved explanations <span>{history.length}</span><ChevronDown size={14} /></summary>{history.map(result => <button key={result.id} onClick={() => setActiveAnswer(result)}><span>{result.message || result.answer.rephrasedQuestion || "Explanation"}</span><small>{result.language ? languageNames[result.language] : ""} · {new Date(result.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small><ChevronRight size={14} /></button>)}</details>}</section>;
}
function CoachResponse({ result }: { result: CoachingRecord }) {
  return <div className="algorithm-coach-response"><div className="coach-response-meta"><span>OpenAI</span><span>{result.model}</span>{result.routing && <span className="coach-routing" title={result.routing.reason}>{result.routing.provider === "jev" ? `Jev · ${result.routing.style === "steps" ? "step by step" : result.routing.style === "visual" ? "analogy" : "systems"}` : "Saved preferences"}</span>}</div>{result.answer.rephrasedQuestion && <h4>{result.answer.rephrasedQuestion}</h4>}{result.answer.explanation && <p>{result.answer.explanation}</p>}{result.answer.steps?.length > 0 && <ol>{result.answer.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>}{result.answer.checkQuestion && <div className="coach-check-question"><span>Check your understanding</span><p>{result.answer.checkQuestion}</p></div>}</div>;
}
