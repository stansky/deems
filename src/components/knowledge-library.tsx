"use client";

import { workspaceFetch } from "@/components/workspace-client";

import { useCallback, useRef, useState, useEffect } from "react";
import { ArrowRight, BookOpen, ChevronRight, ExternalLink, Lightbulb, Loader2, RotateCcw, Search } from "lucide-react";
import type { KnowledgeEntry } from "@/data/knowledge";
import { knowledgeListResponseSchema } from "@/contracts/learning";
import { Badge, Button, Empty, PageHeader } from "@/components/ui";
import "./knowledge-library.css";

type KindFilter = "all" | "term" | "mental-math";
const kindOptions = [{ value: "all", label: "All" }, { value: "term", label: "Terms" }, { value: "mental-math", label: "Mental math" }] as const;

export default function KnowledgeLibrary({ initialSelectedId = "" }: { initialSelectedId?: string }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [category, setCategory] = useState("All topics");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const readerRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await workspaceFetch("/api/knowledge", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the reference library.");
      const result = knowledgeListResponseSchema.parse(await response.json());
      setEntries(result.entries); setSelectedId(id => id || result.entries[0]?.id || "");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not load the reference library."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const categories = Array.from(new Set(entries.filter(entry => kind === "all" || entry.kind === kind).map(entry => entry.category))).sort();
  const search = query.trim().toLowerCase();
  const filtered = entries.filter(entry => (kind === "all" || entry.kind === kind) && (category === "All topics" || entry.category === category) && `${entry.title} ${entry.category} ${entry.plain}`.toLowerCase().includes(search));
  const selected = filtered.find(entry => entry.id === selectedId) ?? filtered[0];
  function selectEntry(id: string, clearFilters = false) {
    if (clearFilters) { setQuery(""); setKind("all"); setCategory("All topics"); }
    setSelectedId(id);
    requestAnimationFrame(() => readerRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }
  return <div className="knowledge-library">
    <PageHeader title="Reference" />
    <div className="reference-toolbar"><div className="reference-kind-tabs" role="tablist" aria-label="Reference type">{kindOptions.map(option => <button key={option.value} role="tab" aria-selected={kind === option.value} className={kind === option.value ? "selected" : ""} onClick={() => { setKind(option.value); setCategory("All topics"); }}>{option.label}</button>)}</div><label className="search-input"><Search size={16} /><input aria-label="Search reference library" placeholder={entries.length ? `Search ${entries.length} references` : "Search references"} value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter reference topic" value={category} onChange={event => setCategory(event.target.value)}><option>All topics</option>{categories.map(topic => <option key={topic}>{topic}</option>)}</select>{(query || kind !== "all" || category !== "All topics") && <span className="reference-count">{filtered.length} results</span>}</div>
    {error && <div className="notice notice-error" role="alert"><span>{error}</span><Button variant="ghost" onClick={load}><RotateCcw size={14} />Retry</Button></div>}
    {loading ? <div className="reference-loading" role="status"><Loader2 size={18} className="spin" />Loading reference library...</div> : selected ? <div className="reference-layout"><aside className="reference-index" aria-label="Reference entries">{filtered.map(entry => <button key={entry.id} onClick={() => selectEntry(entry.id)} className={entry.id === selected.id ? "selected" : ""} aria-current={entry.id === selected.id ? "true" : undefined}><span className="reference-index-icon">{entry.kind === "mental-math" ? <Lightbulb size={15} /> : <BookOpen size={15} />}</span><span><strong>{entry.title}</strong><small>{entry.category}</small></span><ChevronRight size={14} /></button>)}</aside><div ref={readerRef} className="reference-reader-container"><ReferenceReader key={selected.id} entry={selected} entries={entries} onRelated={id => selectEntry(id, true)} /></div></div> : !error && <Empty title="No matching entries">Try another topic or search.</Empty>}
  </div>;
}

function ReferenceReader({ entry, entries, onRelated }: { entry: KnowledgeEntry; entries: KnowledgeEntry[]; onRelated: (id: string) => void }) {
  const mentalMath = entry.kind === "mental-math";
  const related = entry.relatedTerms.map(term => entries.find(candidate => candidate.id === term || candidate.title.toLowerCase() === term.toLowerCase())).filter((candidate): candidate is KnowledgeEntry => Boolean(candidate) && candidate!.id !== entry.id);
  const visibleRelated = Array.from(new Map(related.map(item => [item.id, item])).values());
  return <article className={`reference-reader ${mentalMath ? "reference-mental-math" : ""}`}>
    <header className="reference-reader-heading"><div><Badge tone="blue">{entry.category}</Badge><span>{mentalMath ? "Cheat sheet" : "Term"}</span></div><h2>{entry.title}</h2><p>{entry.plain}</p></header>
    {entry.analogy && <section className="reference-analogy"><Lightbulb size={18} /><div><h3>Think of it this way</h3><p>{entry.analogy}</p></div></section>}
    {<div className="reference-worked-content"><section className="reference-example"><h3>{mentalMath ? "Quick example" : "Example"}</h3><div>{entry.example}</div></section>{entry.steps.length > 0 && <section className="reference-steps"><h3>{mentalMath ? "Mental shortcut" : "How to use it"}</h3><ol>{entry.steps.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol></section>}</div>}
    {entry.pitfalls.length > 0 && <section className="reference-pitfalls"><h3>{entry.pitfalls.length === 1 ? "Common mistake" : "Watch for"}</h3>{entry.pitfalls.map((pitfall, index) => <p key={`${index}-${pitfall}`}>{pitfall}</p>)}</section>}
    {visibleRelated.length > 0 && <section className="reference-related"><h3>Related</h3><div>{visibleRelated.map(item => <button key={item.id} onClick={() => onRelated(item.id)}>{item.title}<ArrowRight size={13} /></button>)}</div></section>}
    {entry.sources.length > 0 && <footer className="reference-sources"><h3>Sources</h3>{entry.sources.filter(source => /^https?:\/\//i.test(source.url)).map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={12} /></a>)}</footer>}
  </article>;
}
