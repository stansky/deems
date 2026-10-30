"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Asterisk, BookOpen, ChevronLeft, ChevronRight, Code2, Delete, Search } from "lucide-react";
import type { GuideSection, InterviewGuide } from "@/data/interview-guides";
import type { StickyNote } from "@/data/interview-notes";
import type { InterviewTopic, TopicCode } from "@/data/interview-topics";
import { highlightCode } from "@/lib/highlight-code";
import { hashForRoute, isUnambiguousNoteNumber, routeFromHash, type NotesRoute } from "@/lib/note-number";
import { searchNotes } from "@/lib/notes-search";

type CheatSheet = { title: string; summary: string; sections: GuideSection[] };
type Props = { notes: StickyNote[]; topics: InterviewTopic[]; guides: InterviewGuide[]; cheatSheet: CheatSheet; subject?: string };

export default function InterviewNotes({ notes, topics, guides, cheatSheet, subject = "TypeScript" }: Props) {
  const count = notes.length;
  const topicIds = useMemo(() => topics.map(topic => topic.id), [topics]);
  const guideIds = useMemo(() => guides.map(guide => guide.id), [guides]);
  const [route, setRoute] = useState<NotesRoute>(null);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setRoute(routeFromHash(window.location.hash, count, topicIds, guideIds));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [count, topicIds, guideIds]);

  const go = useCallback((next: NotesRoute) => {
    setTyped("");
    window.location.hash = hashForRoute(next);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);
  const openSearch = useCallback((text = "") => {
    // Mount and focus the search before the next keystroke arrives.
    flushSync(() => {
      go(null);
      setQuery(text);
    });
    searchRef.current?.focus();
  }, [go]);

  const typedNote = typed ? notes.find(note => note.number === Number(typed)) : undefined;
  useEffect(() => {
    if (typed && isUnambiguousNoteNumber(typed, count)) go({ kind: "note", number: Number(typed) });
  }, [typed, count, go]);
  const press = useCallback((digit: string) => setTyped(prev => (prev + digit).replace(/^0+/, "").slice(0, 2)), []);
  const back = useCallback(() => setTyped(prev => prev.slice(0, -1)), []);

  const results = useMemo(() => searchNotes(query, topics, guides), [query, topics, guides]);

  // What the current route shows, and its neighbors for the arrow keys.
  const view = useMemo(() => {
    if (route?.kind === "note") {
      const note = notes.find(item => item.number === route.number);
      if (!note) return null;
      const prev = notes.find(item => item.number === note.number - 1);
      const next = notes.find(item => item.number === note.number + 1);
      return { target: note.opens, badge: note.number, prev: prev && { kind: "note" as const, number: prev.number }, next: next && { kind: "note" as const, number: next.number } };
    }
    if (route?.kind === "topic") {
      const topic = topics.find(item => item.id === route.id);
      const siblings = guides.find(guide => guide.id === topic?.guide)?.topics ?? [];
      const index = siblings.indexOf(route.id);
      const at = (i: number) => siblings[i] ? { kind: "topic" as const, id: siblings[i] } : undefined;
      return { target: { kind: "topic" as const, id: route.id }, badge: undefined, prev: at(index - 1), next: at(index + 1) };
    }
    if (route?.kind === "guide") {
      const index = guideIds.indexOf(route.id);
      const at = (i: number) => guideIds[i] ? { kind: "guide" as const, id: guideIds[i] } : undefined;
      return { target: { kind: "guide" as const, id: route.id }, badge: undefined, prev: at(index - 1), next: at(index + 1) };
    }
    return null;
  }, [route, notes, topics, guides, guideIds]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const inField = event.target instanceof HTMLInputElement;
      if (event.key === "Escape") {
        if (typed) setTyped("");
        else if (route === null && query) setQuery("");
        else go(null);
        return;
      }
      if (inField) return;
      if (event.key === "*") { event.preventDefault(); go({ kind: "cheat" }); return; }
      if (event.key === "/") { event.preventDefault(); openSearch(); return; }
      if (/^\d$/.test(event.key)) { event.preventDefault(); press(event.key); return; }
      if (event.key === "Backspace" && typed) { event.preventDefault(); back(); return; }
      if (event.key === "Enter" && typedNote) { go({ kind: "note", number: typedNote.number }); return; }
      if (/^[a-z]$/i.test(event.key)) { event.preventDefault(); openSearch(event.key); return; }
      if (event.key === "ArrowLeft" && view?.prev) go(view.prev);
      if (event.key === "ArrowRight" && view?.next) go(view.next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typed, typedNote, query, route, view, go, openSearch, press, back]);

  const typedHint = !typed ? null : typedNote ? typedNote.title : `No note ${typed}. Notes run 1 to ${count}.`;
  const jump = typed ? <p className="inotes-jump" role="status">Go to {typed}{typedHint ? ` · ${typedHint}` : ""}</p> : null;
  const guideTitle = (id: string) => guides.find(guide => guide.id === id)?.title ?? "";
  const navButtons = (prevLabel: string, nextLabel: string) => (
    <nav className="inotes-nav" aria-label="Notes navigation">
      <button type="button" onClick={() => view?.prev && go(view.prev)} disabled={!view?.prev} aria-label={prevLabel}><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => openSearch()} aria-label="Search notes"><Search size={20} /></button>
      <button type="button" onClick={() => go({ kind: "cheat" })} aria-label="Cheat sheet"><Asterisk size={20} /></button>
      <button type="button" onClick={() => view?.next && go(view.next)} disabled={!view?.next} aria-label={nextLabel}><ChevronRight size={22} /></button>
    </nav>
  );

  if (route?.kind === "cheat") {
    return (
      <main className="inotes inotes-guide-page inotes-cheat">
        <Header icon={<Asterisk size={26} />} eyebrow="Everything on one page" title={cheatSheet.title}
          nav={<nav className="inotes-nav" aria-label="Notes navigation">
            <button type="button" onClick={() => openSearch()} aria-label="Search notes"><Search size={20} /></button>
            <button type="button" className="inotes-all" onClick={() => go(null)}>All notes</button>
          </nav>} />
        {jump}
        <p className="inotes-summary">{cheatSheet.summary}</p>
        <GuideSections sections={cheatSheet.sections} />
        <GuideLinks guides={guides} onOpen={id => go({ kind: "guide", id })} />
      </main>
    );
  }

  const topic = view?.target.kind === "topic" ? topics.find(item => item.id === view.target.id) : undefined;
  if (view && topic) {
    return (
      <main className="inotes inotes-topic-page">
        <Header icon={view.badge ?? <Code2 size={24} />} eyebrow={view.badge ? `Note ${view.badge} · ${guideTitle(topic.guide)}` : guideTitle(topic.guide)}
          title={topic.title} nav={navButtons(view.badge ? "Previous note" : "Previous topic", view.badge ? "Next note" : "Next topic")} />
        {jump}
        <div className="inotes-summary-row">
          <p className="inotes-summary">{topic.summary}</p>
          <button type="button" className="inotes-guide-link" onClick={() => go({ kind: "guide", id: topic.guide })}><BookOpen size={18} /> {guideTitle(topic.guide)}</button>
        </div>
        {topic.code.map((block, index) => <CodeBlock key={index} block={block} />)}
        <div className="inotes-topic-lists">
          <NoteList title="Reach for it when" items={topic.useWhen} />
          <NoteList title={topic.code.length ? "Tips" : "Details"} items={topic.tips} />
          <NoteList title="Watch out" items={topic.watchOut} tone="warn" />
        </div>
        {topic.say && <blockquote className="inotes-say"><span>Say it</span>{topic.say}</blockquote>}
      </main>
    );
  }

  const guide = view?.target.kind === "guide" ? guides.find(item => item.id === view.target.id) : undefined;
  if (view && guide) {
    return (
      <main className="inotes inotes-guide-page">
        <Header icon={view.badge ?? <BookOpen size={24} />} eyebrow={view.badge ? `Note ${view.badge} · Guide` : "Guide"}
          title={guide.title} nav={navButtons(view.badge ? "Previous note" : "Previous guide", view.badge ? "Next note" : "Next guide")} />
        {jump}
        <p className="inotes-summary">{guide.summary}</p>
        <GuideSections sections={guide.sections} />
        <section className="inotes-topic-cards" aria-label="Topics in this guide">
          <h2>Topics in this guide</h2>
          <ul>
            {guide.topics.map(id => {
              const item = topics.find(t => t.id === id);
              return item && (
                <li key={id}>
                  <button type="button" onClick={() => go({ kind: "topic", id })}>
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    );
  }

  return (
    <main className="inotes inotes-home">
      <header className="inotes-home-head">
        <div>
          <p className="inotes-eyebrow">Interview notes · {subject}</p>
          <h1>Find a note</h1>
          <a href={subject === "System design" ? "/notes" : "/notes?set=system-design"}>{subject === "System design" ? "TypeScript notes" : "System design notes"}</a>
        </div>
        <button type="button" className="inotes-cheat-button" onClick={() => go({ kind: "cheat" })}><Asterisk size={20} /> Cheat sheet</button>
      </header>
      <label className="inotes-search">
        <Search size={22} aria-hidden="true" />
        <span className="sr-only">Search notes</span>
        <input ref={searchRef} id="notes-search" type="search" value={query} autoComplete="off" spellCheck={false}
          placeholder={subject === "System design" ? "Search: cache, queues, storage, retries…" : "Search: closure, two sum, fetch, unknown…"}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && results[0]) go({ kind: results[0].kind, id: results[0].id });
          }} />
      </label>
      {query.trim() ? (
        <section className="inotes-results" aria-label="Search results" aria-live="polite">
          {results.length === 0 && <p className="inotes-hint inotes-hint-miss">No match for “{query}”. Try a shorter word, or open the cheat sheet with *.</p>}
          <ul>
            {results.map(result => (
              <li key={`${result.kind}-${result.id}`}>
                <button type="button" onClick={() => go({ kind: result.kind, id: result.id })}>
                  <span className="inotes-result-kind">{result.kind === "guide" ? "Guide" : guideTitle(topics.find(t => t.id === result.id)?.guide ?? "")}</span>
                  <strong>{result.title}</strong>
                  <span>{result.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="inotes-pad">
          <section className="inotes-entry" aria-label="Open a printed note by number">
            <h2>Printed note number</h2>
            <div className="inotes-display" aria-live="polite">
              <span className="inotes-circle inotes-circle-big">{typed || "#"}</span>
              <span className={typed && !typedNote ? "inotes-hint inotes-hint-miss" : "inotes-hint"}>{typedHint ?? "2 to 9 open right away; 1 waits for 10"}</span>
            </div>
            <div className="inotes-keys">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
                <button key={digit} type="button" onClick={() => press(digit)}>{digit}</button>
              ))}
              <button type="button" className="inotes-key-quiet" onClick={() => setTyped("")}>Clear</button>
              <button type="button" onClick={() => press("0")}>0</button>
              <button type="button" className="inotes-key-quiet" onClick={back} aria-label="Delete last digit"><Delete size={24} /></button>
            </div>
            <button type="button" className="inotes-open" disabled={!typedNote} onClick={() => typedNote && go({ kind: "note", number: typedNote.number })}>
              {typedNote ? `Open ${typedNote.number}` : "Open"}
            </button>
          </section>
          <div className="inotes-browse">
            <GuideLinks guides={guides} onOpen={id => go({ kind: "guide", id })} />
            <section className="inotes-index" aria-label="Printed notes">
              <h2>Printed notes</h2>
              <ul>
                {notes.map(note => (
                  <li key={note.number}>
                    <button type="button" onClick={() => go({ kind: "note", number: note.number })}>
                      <span className="inotes-circle inotes-circle-small">{note.number}</span>
                      <span className="inotes-index-title">{note.title}</span>
                      <span className="inotes-index-lang">{note.opens.kind === "guide" ? "guide" : guideTitle(topics.find(t => t.id === note.opens.id)?.guide ?? "")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
      <p className="inotes-keys-help">Keys: digits open a printed note · letters search · * cheat sheet · ← → next · Esc back</p>
    </main>
  );
}

function Header({ icon, eyebrow, title, nav }: { icon: ReactNode; eyebrow: string; title: string; nav: ReactNode }) {
  return (
    <header className="inotes-bar">
      <span className={typeof icon === "number" ? "inotes-circle" : "inotes-circle inotes-circle-icon"} aria-hidden="true">{icon}</span>
      <div className="inotes-heading">
        <p className="inotes-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {nav}
    </header>
  );
}

function GuideLinks({ guides, onOpen }: { guides: InterviewGuide[]; onOpen: (id: string) => void }) {
  return (
    <section className="inotes-guides" aria-label="Guides">
      <h2>Guides</h2>
      <ul>
        {guides.map(item => (
          <li key={item.id}>
            <button type="button" onClick={() => onOpen(item.id)}>
              <BookOpen size={20} aria-hidden="true" />
              <span className="inotes-guide-title">{item.title}</span>
              <span className="inotes-guide-range">{item.topics.length} topics</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GuideSections({ sections }: { sections: GuideSection[] }) {
  // Consecutive bullet sections sit side by side so short lists don't each take a full row.
  const groups: GuideSection[][] = [];
  for (const section of sections) {
    const last = groups.at(-1);
    if (section.kind === "points" && last?.[0]?.kind === "points") last.push(section);
    else groups.push([section]);
  }
  return (
    <div className="inotes-sections">
      {groups.map((group, index) => (
        <Fragment key={index}>
          {group[0].kind === "points"
            ? <div className="inotes-points">{group.map(section => section.kind === "points" && <NoteList key={section.title} title={section.title} items={section.items} tone={section.tone} />)}</div>
            : <GuideTable section={group[0]} />}
        </Fragment>
      ))}
    </div>
  );
}

function GuideTable({ section }: { section: Extract<GuideSection, { kind: "table" }> }) {
  return (
    <section className="inotes-block">
      <h2>{section.title}</h2>
      <div className="inotes-table-wrap">
        <table className="inotes-table">
          <thead><tr>{section.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
          <tbody>
            {section.rows.map(row => (
              <tr key={row[0]}>
                {row.map((cell, index) => <td key={index}>{section.code[index] ? <InlineCode source={cell} /> : cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.note && <p className="inotes-block-note">{section.note}</p>}
    </section>
  );
}

function InlineCode({ source }: { source: string }) {
  const tokens = useMemo(() => highlightCode(source), [source]);
  return <code className="inotes-inline">{tokens.map((token, index) => <span key={index} className={`tok-${token.kind}`}>{token.text}</span>)}</code>;
}

function CodeBlock({ block }: { block: TopicCode }) {
  const tokens = useMemo(() => highlightCode(block.source), [block]);
  return (
    <figure className="inotes-codeblock">
      <figcaption>{block.caption ?? "TypeScript"}</figcaption>
      <pre><code>{tokens.map((token, index) => <span key={index} className={`tok-${token.kind}`}>{token.text}</span>)}</code></pre>
    </figure>
  );
}

function NoteList({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  if (!items.length) return null;
  return (
    <div className={tone === "warn" ? "inotes-list inotes-list-warn" : "inotes-list"}>
      <h2>{title}</h2>
      <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
