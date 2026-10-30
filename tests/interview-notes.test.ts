import assert from "node:assert/strict";
import { test } from "node:test";
import { cheatSheet, interviewGuides } from "../src/data/interview-guides";
import { stickyNotes } from "../src/data/interview-notes";
import { interviewTopics, topicById } from "../src/data/interview-topics";
import { highlightCode } from "../src/lib/highlight-code";
import { hashForRoute, isUnambiguousNoteNumber, noteNumberFromHash, routeFromHash } from "../src/lib/note-number";
import { searchNotes } from "../src/lib/notes-search";

const topicIds = interviewTopics.map(topic => topic.id);
const guideIds = interviewGuides.map(guide => guide.id);

test("ten printed notes, numbered 1 to 10, each opening a real topic or guide", () => {
  assert.deepEqual(stickyNotes.map(note => note.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const note of stickyNotes) {
    const ids = note.opens.kind === "topic" ? topicIds : guideIds;
    assert.ok(ids.includes(note.opens.id), `note ${note.number} opens ${note.opens.id}`);
    assert.ok(note.text.startsWith("**"), `note ${note.number} starts with a bold label`);
    assert.ok(note.text.split("\n").length <= (note.size === 80 ? 13 : 18), `note ${note.number} fits its label`);
  }
});

test("every topic belongs to exactly one guide and ids never collide", () => {
  const listed = interviewGuides.flatMap(guide => guide.topics);
  assert.deepEqual([...listed].sort(), [...topicIds].sort());
  assert.equal(new Set(listed).size, listed.length);
  for (const topic of interviewTopics) {
    assert.ok(guideIds.includes(topic.guide));
    assert.ok(interviewGuides.find(guide => guide.id === topic.guide)?.topics.includes(topic.id));
  }
  const all = [...topicIds, ...guideIds, "cheat"];
  assert.equal(new Set(all).size, all.length);
  for (const id of all) assert.match(id, /^[a-z][a-z-]*$/, "ids must not look like note numbers");
  for (const section of [...interviewGuides.flatMap(guide => guide.sections), ...cheatSheet.sections]) {
    if (section.kind !== "table") continue;
    assert.equal(section.code.length, section.headers.length, section.title);
    for (const row of section.rows) assert.equal(row.length, section.headers.length, `${section.title}: ${row[0]}`);
  }
});

test("highlighting keeps every snippet's text and marks TypeScript syntax", () => {
  for (const topic of interviewTopics) {
    for (const block of topic.code) {
      assert.equal(highlightCode(block.source).map(token => token.text).join(""), block.source, topic.id);
    }
  }
  const tokens = highlightCode('interface User { type: string; id?: number }\nconst m = new Map<string, number>(); // ok');
  const kinds = Object.fromEntries(tokens.filter(token => token.kind !== "plain").map(token => [token.text, token.kind]));
  assert.equal(kinds.interface, "keyword");
  assert.equal(kinds.User, "definition");
  assert.equal(kinds.type, undefined, "a member named type stays plain");
  assert.equal(kinds.string, "builtin");
  assert.equal(kinds.Map, "builtin");
  assert.equal(kinds.const, "keyword");
  assert.equal(kinds["// ok"], "comment");
});

test("hash routes open notes, topics, guides, and the cheat sheet", () => {
  assert.deepEqual(routeFromHash("#3", 10, topicIds, guideIds), { kind: "note", number: 3 });
  assert.equal(routeFromHash("#11", 10, topicIds, guideIds), null);
  assert.deepEqual(routeFromHash("#two-sum", 10, topicIds, guideIds), { kind: "topic", id: "two-sum" });
  assert.deepEqual(routeFromHash("#patterns", 10, topicIds, guideIds), { kind: "guide", id: "patterns" });
  assert.deepEqual(routeFromHash("#cheat", 10, topicIds, guideIds), { kind: "cheat" });
  assert.equal(routeFromHash("", 10, topicIds, guideIds), null);
  assert.equal(routeFromHash("#%", 10, topicIds, guideIds), null);
  assert.equal(routeFromHash("#%E0%A4", 10, topicIds, guideIds), null);
  assert.equal(hashForRoute({ kind: "cheat" }), "cheat");
  assert.equal(hashForRoute({ kind: "topic", id: "bfs" }), "bfs");
  assert.equal(noteNumberFromHash("#10", 10), 10);
  assert.equal(isUnambiguousNoteNumber("1", 10), false, "1 waits for 10");
  assert.equal(isUnambiguousNoteNumber("2", 10), true);
  assert.equal(isUnambiguousNoteNumber("10", 10), true);
});

test("keyword search finds the right topic or guide first", () => {
  const top = (query: string) => searchNotes(query, interviewTopics, interviewGuides)[0]?.id;
  assert.equal(top("debounce"), "debounce");
  assert.equal(top("two sum"), "two-sum");
  assert.equal(top("closure"), "js-closures");
  assert.equal(top("unknown"), "ts-unknown");
  assert.equal(top("sliding window"), "sliding-window");
  assert.equal(top("patterns"), "patterns");
  assert.equal(topicById(top("fetch") ?? "")?.guide, "practical");
  assert.deepEqual(searchNotes("zzzz", interviewTopics, interviewGuides), []);
  assert.deepEqual(searchNotes("   ", interviewTopics, interviewGuides), []);
});
