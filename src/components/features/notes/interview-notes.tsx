"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Delete, Hash } from "lucide-react";
import type { InterviewNote, InterviewNoteCode } from "@/data/interview-notes";
import { highlightCode } from "@/lib/highlight-code";
import { isUnambiguousNoteNumber, noteNumberFromHash } from "@/lib/note-number";

const languageLabel = { python: "Python", javascript: "JavaScript", any: "Any language" } as const;

export default function InterviewNotes({ notes }: { notes: InterviewNote[] }) {
  const count = notes.length;
  const [current, setCurrent] = useState<number | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const sync = () => setCurrent(noteNumberFromHash(window.location.hash, count));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [count]);

  const open = useCallback((value: number | null) => {
    setTyped("");
    window.location.hash = value === null ? "" : String(value);
    setCurrent(value);
    window.scrollTo(0, 0);
  }, []);

  const typedValue = Number(typed);
  const typedNote = typed ? notes.find(note => note.number === typedValue) : undefined;

  useEffect(() => {
    if (typed && isUnambiguousNoteNumber(typed, count)) open(Number(typed));
  }, [typed, count, open]);

  const press = useCallback((digit: string) => setTyped(prev => (prev + digit).replace(/^0+/, "").slice(0, 2)), []);
  const back = useCallback(() => setTyped(prev => prev.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/.test(event.key)) { press(event.key); event.preventDefault(); return; }
      if (event.key === "Backspace") { back(); event.preventDefault(); return; }
      if (event.key === "Enter" && typedNote) { open(typedNote.number); return; }
      if (event.key === "Escape") { if (typed) setTyped(""); else open(null); return; }
      if (current !== null && event.key === "ArrowLeft" && current > 1) open(current - 1);
      if (current !== null && event.key === "ArrowRight" && current < count) open(current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back, open, typed, typedNote, current, count]);

  const note = current === null ? undefined : notes.find(item => item.number === current);
  const typedHint = !typed ? null : typedNote ? typedNote.title : `No note ${typed}. Notes run 1 to ${count}.`;

  if (note) {
    return (
      <main className="inotes inotes-note">
        <header className="inotes-bar">
          <span className="inotes-circle" aria-hidden="true">{note.number}</span>
          <div className="inotes-heading">
            <p className="inotes-eyebrow">{note.topic} · {languageLabel[note.language]}</p>
            <h1>{note.title}</h1>
          </div>
          <nav className="inotes-nav" aria-label="Notes">
            <button type="button" onClick={() => open(note.number - 1)} disabled={note.number === 1} aria-label="Previous note"><ChevronLeft size={22} /></button>
            <button type="button" className="inotes-all" onClick={() => open(null)}><Hash size={18} /> <span>All notes</span></button>
            <button type="button" onClick={() => open(note.number + 1)} disabled={note.number === count} aria-label="Next note"><ChevronRight size={22} /></button>
          </nav>
        </header>
        {typed && <p className="inotes-jump" role="status">Go to {typed}{typedHint ? ` · ${typedHint}` : ""}</p>}
        <p className="inotes-summary">{note.summary}</p>
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
        <button type="button" className="inotes-open" disabled={!typedNote} onClick={() => typedNote && open(typedNote.number)}>
          {typedNote ? `Open ${typedNote.number}` : "Open"}
        </button>
      </section>
      <NoteIndex notes={notes} onOpen={open} />
    </main>
  );
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
