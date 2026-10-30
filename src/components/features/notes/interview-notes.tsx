"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Delete, Hash } from "lucide-react";
import type { InterviewNote, InterviewNoteCode, NoteLanguage } from "@/data/interview-notes";
import type { GuideSection, InterviewGuide } from "@/data/interview-guides";
import { highlightCode } from "@/lib/highlight-code";
import { hashForRoute, isUnambiguousNoteNumber, routeFromHash, type NotesRoute } from "@/lib/note-number";

const languageLabel = { python: "Python", javascript: "JavaScript", any: "Any language" } as const;

export default function InterviewNotes({ notes, guides }: { notes: InterviewNote[]; guides: InterviewGuide[] }) {
  const count = notes.length;
  const guideIds = useMemo(() => guides.map(guide => guide.id), [guides]);
  const [route, setRoute] = useState<NotesRoute>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const sync = () => setRoute(routeFromHash(window.location.hash, count, guideIds));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [count, guideIds]);

  const go = useCallback((next: NotesRoute) => {
    setTyped("");
    window.location.hash = hashForRoute(next);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);
  const openNote = useCallback((number: number) => go({ kind: "note", number }), [go]);

  const typedValue = Number(typed);
  const typedNote = typed ? notes.find(note => note.number === typedValue) : undefined;

  useEffect(() => {
    if (typed && isUnambiguousNoteNumber(typed, count)) openNote(Number(typed));
  }, [typed, count, openNote]);

  const press = useCallback((digit: string) => setTyped(prev => (prev + digit).replace(/^0+/, "").slice(0, 2)), []);
  const back = useCallback(() => setTyped(prev => prev.slice(0, -1)), []);

  const note = route?.kind === "note" ? notes.find(item => item.number === route.number) : undefined;
  const guideIndex = route?.kind === "guide" ? guides.findIndex(item => item.id === route.id) : -1;
  const guide = guideIndex >= 0 ? guides[guideIndex] : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/.test(event.key)) { press(event.key); event.preventDefault(); return; }
      if (event.key === "Backspace") { back(); event.preventDefault(); return; }
      if (event.key === "Enter" && typedNote) { openNote(typedNote.number); return; }
      if (event.key === "Escape") { if (typed) setTyped(""); else go(null); return; }
      const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (!step) return;
      if (note && notes.some(item => item.number === note.number + step)) openNote(note.number + step);
      if (guide && guides[guideIndex + step]) go({ kind: "guide", id: guides[guideIndex + step].id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back, go, openNote, typed, typedNote, note, notes, guide, guides, guideIndex]);

  const typedHint = !typed ? null : typedNote ? typedNote.title : `No note ${typed}. Notes run 1 to ${count}.`;
  const jump = typed ? <p className="inotes-jump" role="status">Go to {typed}{typedHint ? ` · ${typedHint}` : ""}</p> : null;

  if (note) {
    const home = guides.find(item => note.number >= item.firstNote && note.number <= item.lastNote);
    return (
      <main className="inotes inotes-note">
        <header className="inotes-bar">
          <span className="inotes-circle" aria-hidden="true">{note.number}</span>
          <div className="inotes-heading">
            <p className="inotes-eyebrow">{note.topic} · {languageLabel[note.language]}</p>
            <h1>{note.title}</h1>
          </div>
          <nav className="inotes-nav" aria-label="Notes">
            <button type="button" onClick={() => openNote(note.number - 1)} disabled={note.number === 1} aria-label="Previous note"><ChevronLeft size={22} /></button>
            <button type="button" className="inotes-all" onClick={() => go(null)}><Hash size={18} /> <span>All notes</span></button>
            <button type="button" onClick={() => openNote(note.number + 1)} disabled={note.number === count} aria-label="Next note"><ChevronRight size={22} /></button>
          </nav>
        </header>
        {jump}
        <div className="inotes-summary-row">
          <p className="inotes-summary">{note.summary}</p>
          {home && <button type="button" className="inotes-guide-link" onClick={() => go({ kind: "guide", id: home.id })}><BookOpen size={18} /> Guide: {home.title}</button>}
        </div>
        <div className={note.code.length ? "inotes-columns" : "inotes-columns inotes-no-code"}>
          {note.code.length > 0 && (
            <section className="inotes-code" aria-label="Code">
              {note.code.map((block, index) => <CodeBlock key={index} block={block} />)}
            </section>
          )}
          <section className="inotes-guide">
            <NoteList title="Reach for it when" items={note.useWhen} />
            <NoteList title={note.code.length ? "Tips" : "Details"} items={note.tips} />
            <NoteList title="Watch out" items={note.watchOut} tone="warn" />
            {note.say && <blockquote className="inotes-say"><span>Say it</span>{note.say}</blockquote>}
          </section>
        </div>
      </main>
    );
  }

  if (guide) {
    const previous = guides[guideIndex - 1];
    const next = guides[guideIndex + 1];
    const covered = notes.filter(item => item.number >= guide.firstNote && item.number <= guide.lastNote);
    return (
      <main className="inotes inotes-guide-page">
        <header className="inotes-bar">
          <span className="inotes-circle inotes-circle-guide" aria-hidden="true"><BookOpen size={24} /></span>
          <div className="inotes-heading">
            <p className="inotes-eyebrow">Guide · notes {guide.firstNote} to {guide.lastNote}</p>
            <h1>{guide.title}</h1>
          </div>
          <nav className="inotes-nav" aria-label="Guides">
            <button type="button" onClick={() => previous && go({ kind: "guide", id: previous.id })} disabled={!previous} aria-label="Previous guide"><ChevronLeft size={22} /></button>
            <button type="button" className="inotes-all" onClick={() => go(null)}><Hash size={18} /> <span>All notes</span></button>
            <button type="button" onClick={() => next && go({ kind: "guide", id: next.id })} disabled={!next} aria-label="Next guide"><ChevronRight size={22} /></button>
          </nav>
        </header>
        {jump}
        <p className="inotes-summary">{guide.summary}</p>
        <GuideSections sections={guide.sections} />
        <nav className="inotes-covered" aria-label="Notes in this guide">
          <h2>Notes in this guide</h2>
          <ul>
            {covered.map(item => (
              <li key={item.number}>
                <button type="button" onClick={() => openNote(item.number)}>
                  <span className="inotes-circle inotes-circle-small">{item.number}</span>
                  {item.title}<small>{languageLabel[item.language]}</small>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    );
  }

  return (
    <main className="inotes inotes-pad">
      <section className="inotes-entry" aria-label="Open a note by number">
        <p className="inotes-eyebrow">Interview notes</p>
        <h1>Type a note number</h1>
        <p className="inotes-lede">Use the number in the circle on each printed sticky note. 1 to 3 wait for a second digit; press Open for 1, 2, or 3 alone.</p>
        <div className="inotes-display" aria-live="polite">
          <span className="inotes-circle inotes-circle-big">{typed || "#"}</span>
          <span className={typed && !typedNote ? "inotes-hint inotes-hint-miss" : "inotes-hint"}>{typedHint ?? "Waiting for a number"}</span>
        </div>
        <div className="inotes-keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
            <button key={digit} type="button" onClick={() => press(digit)}>{digit}</button>
          ))}
          <button type="button" className="inotes-key-quiet" onClick={() => setTyped("")}>Clear</button>
          <button type="button" onClick={() => press("0")}>0</button>
          <button type="button" className="inotes-key-quiet" onClick={back} aria-label="Delete last digit"><Delete size={24} /></button>
        </div>
        <button type="button" className="inotes-open" disabled={!typedNote} onClick={() => typedNote && openNote(typedNote.number)}>
          {typedNote ? `Open ${typedNote.number}` : "Open"}
        </button>
      </section>
      <div className="inotes-browse">
        <section className="inotes-guides" aria-label="Guides">
          <h2>Guides</h2>
          <ul>
            {guides.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => go({ kind: "guide", id: item.id })}>
                  <BookOpen size={20} aria-hidden="true" />
                  <span className="inotes-guide-title">{item.title}</span>
                  <span className="inotes-guide-range">notes {item.firstNote} to {item.lastNote}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <NoteIndex notes={notes} onOpen={openNote} />
      </div>
    </main>
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
            : <GuideBlock section={group[0]} />}
        </Fragment>
      ))}
    </div>
  );
}

