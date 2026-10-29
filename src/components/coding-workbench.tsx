"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, History, Loader2, Play, RotateCcw, Send, XCircle } from "lucide-react";
import { codingHistorySchema, codingResponseSchema, type CodingAttempt, type CodingLanguage, type CodingMode, type CodingProblem } from "@/contracts/coding";
import { codingDefinition } from "@/data/coding-problems";
import { workspaceFetch, workspaceSessionStorage } from "./workspace-client";
import CodeEditor from "./code-editor";
import { Button } from "./ui";
import "./coding-workbench.css";

const labels: Record<CodingAttempt["status"],string> = { queued:"Run in progress", passed:"Tests passed", wrong_answer:"Check your result", runtime_error:"Program error", time_limit:"Time limit exceeded", runner_error:"Run unavailable" };
export function CodingWorkbench({ questionId, language }: { questionId: string; language: CodingLanguage }) {
  const definition = codingDefinition(questionId);
  const starter = definition?.starter[language] ?? "";
  const draftKey = `coding-draft-v1:${questionId}:${language}`;
  const [code, setCode] = useState(starter);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<CodingProblem|null>(null);
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState(false);
  const [attempts, setAttempts] = useState<CodingAttempt[]>([]);
  const [result, setResult] = useState<CodingAttempt|null>(null);
  const [saved, setSaved] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [undo, setUndo] = useState<string|null>(null);
  const live = useRef(true);
  const controller = useRef<AbortController|null>(null);
  const loadGeneration = useRef(0);
  useEffect(() => {
    live.current = true;
    try { setCode(workspaceSessionStorage.getItem(draftKey) ?? starter); } catch { setDraftError(true); }
    setReady(true);
    return () => { live.current = false; controller.current?.abort(); };
  }, [draftKey, starter]);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setChecking(true); setError("");
    try {
      const response = await workspaceFetch(`/api/coding?questionId=${encodeURIComponent(questionId)}`, {cache:"no-store",signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error("Could not load saved runs. Your current code is kept.");
      const data = codingHistorySchema.parse(await response.json());
      if (!live.current || generation !== loadGeneration.current) return;
      setConfigured(data.configured); setProblem(data.problem); setAttempts(data.attempts);
    } catch (issue) { if (live.current && generation === loadGeneration.current) setError(issue instanceof Error ? issue.message : "Could not load coding practice."); }
    finally { if (live.current && generation === loadGeneration.current) setChecking(false); }
  }, [questionId]);
  useEffect(() => { void load(); }, [load]);
  function update(next: string) {
    setCode(next);
    try { workspaceSessionStorage.setItem(draftKey, next); setDraftError(false); }
    catch { setDraftError(true); }
  }
  async function run(mode: CodingMode) {
    if (pending) return;
    setPending(true); setError(""); setResult(null);
    const runController = new AbortController(); controller.current = runController;
    const deadline = window.setTimeout(() => runController.abort(), 45000);
    try {
      const response = await workspaceFetch("/api/coding", { method:"POST", headers:{"Content-Type":"application/json"}, signal:runController.signal,
        body:JSON.stringify({attemptId:crypto.randomUUID(),questionId,language,mode,code}) });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The run could not be confirmed. Your code is kept.");
      const data = codingResponseSchema.parse(body);
      if (!live.current) return;
      setResult(data.attempt); setSaved(data.saved);
      if (data.saved) setAttempts(previous => [data.attempt, ...previous.filter(item=>item.attemptId!==data.attempt.attemptId)].slice(0,20));
    } catch (issue) {
      if (live.current) setError(runController.signal.aborted ? "The run could not be confirmed before the deadline. Refresh saved runs before trying again." : issue instanceof Error ? issue.message : "The run failed. Your code is kept.");
    } finally { window.clearTimeout(deadline); if (live.current) setPending(false); }
  }
  if (!definition) return <p className="coding-not-supported">Executable tests are not available for this problem yet.</p>;
  return <section className="coding-workbench" aria-label="Coding practice">
    <div className="coding-workbench-heading"><h3>Your solution</h3><span>{language === "python" ? "Python" : "JavaScript"}</span><button className="coding-history-button" onClick={()=>setHistoryOpen(open=>!open)} aria-expanded={historyOpen}><History size={15}/>Saved runs{attempts.length>0 && <span>{attempts.length}</span>}</button></div>
    {ready && <CodeEditor value={code} onChange={update} language={language}/>}
    <div className="coding-actions"><span>{draftError ? "Browser draft could not be saved." : "Draft kept in this tab"}</span><Button variant="secondary" disabled={pending || checking || !configured || !problem || !code.trim() || code.length>32000} onClick={()=>run("examples")}><Play size={14}/>Run examples</Button><Button disabled={pending || checking || !configured || !problem || !code.trim() || code.length>32000} onClick={()=>run("submit")}>{pending ? <Loader2 className="spin" size={14}/> : <Send size={14}/>}Submit tests</Button></div>
    {pending && <div className="coding-run-status" role="status"><Loader2 className="spin" size={16}/>Running your solution…</div>}
    {!checking && !configured && !error && <p className="coding-availability">The code runner is not connected yet. You can write your solution and keep a draft here.</p>}
    {checking && <p className="coding-availability" role="status">Loading saved runs…</p>}
    {code.length>32000 && <p className="coding-error" role="alert">Keep your solution under 32,000 characters.</p>}
    {error && <div className="coding-error" role="alert"><span>{error}</span><Button variant="ghost" onClick={load} disabled={pending || checking}><RotateCcw size={14}/>Refresh runs</Button></div>}
    {result && <RunResult result={result} current={result.code===code} saved={saved}/>}
    {problem && !result && <details className="coding-examples"><summary>Example tests <span>{problem.examples.length} examples · {problem.totalCases} total tests</span><ChevronDown size={14}/></summary>{problem.examples.map(test=><div key={test.id}><strong>{test.name}</strong><p>Input <code>{JSON.stringify(test.args)}</code></p><p>Expected <code>{JSON.stringify(test.expected)}</code></p></div>)}</details>}
    {historyOpen && <section className="coding-history" aria-label="Saved coding runs"><div className="coding-history-heading"><h4>Saved runs</h4><Button variant="ghost" onClick={load} disabled={checking || pending}><RotateCcw size={13}/>Refresh</Button></div>{attempts.length===0 ? <p>No saved runs yet. Run examples or submit your solution to start.</p> : attempts.map(item=><div className="coding-history-row" key={item.attemptId}><span className={`coding-result-dot ${item.status}`}/><div><strong>{labels[item.status]}</strong><span>{item.language === "python" ? "Python" : "JavaScript"} · {item.mode === "examples" ? "Examples" : "Full suite"} · {new Date(item.createdAt).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span></div><button onClick={()=>{setResult(item);setSaved(true);}}>Results</button>{item.language===language && <button onClick={()=>{setUndo(code);update(item.code);setResult(item);setSaved(true);}}>Load code</button>}</div>)}{undo!==null && <button className="coding-undo" onClick={()=>{update(undo);setUndo(null);}}>Undo code replacement</button>}</section>}
  </section>;
}
function RunResult({result,current,saved}:{result:CodingAttempt;current:boolean;saved:boolean}) {
  const passed = result.results.filter(test=>test.status==="passed").length;
  return <section className={`coding-result coding-result-${result.status}`} aria-label="Coding results" aria-live="polite"><header>{result.status==="passed" ? <CheckCircle2 size={18}/> : result.status==="time_limit" ? <Clock3 size={18}/> : <XCircle size={18}/>}<div><strong>{labels[result.status]}</strong><span>{result.mode==="examples" ? "Example tests" : "Full test suite"}{result.runtime && ` · ${result.runtime}`}</span></div>{result.results.length>0 && <b>{passed}/{result.results.length}</b>}</header>{!current && <p className="coding-result-stale">These results are for earlier code. Run again to check your edits.</p>}{!saved && <p className="coding-error">The run completed, but saving was not confirmed. Keep this page open to retain the results.</p>}<p>{result.message}</p>{result.results.map(test=><details className={`coding-test coding-test-${test.status}`} key={test.id} open={test.status==="wrong_answer" || test.status==="runtime_error"}><summary><span>{test.status==="passed" ? <CheckCircle2 size={14}/> : test.status==="not_run" ? <Clock3 size={14}/> : <XCircle size={14}/>}</span>{test.name}<small>{test.status.replaceAll("_"," ")}</small><ChevronDown size={13}/></summary><dl><div><dt>Input arguments</dt><dd><code>{JSON.stringify(test.args)}</code></dd></div><div><dt>Expected</dt><dd><code>{JSON.stringify(test.expected)}</code></dd></div><div><dt>Actual</dt><dd><code>{test.status==="not_run" ? "Not returned" : JSON.stringify(test.actual)}</code></dd></div></dl>{test.error && <pre>{test.error}</pre>}</details>)}{result.output && <details className="coding-output" open={result.status!=="passed"}><summary>Program output</summary><pre>{result.output}</pre></details>}{result.timeMs!==null && <p className="coding-timing">{result.timeMs} ms{result.memoryKb!==null && ` · ${Math.round(result.memoryKb/1024)} MB`} · Runner measurement</p>}</section>;
}
