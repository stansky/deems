// The ten printed sticky notes. The number in each note's circle opens /notes#<number>,
// which shows the topic or guide it points to. text and size are what gets printed.
export type StickyTarget = { kind: "topic" | "guide"; id: string };

export type StickyNote = {
  number: number;
  title: string;
  opens: StickyTarget;
  size: 80 | 104;
  text: string;
};

export const stickyNotes: StickyNote[] = [
  {
    number: 1, title: "Five steps", opens: { kind: "topic", id: "five-steps" }, size: 80,
    text: "**5 steps, out loud**\n1. Repeat task + 1 example\n2. Ask about edge cases\n3. Simple way + its cost\n4. Remove repeated work\n5. Walk the example, test edges\n\nStuck? Say the brute force.\nType the signature first.",
  },
  {
    number: 2, title: "Which loop?", opens: { kind: "topic", id: "pick-loop" }, size: 80,
    text: "**Which loop?**\nHave the items? → for...of\nNeed the index? → for (let i…)\nStop when it changes? → while\nTransform all? → map\nKeep some? → filter\nFirst match? → find\nAny match? → some\nOne value? → reduce or a loop\nStop early? Never forEach\nawait inside? for...of",
  },
  {
    number: 3, title: "Which collection?", opens: { kind: "topic", id: "pick-collection" }, size: 104,
    text: "**Which collection?**\nIn order, by index → Array\nLook up by key → Map\nFixed string keys → object /\n  Record<string, T>\nSeen it? unique? → Set\nPair as a key → `${r},${c}`\nStack → push / pop\nQueue → array + head index\n\nMap.get / Set.has → avg O(1)\narray.includes → O(n)\n.length on arrays\n.size on Map and Set",
  },
  {
    number: 4, title: "How fast?", opens: { kind: "topic", id: "big-o" }, size: 104,
    text: "**How fast?**\nO(1): a[i], pop\nAvg O(1): map.get, set.has\npush: amortized O(1)\nO(log n): binary search\nO(n): one loop, includes,\n  indexOf, shift, copy\nO(n log n): sort\nO(n²): loop inside a loop\n  → replace the inner search\n    with a Map or Set\nSay time AND space:\n\"O(n) time, O(n) space\"\nn up to 10⁵? Aim for\n  O(n log n) or better",
  },
  {
    number: 5, title: "Task words → pattern", opens: { kind: "guide", id: "patterns" }, size: 80,
    text: "**Task words → pattern**\ncount, dupes → Map, Set\npair sums to target → Map\nsorted, both ends → 2 pointers\nk in a row, longest run\n  → sliding window\nbrackets, undo → stack\nfewest steps → BFS queue\nregions, all paths → DFS\nranges, meetings → sort+merge\nsorted + find → binary search",
  },
  {
    number: 6, title: "JS quick answers", opens: { kind: "guide", id: "js" }, size: 104,
    text: "**JS quick answers**\nconst default; let to reassign\n=== always; ?? keeps 0\n[] and {} are truthy\nClosure: fn + captured vars\nthis: set by the call;\n  arrows use outer this\nOrder: sync → microtasks\n  (.then, await) → timers\nSpread copies one level;\n  structuredClone is deep\nsort / splice mutate;\n  toSorted copies",
  },
  {
    number: 7, title: "async / await", opens: { kind: "topic", id: "js-async" }, size: 104,
    text: "**async / await**\nasync fn → returns a Promise\nawait → pause until settled\ntry { await x } catch (e) { }\n\nRun in parallel:\nconst [a, b] = await Promise.all([\n  getA(), getB(),\n]);\nall → fails if any fails\nallSettled → every result\nrace → first to settle\nany → first to succeed\n\nForgot await? You get a Promise.\nawait in forEach doesn't wait.",
  },
  {
    number: 8, title: "TS quick answers", opens: { kind: "guide", id: "ts" }, size: 104,
    text: "**TS quick answers**\ninterface / type: shapes\ntype: unions, tuples\nUnion + kind → switch narrows\n<T>: keeps in/out types linked\nPartial Pick Omit Record\nunknown → guard before use\nany → no checks. Avoid.\nas / ! → no runtime check\nas const → literal types\nsatisfies → check, keep type\nx is T → a type guard",
  },
  {
    number: 9, title: "Fix type errors", opens: { kind: "topic", id: "ts-errors" }, size: 104,
    text: "**Fix type errors**\npossibly undefined\n  → guard: if (x == null) return\nimplicitly any\n  → annotate the parameter\ncan't index with string\n  → Record<K, V> or keyof\nstring not assignable to \"a\"\n  → as const, or a union type\nproperty not on type\n  → narrow the union first\nObject.keys gives string[]\n  → keyof cast: known keys only\nLast resort: x! or as T",
  },
  {
    number: 10, title: "Fetch, check, transform", opens: { kind: "guide", id: "practical" }, size: 104,
    text: "**Fetch, check, transform**\nconst res = await fetch(url, {\n  signal:\n    AbortSignal.timeout(5000)});\nif (!res.ok) throw new\n  Error(`HTTP ${res.status}`);\nconst data: unknown =\n  await res.json();\nif (!isTodos(data)) throw …\nThen: filter → Map totals\n  → toSorted\nMany calls: Promise.all\nfetch doesn't throw on 404!",
  },
];
