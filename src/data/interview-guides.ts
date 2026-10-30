// Guides group the topics and lead with quick decision tables. The cheat sheet (the * key)
// collects the tables from every guide on one page.
export type GuideSection =
  | { kind: "table"; title: string; headers: string[]; code: boolean[]; rows: string[][]; note?: string }
  | { kind: "points"; title: string; items: string[]; tone?: "warn" };

export type InterviewGuide = {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  sections: GuideSection[];
};

export const interviewGuides: InterviewGuide[] = [
  {
    id: "js", title: "JavaScript basics",
    summary: "The JavaScript questions that come before the coding: scope, equality, closures, this, async, the event loop, copies, and array methods.",
    topics: ["js-scope", "js-equality", "js-closures", "js-this", "js-async", "js-event-loop", "js-copy", "js-arrays"],
    sections: [
      {
        kind: "table", title: "Quick answers",
        headers: ["Question", "Short answer", "Example"],
        code: [false, false, true],
        rows: [
          ["let, const, or var?", "const by default, let to reassign, avoid var", "const xs: number[] = []; xs.push(1);"],
          ["== or ===?", "=== never converts types", "\"1\" === 1   // false"],
          ["?? or ||?", "?? replaces only null and undefined", "0 ?? 5   // 0, but 0 || 5 is 5"],
          ["What's a closure?", "a function plus the variables it captured", "const inc = () => ++count;"],
          ["What is this?", "set by the call; arrows use the outer this", "onClick = () => this.save();"],
          ["Event loop order?", "sync code, then microtasks, then timers", "Promise.then runs before setTimeout"],
          ["Copy an object?", "spread is shallow; structuredClone is deep", "const b = structuredClone(a);"],
          ["Run requests together?", "Promise.all; allSettled to keep failures", "await Promise.all(ids.map(get));"],
          ["Which mutate?", "sort, reverse, splice, push, pop", "const s = xs.toSorted((a, b) => a - b);"],
        ],
      },
      {
        kind: "points", title: "Watch out", tone: "warn",
        items: [
          "[] and {} are truthy: check .length.",
          "await inside forEach doesn't wait: use for...of or Promise.all.",
          "A method passed as a callback loses this.",
          "sort() without a compare function sorts numbers as text.",
        ],
      },
    ],
  },
  {
    id: "ts", title: "TypeScript basics",
    summary: "Typing data, narrowing unions, generics, utility types, and the fixes for the type errors you're most likely to be asked to clean up.",
    topics: ["ts-types", "ts-narrowing", "ts-generics", "ts-utility", "ts-unknown", "ts-errors", "ts-classes"],
    sections: [
      {
        kind: "table", title: "Which tool?",
        headers: ["You need", "Use", "Example"],
        code: [false, false, true],
        rows: [
          ["An object shape", "interface or type", "interface User { id: number; name?: string }"],
          ["One of a few values", "union of literals", "type Dir = \"asc\" | \"desc\";"],
          ["Variants with different fields", "discriminated union", "{ kind: \"ok\"; value: T } | { kind: \"err\" }"],
          ["Same code for any type", "generic", "function first<T>(xs: T[]): T | undefined"],
          ["A type derived from another", "Omit, Pick, Partial", "type Safe = Omit<User, \"password\">;"],
          ["A lookup object", "Record", "const byId: Record<string, User> = {};"],
          ["Data from outside", "unknown + type guard", "function isUser(x: unknown): x is User"],
          ["Literal values", "as const / satisfies", "const dirs = [\"asc\", \"desc\"] as const;"],
        ],
      },
      {
        kind: "table", title: "Error says → fix", note: "Assertions do not check at runtime. A keyof cast needs known runtime keys.",
        headers: ["Error says", "Fix"],
        code: [false, false],
        rows: [
          ["Object is possibly undefined", "guard (if (x == null) return) or default (x ?? fallback)"],
          ["Parameter implicitly has an any type", "annotate the parameter"],
          ["Expression of type string can't be used to index", "type the object as Record<string, T>, or use keyof"],
          ["string is not assignable to \"a\" | \"b\"", "as const, or declare the variable with the union type"],
          ["Property does not exist on type A | B", "narrow first: if (\"prop\" in x), typeof, or a kind field"],
          ["Object.keys gives string[]", "(Object.keys(o) as (keyof typeof o)[])"],
        ],
      },
    ],
  },
  {
    id: "loops", title: "Loops and collections",
    summary: "Pick a loop by asking whether you have the items or only a stop condition. Pick a collection by the operation you repeat most.",
    topics: ["pick-loop", "loop-forms", "pick-collection", "count-group", "big-o", "sorting"],
    sections: [
      {
        kind: "table", title: "Which loop?", note: "Never forEach when you need to stop early or await.",
        headers: ["You need to", "Use", "TypeScript"],
        code: [false, false, true],
        rows: [
          ["Visit every item you have", "for...of", "for (const x of xs) { }"],
          ["Use the index or neighbors", "index loop", "for (let i = 1; i < xs.length; i++)"],
          ["Repeat until something changes", "while", "while (lo < hi) { }"],
          ["Make a new array from each item", "map", "xs.map(x => x * 2)"],
          ["Keep some items", "filter", "xs.filter(x => x > 0)"],
          ["Find the first match", "find, or for + return", "xs.find(x => x.id === id)"],
          ["Check any or all", "some / every", "xs.some(x => x < 0)"],
          ["Await each in order", "for...of + await", "for (const id of ids) await save(id);"],
        ],
      },
      {
        kind: "table", title: "Which collection?",
        headers: ["You need to", "Use", "TypeScript"],
        code: [false, false, true],
        rows: [
          ["Keep order, read by position", "Array", "const xs: number[] = [3, 1];"],
          ["Look up by key", "Map", "const m = new Map<string, number>();"],
          ["Check seen, dedupe", "Set", "seen.has(x); [...new Set(xs)]"],
          ["Fixed string keys", "object / Record", "const cfg: Record<string, number> = {};"],
          ["Use a pair as a key", "string key", "visited.add(`${r},${c}`);"],
          ["Count things", "Map of counts", "m.set(x, (m.get(x) ?? 0) + 1);"],
          ["Stack / queue", "array (+ head index)", "st.push(x); st.pop(); q[head++]"],
        ],
      },
      {
        kind: "points", title: "How fast?",
        items: [
          "O(1): a[i], pop. Map/Set: average O(1); push: amortized O(1).",
          "O(n): one loop, includes, indexOf, shift, copying.",
          "O(n log n): sort. O(log n): binary search.",
          "O(n²): a loop inside a loop. Swap the inner search for a Map or Set.",
        ],
      },
    ],
  },
  {
    id: "patterns", title: "Coding patterns",
    summary: "Most coding questions are one of a handful of patterns. Match the words in the task to a pattern, say the brute force, then use the pattern to remove the repeated work.",
    topics: ["two-sum", "two-pointers", "sliding-window", "stack", "binary-search", "bfs", "dfs", "memo-dp", "intervals"],
    sections: [
      {
        kind: "table", title: "Task words → pattern", note: "Trying every pair is O(n²). Ask what you search for repeatedly; that goes in a Map, a Set, or a sorted order.",
        headers: ["When the task says…", "Pattern", "Usually"],
        code: [false, false, false],
        rows: [
          ["count, duplicates, seen before", "Map or Set", "O(n)"],
          ["two numbers add up to a target", "Map of values seen", "O(n)"],
          ["sorted, or compare both ends", "two pointers", "O(n)"],
          ["longest / best run of items in a row", "sliding window", "O(n)"],
          ["brackets, undo, next greater", "stack", "O(n)"],
          ["find in sorted data, first position", "binary search", "O(log n)"],
          ["fewest steps in a grid or graph", "BFS with a queue", "O(cells)"],
          ["regions, trees, all paths", "DFS / recursion", "O(nodes)"],
          ["same subproblem again", "memo or DP table", "O(states)"],
          ["overlapping ranges, meetings", "sort by start, merge", "O(n log n)"],
        ],
      },
    ],
  },
  {
    id: "practical", title: "Practical TypeScript",
    summary: "The take-home style tasks: fetch data safely, reshape it, run requests in parallel, retry and page, and debounce input.",
    topics: ["fetch-typed", "transform", "concurrency", "retry-paginate", "debounce"],
    sections: [
      {
        kind: "table", title: "Task → tool",
        headers: ["Task", "Reach for", "Remember"],
        code: [false, true, false],
        rows: [
          ["Load JSON from an API", "if (!res.ok) throw …", "fetch doesn't throw on 404"],
          ["Trust the response shape", "data: unknown + isX guard", "a type annotation checks nothing"],
          ["Stop a hung request", "AbortSignal.timeout(5000)", "pass as { signal }"],
          ["Totals per key", "new Map<string, number>()", "filter → total → sort"],
          ["Look up by id", "new Map(xs.map(x => [x.id, x]))", "O(1) instead of find"],
          ["Many independent calls", "Promise.all(ids.map(get))", "allSettled keeps failures"],
          ["Rate limit", "k workers + shared index", "results keep input order"],
          ["Flaky service", "retry with backoff", "only timeouts, 429, 5xx"],
          ["Paged results", "loop until cursor is null", "not until a page is empty"],
          ["Search box", "debounce", "one call after typing stops"],
        ],
      },
      {
        kind: "points", title: "Skeleton to type first",
        items: [
          "An interface for the data, and an error class that keeps the status.",
          "A function that takes fetch as a parameter, so a test can pass a fake.",
          "Check res.ok, parse as unknown, validate, then return typed data.",
          "Call it, print the result, and handle the error path.",
        ],
      },
    ],
  },
  {
    id: "plan", title: "Interview game plan",
    summary: "How to run the hour: steps to say out loud, edge cases to test, and how to explain your choices.",
    topics: ["five-steps", "edge-cases", "hints", "say-why", "terms"],
    sections: [
      {
        kind: "points", title: "Five steps, out loud",
        items: [
          "1. Repeat the task and work one example.",
          "2. Ask about edge cases and what to return when there's no answer.",
          "3. Type the signature, then say the simple way and its cost.",
          "4. Remove the repeated work with a Map, Set, sort, or two pointers.",
          "5. Walk the example through the code, then run the edge cases.",
        ],
      },
      {
        kind: "points", title: "Edge cases",
        items: [
          "Empty input",
          "One item",
          "Duplicates",
          "Zero or negative numbers",
          "Sorted or reversed",
          "No answer",
          "Huge input",
        ],
      },
      {
        kind: "points", title: "Say why",
        items: [
          "\"A Set, because I check seen-before on every item.\"",
          "\"Promise.all, because these calls are independent.\"",
          "\"unknown plus a guard, because this data comes from outside.\"",
          "\"O(n) time, O(n) extra space.\"",
        ],
      },
    ],
  },
];

