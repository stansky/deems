import assert from "node:assert/strict";
import { test } from "node:test";
import { guideForNote, interviewGuides } from "../src/data/interview-guides";
import { interviewNoteByNumber, interviewNotes } from "../src/data/interview-notes";
import { highlightCode } from "../src/lib/highlight-code";
import { hashForRoute, isUnambiguousNoteNumber, noteNumberFromHash, routeFromHash } from "../src/lib/note-number";

test("guides cover every note exactly once, in order, with routable ids", () => {
  const covered = interviewGuides.flatMap(guide =>
    Array.from({ length: guide.lastNote - guide.firstNote + 1 }, (_, index) => guide.firstNote + index));
  assert.deepEqual(covered, interviewNotes.map(note => note.number));
  for (const guide of interviewGuides) {
    assert.match(guide.id, /^[a-z][a-z-]*$/, "guide ids must not look like note numbers");
    for (const section of guide.sections) {
      if (section.kind === "table") {
        assert.equal(section.languages.length, section.headers.length, `${guide.id}: ${section.title}`);
        for (const row of section.rows) assert.equal(row.length, section.headers.length, `${guide.id}: ${row[0]}`);
      }
      if (section.kind === "compare") {
        assert.equal(highlightCode(section.python, "python").map(token => token.text).join(""), section.python);
        assert.equal(highlightCode(section.javascript, "javascript").map(token => token.text).join(""), section.javascript);
      }
    }
  }
  assert.equal(guideForNote(1)?.id, "loops");
  assert.equal(guideForNote(17)?.id, "collections");
});

test("hash routes open notes, guides, or the number pad", () => {
  const ids = interviewGuides.map(guide => guide.id);
  assert.deepEqual(routeFromHash("#12", 39, ids), { kind: "note", number: 12 });
  assert.deepEqual(routeFromHash("#loops", 39, ids), { kind: "guide", id: "loops" });
  assert.equal(routeFromHash("#nope", 39, ids), null);
  assert.equal(routeFromHash("", 39, ids), null);
  assert.equal(hashForRoute({ kind: "guide", id: "traps" }), "traps");
  assert.equal(hashForRoute({ kind: "note", number: 5 }), "5");
  assert.equal(hashForRoute(null), "");
});

test("interview notes are numbered 1 to n with unique ids and matching code languages", () => {
  assert.deepEqual(interviewNotes.map(note => note.number), interviewNotes.map((_, index) => index + 1));
  assert.equal(new Set(interviewNotes.map(note => note.id)).size, interviewNotes.length);
  for (const note of interviewNotes) {
    assert.ok(note.title && note.summary && note.tips.length, `note ${note.number} needs a title, summary and tips`);
    for (const block of note.code) {
      if (note.language !== "any") assert.equal(block.language, note.language, `note ${note.number} mixes languages`);
    }
  }
  assert.equal(interviewNoteByNumber(17)?.id, "two-sum-py");
  assert.equal(interviewNoteByNumber(interviewNotes.length + 1), undefined);
});

test("highlighting keeps every snippet's text exactly", () => {
  for (const note of interviewNotes) {
    for (const block of note.code) {
      assert.equal(highlightCode(block.source, block.language).map(token => token.text).join(""), block.source);
    }
  }
});

test("highlighting marks keywords, definitions, strings, comments and properties", () => {
  const python = highlightCode('def fib(n):\n    return "x"  # done', "python");
  assert.deepEqual(python.filter(token => token.kind !== "plain").map(token => [token.kind, token.text]), [
    ["keyword", "def"], ["definition", "fib"], ["keyword", "return"], ["string", '"x"'], ["comment", "# done"],
  ]);
  const js = highlightCode("const m = new Map(); m.get(1); // ok", "javascript");
  const kinds = Object.fromEntries(js.filter(token => token.kind !== "plain").map(token => [token.text, token.kind]));
  assert.equal(kinds.const, "keyword");
  assert.equal(kinds.Map, "builtin");
  assert.equal(kinds["1"], "number");
  assert.equal(kinds.get, undefined, "a property after a dot stays plain");
  assert.equal(kinds["// ok"], "comment");
});

test("note numbers open from the hash and as soon as typing is unambiguous", () => {
  assert.equal(noteNumberFromHash("#12", 39), 12);
  assert.equal(noteNumberFromHash("#40", 39), null);
  assert.equal(noteNumberFromHash("#1.5", 39), null);
  assert.equal(noteNumberFromHash("", 39), null);
  assert.equal(isUnambiguousNoteNumber("3", 39), false, "30 to 39 still possible");
  assert.equal(isUnambiguousNoteNumber("4", 39), true);
  assert.equal(isUnambiguousNoteNumber("12", 39), true);
  assert.equal(isUnambiguousNoteNumber("45", 39), false);
});
