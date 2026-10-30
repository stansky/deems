import type { NoteLanguage } from "@/data/interview-notes";

// Merged guides for /notes. Each covers a run of printed notes and is written to fit in one to
// three screens on a tablet in landscape.
export type GuideSection =
  | { kind: "table"; title: string; headers: string[]; languages: (NoteLanguage | null)[]; rows: string[][]; note?: string }
  | { kind: "compare"; title: string; python: string; javascript: string; note?: string }
  | { kind: "points"; title: string; items: string[]; tone?: "warn" };

export type InterviewGuide = {
  id: string;
  title: string;
  summary: string;
  firstNote: number;
  lastNote: number;
  sections: GuideSection[];
};

export const interviewGuides: InterviewGuide[] = [
  {
    id: "loops", title: "Choose a loop", firstNote: 1, lastNote: 11,
    summary: "One question picks the tool: are you choosing a path, visiting items you already have, or repeating until something changes?",
    sections: [
      {
        kind: "table", title: "Which one?", note: "If you can name the list, write for. If you can only name when to stop, write while.",
        headers: ["If you need to…", "Use", "Python", "JavaScript"],
        languages: [null, null, "python", "javascript"],
        rows: [
        ["Pick one path", "if / else", "if x > 0:", "if (x > 0) { }"],
        ["Visit every item you have", "for", "for x in items:", "for (const x of items)"],
        ["Know the position too", "for + index", "for i, x in enumerate(xs):", "for (const [i, x] of xs.entries())"],
        ["Count 0 to n - 1", "for + range", "for i in range(n):", "for (let i = 0; i < n; i++)"],
        ["Repeat until something changes", "while", "while lo < hi:", "while (lo < hi)"],
        ["Try at most k times, stop early", "for + break", "for _ in range(3):", "for (let t = 0; t < 3; t++)"],
        ["Make a new list from each item", "comprehension / map", "[f(x) for x in xs]", "xs.map(f)"],
        ["Keep only some items", "filter", "[x for x in xs if ok(x)]", "xs.filter(ok)"],
        ["Find the first match", "for + return / find", "next((x for x in xs if ok(x)), None)", "xs.find(ok)"],
        ["Ask if any item matches", "any / some", "any(ok(x) for x in xs)", "xs.some(ok)"],
        ],
      },
      {
        kind: "compare", title: "Same loops, both languages",
        python: `nums = [5, -1, 8, 120, 3]
total = 0
for n in nums:
    if n < 0:
        continue      # skip this item
    if n > 99:
        break         # leave the loop
    total += n
print(total)          # 13

n, steps = 40, 0      # start
while n > 1:          # test
    n //= 2           # move toward the end
    steps += 1
print(steps)          # 5`,
        javascript: `const nums = [5, -1, 8, 120, 3];
let total = 0;
for (const n of nums) {
  if (n < 0) continue; // skip this item
  if (n > 99) break;   // leave the loop
  total += n;
}
console.log(total);    // 13

let n = 40, steps = 0;   // start
while (n > 1) {          // test
  n = Math.floor(n / 2); // move toward the end
  steps++;
}
console.log(steps);      // 5`,
      },
      {
        kind: "points", title: "Ways out",
        items: [
          "continue skips to the next item.",
          "break leaves the loop. return leaves the whole function.",
          "JS forEach cannot stop early. Use for...of, or find / some, which stop at the first match.",
          "Python for ... else: the else runs only when the loop ended without break.",
        ],
      },
      {
        kind: "points", title: "Watch out", tone: "warn",
        items: [
          "A while loop needs a start, a test, and a line that moves toward the end, or it never stops.",
          "range(n) ends at n - 1. i < n and i <= n differ by one trip: the classic off-by-one.",
          "JS for...in gives keys as strings. Use for...of for arrays.",
          "Don't add or remove items in a list while looping over it. Build a new list.",
        ],
      },
    ],
  },
  {
    id: "collections", title: "Choose a collection", firstNote: 12, lastNote: 20,
    summary: "Pick the container by the operation you repeat most: keep order, look up by key, check if you've seen it, or keep a small fixed group.",
    sections: [
      {
        kind: "table", title: "Which one?", note: "When unsure, start with a list. Switch to a set or dict when you notice you keep searching it.",
        headers: ["If you need to…", "Python", "JavaScript"],
        languages: [null, "python", "javascript"],
        rows: [
        ["Keep order, allow duplicates, read by position", "xs = [3, 1]; xs[0]", "const xs = [3, 1]; xs[0]"],
        ["Look up a value by key", "d.get(\"tea\", 0)", "m.get(\"tea\") ?? 0"],
        ["Check if seen, remove duplicates", "x in seen; set(xs)", "seen.has(x); new Set(xs)"],
        ["Use a pair as a key", "visited.add((r, c))", "visited.add(`${r},${c}`)"],
        ["Count things", "Counter(xs)", "m.set(x, (m.get(x) ?? 0) + 1)"],
        ["Group things", "g[key].append(x)  # defaultdict", "g.get(key).push(x)  // Map of arrays"],
        ["Stack: last in, first out", "xs.append(x); xs.pop()", "xs.push(x); xs.pop()"],
        ["Queue: first in, first out", "q = deque(); q.popleft()", "q[head++]  // array + index"],
        ["Fixed settings with string keys", "cfg[\"retries\"]", "cfg.retries  // plain object"],
        ],
      },
      {
        kind: "points", title: "How fast?",
        items: [
          "O(1), same time at any size: d[key], x in set, xs[i].",
          "O(n), looks at each item: x in list, .index(), .includes().",
          "A search inside a loop is O(n²). Swap the inner search for a set or dict lookup to get O(n).",
          "Append or push is O(1). Insert or remove at the front is O(n). Sorting is O(n log n).",
        ],
      },
      {
        kind: "compare", title: "Count, dedupe, and Two Sum",
        python: `visits = ["ana", "bo", "ana", "cy"]
counts = {}
for v in visits:
    counts[v] = counts.get(v, 0) + 1
print(counts["ana"])         # 2
print(len(set(visits)))      # 3 unique

def two_sum(nums, target):
    seen = {}                # number -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i          # store after checking
    return None

print(two_sum([2, 7, 11], 9))  # [0, 1]`,
        javascript: `const visits = ["ana", "bo", "ana", "cy"];
const counts = new Map();
for (const v of visits) {
  counts.set(v, (counts.get(v) ?? 0) + 1);
}
console.log(counts.get("ana"));     // 2
console.log(new Set(visits).size);  // 3 unique

function twoSum(nums, target) {
  const seen = new Map();  // number -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);  // store after checking
  }
  return null;
}
console.log(twoSum([2, 7, 11], 9)); // [ 0, 1 ]`,
      },
      {
        kind: "points", title: "Watch out", tone: "warn",
        items: [
          "Python {} is an empty dict. An empty set is set().",
          "Lists can't be dict keys or set members. Use a tuple.",
          "JS object keys become strings: obj[1] and obj[\"1\"] are the same. Use a Map.",
          "JS sort() with no compare function sorts numbers as text: pass (a, b) => a - b.",
          "list.pop(0) and shift() are O(n). Use deque, or an index, for big queues.",
        ],
      },
    ],
  },
  {
    id: "traps", title: "Empty values and traps", firstNote: 21, lastNote: 24,
    summary: "Most surprise bugs come from what counts as empty or false, and from a few language quirks interviewers like to test.",
    sections: [
      {
        kind: "table", title: "What counts as false in an if?", note: "Use x is None (Python) or x == null (JS) when 0 is a real value.",
        headers: ["Value", "Python", "JavaScript"],
        languages: [null, null, null],
        rows: [
        ["0 and \"\"", "False", "false"],
        ["Empty list / array", "False", "TRUE: check .length"],
        ["Empty dict / object", "False", "TRUE: check Object.keys()"],
        ["None / null, undefined", "False", "false"],
        ["\"0\" and [0]", "True", "true"],
        ],
      },
      {
        kind: "compare", title: "Defaults and the classic bugs",
        python: `retries = 0
print(retries or 3)          # 3: or replaces 0
print(3 if retries is None else retries)  # 0

def add(tag, tags=None):     # never tags=[]
    tags = [] if tags is None else tags
    tags.append(tag)
    return tags
print(add("a"), add("b"))    # ['a'] ['b']

grid = [[0] * 3 for _ in range(3)]  # not [[0]*3]*3
grid[0][0] = 1
print(grid[1][0])            # 0
print(round(22.5))           # 22: half to even`,
        javascript: `const retries = 0;
console.log(retries || 3);   // 3: || replaces 0
console.log(retries ?? 3);   // 0: keeps the 0

console.log([].length === 0);          // true
console.log([10, 9, 1].sort());        // [ 1, 10, 9 ]
const nums = [10, 9, 1];
console.log(nums.sort((a, b) => a - b)); // [ 1, 9, 10 ]

const byId = {};
byId[1] = "a";
console.log(Object.keys(byId));        // [ '1' ]
console.log(Math.round(22.5));         // 23
console.log(0.1 + 0.2 === 0.3);        // false`,
      },
      {
        kind: "points", title: "Python traps", tone: "warn",
        items: [
          "A list or dict default argument is shared by every call. Default to None.",
          "[[0] * 3] * 3 repeats one row three times. Build rows in a comprehension.",
          "is checks identity. Use == for values.",
          "round() sends halves to the even number: round(22.5) is 22.",
        ],
      },
      {
        kind: "points", title: "JavaScript traps", tone: "warn",
        items: [
          "== converts types. Use ===.",
          "fetch does not throw on 404 or 500. Check response.ok.",
          "Passing obj.method alone loses this. Wrap it: () => obj.method().",
          "|| replaces 0 and \"\". Use ?? for a default that keeps 0.",
        ],
      },
    ],
  },
  {
    id: "classes", title: "Recursion, classes, and errors", firstNote: 25, lastNote: 30,
    summary: "Loop before you recurse, keep a class's data correct in its constructor, and give callers an error type they can catch.",
    sections: [
      {
        kind: "compare", title: "Fibonacci: loop first",
        python: `def fib(n):            # O(n) time, O(1) memory
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print([fib(i) for i in range(8)])
# [0, 1, 1, 2, 3, 5, 8, 13]`,
        javascript: `function fib(n) {      // O(n) time, O(1) memory
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}
console.log(fib(10)); // 55
// Exact up to fib(78). Beyond: BigInt (0n, 1n).`,
      },
      {
        kind: "compare", title: "A class with a custom error",
        python: `class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status

class Tracker:
    def __init__(self, limit):      # constructor
        if limit < 1:
            raise ValueError("limit")
        self.limit = limit          # fields
        self.active = set()

    def start(self, run_id):        # method
        if len(self.active) >= self.limit:
            raise ApiError(429, "too many runs")
        self.active.add(run_id)

t = Tracker(1)
t.start("a")
try:
    t.start("b")
except ApiError as e:
    print(e.status, e)   # 429 too many runs`,
        javascript: `class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class Tracker {
  constructor(limit) {              // constructor
    if (limit < 1) throw new RangeError("limit");
    this.limit = limit;             // fields
    this.active = new Set();
  }
  start(runId) {                    // method
    if (this.active.size >= this.limit) {
      throw new ApiError(429, "too many runs");
    }
    this.active.add(runId);
  }
}

const t = new Tracker(1);
t.start("a");
try {
  t.start("b");
} catch (e) {
  if (!(e instanceof ApiError)) throw e;
  console.log(e.status, e.message);
  // 429 too many runs
}`,
      },
      {
        kind: "points", title: "Remember",
        items: [
          "Plain recursive Fibonacci redoes work and grows exponentially. Memoization (@cache, or a Map) computes each n once.",
          "Python stops recursion around 1,000 calls deep; a loop never does.",
          "self (Python) and this (JS) are the object the method was called on.",
          "Catch the error type you can handle, and let everything else go up.",
        ],
      },
      {
        kind: "points", title: "Watch out", tone: "warn",
        items: [
          "A Python list default argument is shared by every instance. Default to None.",
          "A JS method passed alone loses this. Use an arrow function.",
          "except Exception: pass and empty catch blocks hide real bugs.",
        ],
      },
    ],
  },
  {
    id: "problem", title: "Work the problem", firstNote: 31, lastNote: 35,
    summary: "Use the same steps on every question and say each one out loud. The words in the task usually hint at the tool.",
    sections: [
      {
        kind: "points", title: "Five steps, out loud",
        items: [
          "1. Repeat the task in your own words and work one example.",
          "2. Ask about edge cases: empty, one item, duplicates, negatives, no answer.",
          "3. Say the simple way first, and how slow it is.",
          "4. Find the repeated work and remove it, usually with a dict, a set, sorting, or two pointers.",
          "5. Walk your example through the code, then run the edge cases.",
        ],
      },
      {
        kind: "table", title: "Task words → tool",
        headers: ["When the task says…", "Reach for", "Why"],
        languages: [null, null, null],
        rows: [
        ["count, duplicates, seen before", "dict or set", "O(1) lookups instead of searching a list"],
        ["two numbers add up to a target", "dict of numbers seen", "each partner is one lookup"],
        ["sorted, or compare both ends", "two pointers + while", "walk inward, no extra memory"],
        ["overlapping ranges or meetings", "sort by start, then merge", "neighbors overlap after sorting"],
        ["brackets, undo, most recent", "stack (list / array)", "last in, first out"],
        ["k items in a row, best stretch", "sliding window", "add the new item, drop the oldest"],
        ["fewest steps on a grid or graph", "queue + breadth-first search", "visits the nearest places first"],
        ],
      },
      {
        kind: "points", title: "Edge cases to run",
        items: [
          "Empty input",
          "One item",
          "Duplicates",
          "Zero or negative numbers",
          "Already sorted, or reversed",
          "No answer: what should it return?",
        ],
      },
      {
        kind: "points", title: "Say why",
        items: [
          "\"A set, because I check seen-before on every item and a set does that in O(1).\"",
          "\"A while loop, because I stop when the pointers meet, not after a fixed count.\"",
          "\"This is O(n) time and O(n) extra memory for the dict.\"",
          "\"I'll handle the empty input first and return early.\"",
        ],
      },
      {
        kind: "table", title: "Terms in plain English",
        headers: ["Term", "Meaning"],
        languages: [null, null],
        rows: [
        ["Iterable", "anything a for loop can walk"],
        ["Mutable / immutable", "can change (list, dict) / cannot (tuple, string)"],
        ["Hashable", "can be a dict key or set member"],
        ["Guard clause", "an early if that handles a bad case and returns"],
        ["Off-by-one", "a loop that runs one time too many or too few"],
        ["Brute force", "the simple, try-everything version"],
        ["Memoization", "saving answers so each input is computed once"],
        ["Instance", "one object built from a class"],
        ],
      },
    ],
  },
  {
    id: "fullstack", title: "API client and paging", firstNote: 36, lastNote: 39,
    summary: "Start a fetch-data task with a skeleton the interviewer can follow: an error type, a client that receives its HTTP function, small methods, then a loop that follows the cursor.",
    sections: [
      {
        kind: "points", title: "The skeleton",
        items: [
          "Constants: base URL, timeout.",
          "An error class that keeps the HTTP status.",
          "A client whose constructor receives the HTTP function, so a test can pass a fake.",
          "One small method per job, then call it, print it, and handle the error.",
        ],
      },
      {
        kind: "compare", title: "Client and paging, both languages",
        python: `class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"HTTP {status}")
        self.status = status

class Client:
    def __init__(self, http_get):
        self.http_get = http_get    # fake in tests

    def get_json(self, path):
        status, body = self.http_get(path)
        if status != 200:
            raise ApiError(status)
        return body

    def all_runs(self):
        cursor = None
        while True:
            page = self.get_json(f"/runs?c={cursor}")
            yield from page["items"]
            cursor = page.get("next")
            if cursor is None:  # not on empty page
                return

pages = {
    "/runs?c=None": {"items": [1, 2], "next": "p2"},
    "/runs?c=p2": {"items": [3], "next": None},
}
def fake_get(path):
    if path not in pages:
        return 404, None
    return 200, pages[path]

client = Client(fake_get)
print(list(client.all_runs()))      # [1, 2, 3]
try:
    client.get_json("/missing")
except ApiError as e:
    print("handled", e.status)      # handled 404`,
        javascript: `class ApiError extends Error {
  constructor(status) {
    super(\`HTTP \${status}\`);
    this.status = status;
  }
}

class Client {
  constructor(fetchFn = fetch) {
    this.fetchFn = fetchFn;         // fake in tests
  }
  async getJson(path) {
    const res = await this.fetchFn(path);
    if (!res.ok) throw new ApiError(res.status);
    return res.json();
  }
  async *allRuns() {
    let cursor = null;
    do {
      const path = \`/runs?c=\${cursor}\`;
      const page = await this.getJson(path);
      yield* page.items;
      cursor = page.next ?? null;
    } while (cursor !== null); // not on empty page
  }
}

const pages = {
  "/runs?c=null": { items: [1, 2], next: "p2" },
  "/runs?c=p2": { items: [3], next: null },
};
const fakeFetch = async path => path in pages
  ? new Response(JSON.stringify(pages[path]))
  : new Response(null, { status: 404 });

const client = new Client(fakeFetch);
const runs = [];
for await (const run of client.allRuns()) {
  runs.push(run);
}
console.log(runs);                  // [ 1, 2, 3 ]
try {
  await client.getJson("/missing");
} catch (e) {
  if (!(e instanceof ApiError)) throw e;
  console.log("handled", e.status); // handled 404
}`,
      },
      {
        kind: "points", title: "Watch out", tone: "warn",
        items: [
          "fetch only throws on network failure. A 404 resolves with ok set to false.",
          "Python urllib raises on 4xx and 5xx; requests waits until raise_for_status().",
          "Stop paging when the cursor is missing, not on an empty or short page.",
          "Encode anything you put in a URL, and set a timeout on real requests.",
          "Don't catch everything and return []: an outage then looks like no data.",
        ],
      },
    ],
  },
];

export function guideForNote(number: number): InterviewGuide | undefined {
  return interviewGuides.find(guide => number >= guide.firstNote && number <= guide.lastNote);
}