export const cheatSheet: { title: string; summary: string; sections: GuideSection[] } = {
  title: "Cheat sheet",
  summary: "Everything in one place. Search or open a guide for code and details.",
  sections: [
    {
      kind: "points", title: "Game plan",
      items: [
        "Repeat the task and work one example. Ask about edge cases.",
        "Type the signature. Say the brute force and its cost.",
        "Remove the repeated work, then walk the example and test the edges.",
        "Say why for every choice: the tool and the operation it makes fast.",
      ],
    },
    {
      kind: "table", title: "Which loop?", note: "Never forEach when you need to stop early or await.",
      headers: ["You need to", "Use", "TypeScript"],
      code: [false, false, true],
      rows: [
        ["Visit every item you have", "for...of", "for (const x of xs) { }"],
        ["Use the index or neighbors", "index loop", "for (let i = 1; i < xs.length; i++)"],
        ["Repeat until something changes", "while", "while (lo < hi) { }"],
        ["Make a new array from each item", "map", "xs.map(x => x * 2)"],
        ["Keep some items", "filter", "xs.filter(x => x > 0)"],
        ["Find the first match", "find, or for + return", "xs.find(x => x.id === id)"],
        ["Check any or all", "some / every", "xs.some(x => x < 0)"],
        ["Await each in order", "for...of + await", "for (const id of ids) await save(id);"],
      ],
    },
    {
      kind: "table", title: "Which collection?",
      headers: ["You need to", "Use", "TypeScript"],
      code: [false, false, true],
      rows: [
        ["Keep order, read by position", "Array", "const xs: number[] = [3, 1];"],
        ["Look up by key", "Map", "const m = new Map<string, number>();"],
        ["Check seen, dedupe", "Set", "seen.has(x); [...new Set(xs)]"],
        ["Fixed string keys", "object / Record", "const cfg: Record<string, number> = {};"],
        ["Use a pair as a key", "string key", "visited.add(`${r},${c}`);"],
        ["Count things", "Map of counts", "m.set(x, (m.get(x) ?? 0) + 1);"],
        ["Stack / queue", "array (+ head index)", "st.push(x); st.pop(); q[head++]"],
      ],
    },
    {
      kind: "points", title: "How fast?",
      items: [
        "O(1): a[i], pop. Map/Set: average O(1); push: amortized O(1).",
        "O(n): one loop, includes, indexOf, shift, copying.",
        "O(n log n): sort. O(log n): binary search.",
        "O(n²): a loop inside a loop. Swap the inner search for a Map or Set.",
      ],
    },
    {
      kind: "table", title: "Task words → pattern", note: "Trying every pair is O(n²). Ask what you search for repeatedly; that goes in a Map, a Set, or a sorted order.",
      headers: ["When the task says…", "Pattern", "Usually"],
      code: [false, false, false],
      rows: [
        ["count, duplicates, seen before", "Map or Set", "O(n)"],
        ["two numbers add up to a target", "Map of values seen", "O(n)"],
        ["sorted, or compare both ends", "two pointers", "O(n)"],
        ["longest / best run of items in a row", "sliding window", "O(n)"],
        ["brackets, undo, next greater", "stack", "O(n)"],
        ["find in sorted data, first position", "binary search", "O(log n)"],
        ["fewest steps in a grid or graph", "BFS with a queue", "O(cells)"],
        ["regions, trees, all paths", "DFS / recursion", "O(nodes)"],
        ["same subproblem again", "memo or DP table", "O(states)"],
        ["overlapping ranges, meetings", "sort by start, merge", "O(n log n)"],
      ],
    },
    {
      kind: "table", title: "Quick answers",
      headers: ["Question", "Short answer", "Example"],
      code: [false, false, true],
      rows: [
        ["let, const, or var?", "const by default, let to reassign, avoid var", "const xs: number[] = []; xs.push(1);"],
        ["== or ===?", "=== never converts types", "\"1\" === 1   // false"],
        ["?? or ||?", "?? replaces only null and undefined", "0 ?? 5   // 0, but 0 || 5 is 5"],
        ["What's a closure?", "a function plus the variables it captured", "const inc = () => ++count;"],
        ["What is this?", "set by the call; arrows use the outer this", "onClick = () => this.save();"],
        ["Event loop order?", "sync code, then microtasks, then timers", "Promise.then runs before setTimeout"],
        ["Copy an object?", "spread is shallow; structuredClone is deep", "const b = structuredClone(a);"],
        ["Run requests together?", "Promise.all; allSettled to keep failures", "await Promise.all(ids.map(get));"],
        ["Which mutate?", "sort, reverse, splice, push, pop", "const s = xs.toSorted((a, b) => a - b);"],
      ],
    },
    {
      kind: "table", title: "Which tool?",
      headers: ["You need", "Use", "Example"],
      code: [false, false, true],
      rows: [
        ["An object shape", "interface or type", "interface User { id: number; name?: string }"],
        ["One of a few values", "union of literals", "type Dir = \"asc\" | \"desc\";"],
        ["Variants with different fields", "discriminated union", "{ kind: \"ok\"; value: T } | { kind: \"err\" }"],
        ["Same code for any type", "generic", "function first<T>(xs: T[]): T | undefined"],
        ["A type derived from another", "Omit, Pick, Partial", "type Safe = Omit<User, \"password\">;"],
        ["A lookup object", "Record", "const byId: Record<string, User> = {};"],
        ["Data from outside", "unknown + type guard", "function isUser(x: unknown): x is User"],
        ["Literal values", "as const / satisfies", "const dirs = [\"asc\", \"desc\"] as const;"],
      ],
    },
    {
      kind: "table", title: "Error says → fix", note: "Assertions do not check at runtime. A keyof cast needs known runtime keys.",
      headers: ["Error says", "Fix"],
      code: [false, false],
      rows: [
        ["Object is possibly undefined", "guard (if (x == null) return) or default (x ?? fallback)"],
        ["Parameter implicitly has an any type", "annotate the parameter"],
        ["Expression of type string can't be used to index", "type the object as Record<string, T>, or use keyof"],
        ["string is not assignable to \"a\" | \"b\"", "as const, or declare the variable with the union type"],
        ["Property does not exist on type A | B", "narrow first: if (\"prop\" in x), typeof, or a kind field"],
        ["Object.keys gives string[]", "(Object.keys(o) as (keyof typeof o)[])"],
      ],
    },
    {
      kind: "table", title: "Task → tool",
      headers: ["Task", "Reach for", "Remember"],
      code: [false, true, false],
      rows: [
        ["Load JSON from an API", "if (!res.ok) throw …", "fetch doesn't throw on 404"],
        ["Trust the response shape", "data: unknown + isX guard", "a type annotation checks nothing"],
        ["Stop a hung request", "AbortSignal.timeout(5000)", "pass as { signal }"],
        ["Totals per key", "new Map<string, number>()", "filter → total → sort"],
        ["Look up by id", "new Map(xs.map(x => [x.id, x]))", "O(1) instead of find"],
        ["Many independent calls", "Promise.all(ids.map(get))", "allSettled keeps failures"],
        ["Rate limit", "k workers + shared index", "results keep input order"],
        ["Flaky service", "retry with backoff", "only timeouts, 429, 5xx"],
        ["Paged results", "loop until cursor is null", "not until a page is empty"],
        ["Search box", "debounce", "one call after typing stops"],
      ],
    },
  ],
};

export function guideById(id: string): InterviewGuide | undefined {
  return interviewGuides.find(guide => guide.id === id);
}
