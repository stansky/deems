import assert from "node:assert/strict";
import { test } from "node:test";
import { interviewNoteByNumber, interviewNotes } from "../src/data/interview-notes";
import { highlightCode } from "../src/lib/highlight-code";
import { isUnambiguousNoteNumber, noteNumberFromHash } from "../src/lib/note-number";

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