function GuideBlock({ section }: { section: GuideSection }) {
  if (section.kind === "table") {
    return (
      <section className="inotes-block">
        <h2>{section.title}</h2>
        <div className="inotes-table-wrap">
          <table className="inotes-table">
            <thead><tr>{section.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
            <tbody>
              {section.rows.map(row => (
                <tr key={row[0]}>
                  {row.map((cell, index) => {
                    const language = section.languages[index];
                    return <td key={index}>{language ? <InlineCode source={cell} language={language} /> : cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.note && <p className="inotes-block-note">{section.note}</p>}
      </section>
    );
  }
  if (section.kind === "compare") {
    return (
      <section className="inotes-block">
        <h2>{section.title}</h2>
        <div className="inotes-compare">
          <CodeBlock block={{ language: "python", source: section.python }} />
          <CodeBlock block={{ language: "javascript", source: section.javascript }} />
        </div>
        {section.note && <p className="inotes-block-note">{section.note}</p>}
      </section>
    );
  }
  return <NoteList title={section.title} items={section.items} tone={section.tone} />;
}

function InlineCode({ source, language }: { source: string; language: NoteLanguage }) {
  const tokens = useMemo(() => highlightCode(source, language), [source, language]);
  return <code className="inotes-inline">{tokens.map((token, index) => <span key={index} className={`tok-${token.kind}`}>{token.text}</span>)}</code>;
}

function CodeBlock({ block }: { block: InterviewNoteCode }) {
  const tokens = useMemo(() => highlightCode(block.source, block.language), [block]);
  return (
    <figure className="inotes-codeblock">
      <figcaption>{languageLabel[block.language]}{block.caption ? ` · ${block.caption}` : ""}</figcaption>
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

function NoteIndex({ notes, onOpen }: { notes: InterviewNote[]; onOpen: (value: number) => void }) {
  const topics = [...new Set(notes.map(note => note.topic))];
  return (
    <section className="inotes-index" aria-label="All notes">
      {topics.map(topic => (
        <div key={topic} className="inotes-topic">
          <h2>{topic}</h2>
          <ul>
            {notes.filter(note => note.topic === topic).map(note => (
              <li key={note.number}>
                <button type="button" onClick={() => onOpen(note.number)}>
                  <span className="inotes-circle inotes-circle-small">{note.number}</span>
                  <span className="inotes-index-title">{note.title}</span>
                  <span className="inotes-index-lang">{languageLabel[note.language]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
