// Full TypeScript reference pages behind the printed interview notes. Each topic belongs to
// one guide and is found by search or from its guide.
export type TopicCode = { source: string; caption?: string };

export type InterviewTopic = {
  id: string;
  title: string;
  guide: string;
  keywords: string;
  summary: string;
  useWhen: string[];
  code: TopicCode[];
  tips: string[];
  watchOut: string[];
  say?: string;
};

export const interviewTopics: InterviewTopic[] = [
  {
    id: "js-scope", title: "let, const, var", guide: "js",
    keywords: "let const var scope hoisting tdz block function",
    summary: "Use const by default and let when you reassign. var is function-scoped and hoisted, which causes the classic loop and closure bugs.",
    useWhen: [
      "const: almost everything, including objects and arrays you change in place",
      "let: counters, totals, and other values you reassign",
      "var: never in new code; know it for legacy questions",
    ],
    code: [
      { source: `const user = { name: "ana" };
user.name = "bo";              // fine: the object changes
// user = { name: "cy" };      // error: const can't be reassigned
console.log(user.name); // → bo

let total = 0;
for (const n of [1, 2, 3]) total += n;
console.log(total); // → 6

function lastIndex(): number {
  for (var i = 0; i < 3; i++) {}
  return i;                    // var leaks out of the loop
}
console.log(lastIndex()); // → 3

console.log(hoisted()); // → works
function hoisted() { return "works"; }` },
    ],
    tips: [
      "Default to const; switch to let only when you really reassign.",
      "const fixes the binding, not the value. Use readonly types or Object.freeze to stop changes.",
      "Function declarations are hoisted, so you can call them above where they are written.",
    ],
    watchOut: [
      "var in a for loop shares one variable across iterations, so callbacks all see the last value.",
      "Reading a let or const before its line throws a ReferenceError (the temporal dead zone).",
    ],
    say: "I use const by default and let only for values I reassign, like a running total.",
  },
  {
    id: "js-equality", title: "Equality and truthiness", guide: "js",
    keywords: "equality === == truthy falsy nullish ?? || optional chaining ?. nan",
    summary: "=== compares without converting types. Falsy values include false, 0, -0, 0n, empty text, null, undefined and NaN. Empty arrays and objects are truthy. ?? replaces only null and undefined.",
    useWhen: [
      "Compare values → === and !==",
      "Empty array check → arr.length === 0",
      "Default only when missing → x ?? fallback",
      "Maybe-missing nested field → a?.b?.c",
    ],
    code: [
      { source: `console.log(Boolean([]), Boolean("")); // → true false

const retries = 0;
console.log(retries || 3); // → 3
console.log(retries ?? 3); // → 0

type User = { address?: { city: string } };
const u: User = {};
console.log(u.address?.city);              // → undefined
console.log(u.address?.city ?? "unknown"); // → unknown
console.log(Number.isNaN(Number("x")));    // → true` },
    ],
    tips: [
      "== converts types first (\"1\" == 1 is true). Use === everywhere.",
      "x == null is the one accepted use of ==: it catches null and undefined together.",
      "NaN is not equal to itself. Use Number.isNaN(x).",
    ],
    watchOut: [
      "if (arr) is always true for an array. Check arr.length.",
      "|| replaces 0 and \"\". Use ?? when 0 is a real value.",
    ],
    say: "I'll use ?? so a real zero isn't replaced by the default.",
  },
  {
    id: "js-closures", title: "Closures", guide: "js",
    keywords: "closure closures private state memoize counter captured",
    summary: "A closure is a function plus the variables it captured where it was created. Each call to the outer function makes a fresh, private set of those variables.",
    useWhen: [
      "Private state without a class",
      "Caching results (memoize)",
      "Timers that remember the last call (debounce)",
      "Event handlers that need values from setup",
    ],
    code: [
      { source: `function makeCounter() {
  let count = 0;                 // private: only the closure sees it
  return {
    increment: () => ++count,
    current: () => count,
  };
}
const counter = makeCounter();
counter.increment();
counter.increment();
console.log(counter.current()); // → 2

function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>(); // survives between calls
  return arg => {
    if (!cache.has(arg)) cache.set(arg, fn(arg));
    return cache.get(arg)!;
  };
}
let calls = 0;
const square = memoize((n: number) => {
  calls++;
  return n * n;
});
square(4);
square(4);
console.log(calls); // → 1

const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) fns.push(() => i); // let: one i per loop
console.log(fns.map(f => f())); // → [ 0, 1, 2 ]` },
    ],
    tips: [
      "Each call to makeCounter gets its own count.",
      "Closures are how memoize, debounce, and once() keep state without a class.",
      "let in a for loop gives each iteration its own variable.",
    ],
    watchOut: [
      "With var in the loop, every callback would share one i and print 3, 3, 3.",
      "A closure keeps captured objects alive as long as the function exists.",
    ],
    say: "The count lives in a closure, so nothing outside can change it.",
  },
  {
    id: "js-this", title: "this and arrow functions", guide: "js",
    keywords: "this arrow bind lost this context method callback",
    summary: "this is set by how a function is called, not where it was written. Arrow functions don't have their own this; they use the one from the surrounding code.",
    useWhen: [
      "Callbacks inside methods → arrow functions",
      "Handlers passed around → arrow class fields or bind",
      "Methods on classes and objects → regular methods",
    ],
    code: [
      { source: `class Timer {
  seconds = 0;
  tick() { this.seconds++; }
}
const t = new Timer();
const loose = t.tick;
try {
  loose();                               // this is undefined here
} catch (e) {
  console.log(e instanceof TypeError); // → true
}
[1, 2, 3].forEach(() => t.tick());      // the arrow keeps t
console.log(t.seconds); // → 3

class Button {
  clicks = 0;
  onClick = () => { this.clicks++; };   // arrow field: always bound
}
const b = new Button();
const handler = b.onClick;
handler();
console.log(b.clicks); // → 1` },
    ],
    tips: [
      "obj.method() sets this to obj; calling the same function alone does not.",
      "Arrow class fields stay bound when you pass them as callbacks.",
      "bind returns a new function with this fixed.",
    ],
    watchOut: [
      "Don't write an object method as an arrow if it needs the object's this.",
      "Class bodies run in strict mode, so lost this is undefined and throws.",
    ],
    say: "I pass an arrow function so the method keeps its this.",
  },
  {
    id: "js-async", title: "Promises and async/await", guide: "js",
    keywords: "async await promise promises all allsettled race any parallel try catch",
    summary: "An async function always returns a Promise. await pauses that function until the Promise settles. Independent calls should start together with Promise.all.",
    useWhen: [
      "Calls that depend on each other → await them in order",
      "Independent calls → Promise.all",
      "Keep results even if some fail → Promise.allSettled",
      "First answer wins (timeouts) → Promise.race",
    ],
    code: [
      { source: `type User = { id: number; name: string };
const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

async function getUser(id: number): Promise<User> {
  await sleep(10);
  if (id < 0) throw new Error(\`bad id \${id}\`);
  return { id, name: \`user\${id}\` };
}

async function main() {
  const [a, b] = await Promise.all([getUser(1), getUser(2)]);
  console.log(a.name, b.name); // → user1 user2

  try {
    await getUser(-1);
  } catch (e) {
    if (e instanceof Error) console.log(e.message); // → bad id -1
  }

  const results = await Promise.allSettled([getUser(3), getUser(-2)]);
  console.log(results.map(r => r.status).join(",")); // → fulfilled,rejected
}
main();` },
    ],
    tips: [
      "Promise.all takes as long as the slowest call, not the sum.",
      "In a catch block, e is unknown in TypeScript. Narrow it (e instanceof Error) before reading message.",
      "An async function returns a Promise even when you return a plain value.",
    ],
    watchOut: [
      "await inside forEach does not wait. Use for...of (in order) or Promise.all (in parallel).",
      "A rejected Promise nobody awaits becomes an unhandled rejection.",
    ],
    say: "These calls don't depend on each other, so I'll start them together with Promise.all.",
  },
  {
    id: "js-event-loop", title: "Event loop order", guide: "js",
    keywords: "event loop microtask macrotask settimeout order queue",
    summary: "JavaScript runs all synchronous code first, then every queued microtask (promise callbacks, code after await), then the next macrotask (timers, I/O, events).",
    useWhen: [
      "Predicting console.log order questions",
      "Explaining why setTimeout(fn, 0) isn't immediate",
      "Explaining why a long loop freezes the page",
    ],
    code: [
      { source: `const order: string[] = [];
const log = (s: string) => order.push(s);

log("A");
setTimeout(() => {
  log("B");
  console.log(order.join(" ")); // → A D C E B
}, 0);
Promise.resolve().then(() => log("C"));
(async () => {
  await null;
  log("E");
})();
log("D");` },
    ],
    tips: [
      "Sync first, then all microtasks, then one macrotask, then microtasks again.",
      "setTimeout(fn, 0) means after the current code and all microtasks.",
      "Each await lets other queued microtasks run first.",
    ],
    watchOut: [
      "A long synchronous loop blocks timers, clicks, and rendering.",
      "Microtasks that keep queueing microtasks can starve timers.",
    ],
    say: "Promise callbacks are microtasks, so they run before the setTimeout callback.",
  },
  {
    id: "js-copy", title: "References and copies", guide: "js",
    keywords: "reference copy shallow deep structuredclone spread mutate immutable",
    summary: "Variables hold references to objects and arrays. Assigning or passing one shares it. Spread makes a shallow copy; structuredClone makes a deep copy of plain data.",
    useWhen: [
      "Change data without affecting the caller → copy first",
      "Nested data you will edit → structuredClone",
      "Compare objects → compare an id or specific fields",
    ],
    code: [
      { source: `const original = { name: "ana", tags: ["admin"] };
const alias = original;
alias.name = "bo";
console.log(original.name); // → bo

const shallow = { ...original };
shallow.tags.push("dev");          // the inner array is still shared
console.log(original.tags.length); // → 2

const deep = structuredClone(original);
deep.tags.push("ops");
console.log(original.tags.length); // → 2

const x = { a: 1 };
const y = { a: 1 };
const z = x;
console.log(x === y, x === z); // → false true` },
    ],
    tips: [
      "Spread copies one level; nested objects stay shared.",
      "structuredClone copies plain data deeply (not functions or class methods).",
      "Return new objects from functions instead of editing the arguments.",
    ],
    watchOut: [
      "sort(), reverse(), and splice() change the array in place. Use toSorted(), toReversed(), or copy first.",
    ],
    say: "I copy before sorting so I don't change the caller's array.",
  },
  {
    id: "js-arrays", title: "Array methods", guide: "js",
    keywords: "array methods map filter reduce find some every flatmap includes slice splice sort",
    summary: "Array methods replace common loops. map and filter return new arrays; find, some, and every stop early; sort and splice change the original.",
    useWhen: [
      "Transform each item → map",
      "Keep some items → filter",
      "First match → find",
      "Yes or no → some / every",
      "One total → reduce, or a plain loop",
    ],
    code: [
      { source: `const nums = [3, 8, 1, 6];
console.log(nums.map(n => n * 2));          // → [ 6, 16, 2, 12 ]
console.log(nums.filter(n => n % 2 === 0)); // → [ 8, 6 ]
console.log(nums.find(n => n > 5));         // → 8
console.log(nums.some(n => n > 7));         // → true
console.log(nums.every(n => n > 0));        // → true
console.log(nums.reduce((sum, n) => sum + n, 0)); // → 18
console.log([[1, 2], [3]].flatMap(x => x)); // → [ 1, 2, 3 ]
console.log(nums.at(-1), nums.includes(6)); // → 6 true

const sorted = nums.toSorted((a, b) => a - b);
console.log(sorted); // → [ 1, 3, 6, 8 ]
console.log(nums);   // → [ 3, 8, 1, 6 ]` },
    ],
    tips: [
      "Chain filter then map for clarity; use a for...of loop if you need to stop early or track several values.",
      "reduce needs a starting value: reduce((sum, n) => sum + n, 0).",
      "includes and indexOf are O(n). For many lookups, build a Set.",
    ],
    watchOut: [
      "sort() without a compare function sorts as strings: [10, 9, 1] becomes [1, 10, 9].",
      "An arrow with braces needs return: n => { return n * 2; }.",
    ],
    say: "map keeps one output per input, so it fits transforming the list.",
  },
  {
    id: "ts-types", title: "Types and interfaces", guide: "ts",
    keywords: "type interface extends optional readonly tuple annotation",
    summary: "Annotate function inputs and outputs; let TypeScript infer the rest. Use interface or type for object shapes, and type for unions and tuples.",
    useWhen: [
      "Object shape → interface or type",
      "One of several types → type with |",
      "Fixed-length array → tuple [x: number, y: number]",
      "May be missing → optional field?:",
    ],
    code: [
      { source: `type ID = number | string;

interface User {
  id: ID;
  name: string;
  email?: string;            // may be missing
  readonly createdAt: Date;  // can't be reassigned
}

interface Admin extends User {
  permissions: string[];
}

type Point = [x: number, y: number];

function describe(user: User): string {
  return \`\${user.name} <\${user.email ?? "no email"}>\`;
}

const admin: Admin = {
  id: 1, name: "ana", createdAt: new Date(0), permissions: ["all"],
};
const p: Point = [2, 3];
console.log(describe(admin)); // → ana <no email>
console.log(p[0] + p[1]);     // → 5` },
    ],
    tips: [
      "Annotate parameters and return types; let locals be inferred.",
      "An Admin works anywhere a User is expected: TypeScript checks shape, not names.",
      "readonly and ? are checked only at compile time.",
    ],
    watchOut: [
      "Types disappear at runtime. JSON and fetch results are unchecked until you validate them.",
      "An optional field is T | undefined; handle the undefined case.",
    ],
    say: "I'll type the function's inputs and output and let inference handle the locals.",
  },
  {
    id: "ts-narrowing", title: "Unions and narrowing", guide: "ts",
    keywords: "union narrowing discriminated typeof instanceof in switch never exhaustive",
    summary: "A union says a value is one of several types. Checks like typeof, in, and a shared kind field narrow it, and TypeScript then knows exactly which branch you're in.",
    useWhen: [
      "Success or failure results → { ok: true } | { ok: false }",
      "Several event or shape types → a kind field and switch",
      "string | string[] inputs → typeof or Array.isArray",
    ],
    code: [
      { source: `type Result =
  | { ok: true; value: number }
  | { ok: false; error: string };

function show(r: Result): string {
  if (r.ok) return \`value \${r.value}\`;   // narrowed to the ok branch
  return \`error \${r.error}\`;
}
console.log(show({ ok: true, value: 3 }));      // → value 3
console.log(show({ ok: false, error: "404" })); // → error 404

function len(x: string | string[] | null): number {
  if (x === null) return 0;
  if (typeof x === "string") return x.length;
  return x.length;                       // string[] here
}
console.log(len("abc"), len(["a", "b"]), len(null)); // → 3 2 0

type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.side ** 2;
    default: {
      const unreachable: never = s;      // errors if a case is missing
      return unreachable;
    }
  }
}
console.log(area({ kind: "square", side: 3 })); // → 9` },
    ],
    tips: [
      "Give each union member a literal kind field and switch on it.",
      "Assigning to never in the default branch makes TypeScript flag any case you forgot.",
      "typeof, in, instanceof, Array.isArray, and === all narrow.",
    ],
    watchOut: [
      "typeof null is \"object\". Check for null first.",
      "Narrowing is lost inside a callback if the variable can change; copy it to a const first.",
    ],
    say: "I'll model it as a discriminated union so the compiler checks every case.",
  },
  {
    id: "ts-generics", title: "Generics", guide: "ts",
    keywords: "generic generics <t> extends keyof constraint type parameter",
    summary: "A generic is a type parameter. It lets one function or class work for many types while keeping the link between input and output types.",
    useWhen: [
      "The return type depends on the argument type",
      "A container class: Stack<T>, Cache<K, V>",
      "Only needs some fields → <T extends { id: number }>",
      "Reading a property by name → <K extends keyof T>",
    ],
    code: [
      { source: `function first<T>(items: T[]): T | undefined {
  return items[0];
}
console.log(first([10, 20])); // → 10

function indexById<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map(item => [item.id, item]));
}
const users = indexById([{ id: 1, name: "ana" }, { id: 2, name: "bo" }]);
console.log(users.get(2)?.name); // → bo

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}
console.log(pluck([{ id: 1, name: "ana" }], "name")); // → [ 'ana' ]

class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
const s = new Stack<string>();
s.push("a");
console.log(s.pop()); // → a` },
    ],
    tips: [
      "Use a generic when the output type depends on the input type.",
      "extends adds a constraint: T must have at least those fields.",
      "K extends keyof T with T[K] gives the exact property type.",
    ],
    watchOut: [
      "A type parameter used only once adds noise; a plain type is clearer.",
      "any loses the link between input and output; a generic keeps it.",
    ],
    say: "A generic keeps the element type, so callers get a User back, not any.",
  },
  {
    id: "ts-utility", title: "Utility types", guide: "ts",
    keywords: "utility partial pick omit record readonly returntype awaited parameters",
    summary: "Utility types build new types from existing ones, so related types stay in sync when the original changes.",
    useWhen: [
      "Update payloads → Partial<Pick<T, ...>>",
      "Public view without secrets → Omit<T, \"password\">",
      "Lookup objects → Record<K, V>",
      "Type of a function's result → Awaited<ReturnType<typeof fn>>",
    ],
    code: [
      { source: `interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, "password">;
type UserPatch = Partial<Pick<User, "name" | "email">>;
type UsersById = Record<number, PublicUser>;

function update(user: User, patch: UserPatch): User {
  return { ...user, ...patch };
}
function toPublic({ password, ...rest }: User): PublicUser {
  return rest;
}

const u: User = { id: 1, name: "ana", email: "a@x.io", password: "pw" };
const byId: UsersById = { [u.id]: toPublic(update(u, { name: "Ana" })) };
console.log(byId[1]); // → { id: 1, name: 'Ana', email: 'a@x.io' }

async function load() { return { ok: true, count: 3 }; }
type Loaded = Awaited<ReturnType<typeof load>>; // { ok: boolean; count: number }
const sample: Loaded = { ok: false, count: 0 };
console.log(sample.count); // → 0` },
    ],
    tips: [
      "Derive types with Omit, Pick, and Partial instead of copying fields.",
      "Record<string, T> types a lookup object; a Map is often better at runtime.",
      "Awaited<ReturnType<typeof fn>> names an async function's result type.",
    ],
    watchOut: [
      "Partial makes every field optional, including ones you need. Pick first, then Partial.",
    ],
    say: "I'll derive PublicUser with Omit so it stays in sync with User.",
  },
  {
    id: "ts-unknown", title: "any, unknown, never", guide: "ts",
    keywords: "any unknown never type guard is as const satisfies assertion",
    summary: "Use unknown for data from outside and narrow it with a type guard. any turns checking off; never marks code that can't be reached.",
    useWhen: [
      "JSON.parse, fetch, user input → unknown, then a guard",
      "A reusable check → function isX(v: unknown): v is X",
      "Check a value but keep its exact type → satisfies",
      "Literal values you won't change → as const",
    ],
    code: [
      { source: `interface User { id: number; name: string }

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<User>;
  return typeof v.id === "number" && typeof v.name === "string";
}

const parsed: unknown = JSON.parse('{"id": 1, "name": "ana"}');
if (isUser(parsed)) console.log(parsed.name); // → ana

const routes = { home: "/", user: "/u" } as const;
type Route = (typeof routes)[keyof typeof routes]; // "/" | "/u"
const r: Route = routes.user;
console.log(r); // → /u

const config = {
  retries: 3,
  mode: "fast",
} satisfies Record<string, number | string>;
console.log(config.retries + 1); // → 4` },
    ],
    tips: [
      "Inside if (isUser(x)), x has type User.",
      "satisfies checks the shape but keeps the precise type (retries stays number).",
      "as const turns values into readonly literal types.",
    ],
    watchOut: [
      "as and ! silence the compiler without any runtime check.",
      "One any can spread through a chain of values and hide real errors.",
    ],
    say: "The response is unknown until this guard checks it, so I can't misuse it.",
  },
  {
    id: "ts-errors", title: "Fix common type errors", guide: "ts",
    keywords: "error errors fix possibly undefined implicit any index assignable object.keys",
    summary: "Read the last line of a type error first: it names the two types that don't match. Fix the type at its source, and prefer a guard over a cast.",
    useWhen: [
      "Object is possibly undefined → guard or default",
      "Parameter implicitly has an any type → annotate it",
      "Can't index with string → Record or keyof",
      "Type string is not assignable to a literal union → as const",
    ],
    code: [
      { source: `interface Item { id: number; name: string; tags?: string[] }
const items: Item[] = [{ id: 1, name: "ana" }];

// "Object is possibly 'undefined'": guard before use
const found = items.find(i => i.id === 1);
if (!found) throw new Error("missing");
console.log(found.name); // → ana

// optional field: default it
console.log((found.tags ?? []).length); // → 0

// "can't be used to index": type the lookup object
const labels: Record<string, string> = { a: "Alpha" };
const key: string = "a";
console.log(labels[key]); // → Alpha

// "string is not assignable to 'asc' | 'desc'": keep the literal
type Dir = "asc" | "desc";
const opts = { dir: "asc" } as const;
const dir: Dir = opts.dir;
console.log(dir); // → asc

// Exact local object: its runtime keys match the declared keys
const counts = { a: 1, b: 2 };
const total = (Object.keys(counts) as (keyof typeof counts)[])
  .reduce((sum, k) => sum + counts[k], 0);
console.log(total); // → 3` },
    ],
    tips: [
      "Fix the type where data enters (a signature, a fetch result) instead of casting at every use.",
      "A keyof cast is only safe if runtime keys match the type; validate outside objects first.",
      "A guard handles the bad case at runtime too; ! only hides it.",
      "let x = \"asc\" is widened to string; const keeps \"asc\".",
    ],
    watchOut: [
      "as and ! make the error go away without making the code safe.",
      "Adding any to make an error disappear moves the bug to runtime.",
    ],
    say: "This can be undefined, so I'll handle that case instead of using the non-null assertion.",
  },
  {
    id: "ts-classes", title: "Classes in TypeScript", guide: "ts",
    keywords: "class classes private readonly implements constructor lru cache",
    summary: "TypeScript classes add access modifiers, readonly, and implements on top of JavaScript classes. Constructor parameter properties declare and assign a field in one step.",
    useWhen: [
      "State that must stay correct across calls: a cache, a client, a rate limiter",
      "Several implementations of one interface",
    ],
    code: [
      { source: `interface Store<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}

class LruCache<K, V> implements Store<K, V> {
  private items = new Map<K, V>();         // keeps insertion order

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new RangeError("capacity must be >= 1");
  }

  get(key: K): V | undefined {
    if (!this.items.has(key)) return undefined;
    const value = this.items.get(key)!;
    this.items.delete(key);                 // move to newest
    this.items.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size > this.capacity) {
      const oldest = this.items.keys().next().value!;
      this.items.delete(oldest);
    }
  }
}

const cache = new LruCache<string, number>(2);
cache.set("a", 1);
cache.set("b", 2);
cache.get("a");     // a is now newest
cache.set("c", 3);  // evicts b
console.log(cache.get("b"), cache.get("a")); // → undefined 1` },
    ],
    tips: [
      "private readonly capacity in the constructor declares and assigns the field.",
      "implements makes the compiler check the class against an interface.",
      "A Map keeps insertion order, so delete then set moves a key to newest.",
    ],
    watchOut: [
      "private is compile-time only; #field is private at runtime too.",
      "Methods passed as callbacks lose this; use arrow fields or bind.",
    ],
    say: "A Map gives O(1) get and set and keeps order, so eviction is O(1) too.",
  },
  {
    id: "pick-loop", title: "Which loop?", guide: "loops",
    keywords: "loop which loop for while foreach for...of choose",
    summary: "Ask one question: do you already have the items, or can you only say when to stop? Then pick the simplest loop that lets you stop early if you need to.",
    useWhen: [
      "Visit each item → for...of",
      "Compare neighbors or walk backwards → index loop",
      "Unknown number of steps → while",
      "Transform or filter → map / filter",
    ],
    code: [
      { source: `const prices = [3, 12, 7, 20];

let total = 0;
for (const p of prices) total += p;          // have the items
console.log(total); // → 42

for (let i = 1; i < prices.length; i++) {    // need neighbors
  if (prices[i] < prices[i - 1]) {
    console.log("drop at", i); // → drop at 2
    break;
  }
}

let budget = 30, bought = 0;
while (bought < prices.length && budget >= prices[bought]) {
  budget -= prices[bought++];                // stop when money runs out
}
console.log(bought, budget); // → 3 8

console.log(prices.filter(p => p > 5).map(p => p * 2)); // → [ 24, 14, 40 ]
console.log(prices.find(p => p > 10)); // → 12` },
    ],
    tips: [
      "If you can name the list, write for...of. If you can only name the stop condition, write while.",
      "Use the index loop when you compare neighbors or go backwards.",
      "Use a plain loop when you need break, several totals, or await.",
    ],
    watchOut: [
      "forEach can't break, and await inside it doesn't wait.",
      "for...in walks keys as strings and inherited keys. Use for...of on arrays.",
    ],
    say: "I already have the array, so for...of; I need to stop early, so not forEach.",
  },
  {
    id: "loop-forms", title: "Loop syntax", guide: "loops",
    keywords: "loop syntax for of entries object.entries while do break continue label",
    summary: "The loop shapes you'll type in an interview, plus the three ways out: continue, break, and return.",
    useWhen: [
      "Index and value → entries()",
      "Plain object → Object.entries",
      "At least once (paging) → do...while",
      "Leave nested loops → a label, or return from a function",
    ],
    code: [
      { source: `const xs = ["a", "b", "c"];
for (const [i, x] of xs.entries()) {
  if (i === 1) continue;                  // skip one
  console.log(i, x); // → 0 a / 2 c
}

const scores = new Map([["ana", 3], ["bo", 5]]);
for (const [name, score] of scores) {
  if (score > 4) console.log(name); // → bo
}

const config = { retries: 3, debug: false };
for (const [key, value] of Object.entries(config)) {
  console.log(\`\${key}=\${value}\`); // → retries=3 / debug=false
}

let n = 40, steps = 0;
while (n > 1) {                           // start, test, move
  n = Math.floor(n / 2);
  steps++;
}
console.log(steps); // → 5

outer: for (const row of [[1, 2], [3, 4]]) {
  for (const cell of row) {
    if (cell === 3) break outer;          // leave both loops
    console.log(cell); // → 1 / 2
  }
}` },
    ],
    tips: [
      "for...of works on arrays, strings, Maps, Sets, and generators.",
      "A while loop needs a start, a test, and a line that moves toward the end.",
      "do...while runs at least once, which suits paging.",
    ],
    watchOut: [
      "n / 2 is a decimal in JavaScript. Use Math.floor.",
      "Changing an array's length while looping over it skips or repeats items.",
    ],
    say: "I'll use entries() so I get the index without a separate counter.",
  },
  {
    id: "pick-collection", title: "Which collection?", guide: "loops",
    keywords: "collection array map set object record which collection queue stack",
    summary: "Pick the container by the operation you repeat most: keep order, look up by key, or check whether you've seen something.",
    useWhen: [
      "Order and positions → Array",
      "Lookup by any key type → Map",
      "Membership or dedupe → Set",
      "Fixed settings → object or Record",
    ],
    code: [
      { source: `const steps: string[] = ["login", "search"];          // order
const priceById = new Map<number, number>([[1, 3]]);  // lookup by key
const config: Record<string, number> = { retries: 3 };
const seen = new Set<string>(["a@x.io"]);             // membership

steps.push("buy");
console.log(priceById.get(2) ?? 0);  // → 0
console.log(seen.has("a@x.io"));     // → true

const visited = new Set<string>();
const key = (r: number, c: number) => \`\${r},\${c}\`;   // pair as a key
visited.add(key(2, 3));
console.log(visited.has(key(2, 3))); // → true

const queue = [1, 2, 3];
let head = 0;
console.log(queue[head++], queue[head++]); // → 1 2
console.log(steps.length, priceById.size, config.retries); // → 3 1 3` },
    ],
    tips: [
      "A Map keeps key types and has .size; object keys become strings.",
      "new Set(arr) dedupes; [...set] turns it back into an array.",
      "Use a Set when the question is have I seen this?",
    ],
    watchOut: [
      "A Set of arrays compares by reference, so [1, 2] isn't found. Use a string key.",
      "shift() is O(n). For a big queue, keep a head index.",
    ],
    say: "I'll use a Set for seen IDs, because I check membership on every item.",
  },
  {
    id: "count-group", title: "Count and group", guide: "loops",
    keywords: "count frequency group anagram tally most common",
    summary: "Counting and grouping are the most common Map patterns. Each is one pass over the input.",
    useWhen: [
      "How many times does each item appear?",
      "Most common item",
      "Group anagrams, or records by category",
    ],
    code: [
      { source: `const words = ["eat", "tea", "tan", "ate", "nat", "eat"];

const counts = new Map<string, number>();
for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
console.log(counts.get("eat")); // → 2

let top: [string, number] = ["", 0];
for (const entry of counts) if (entry[1] > top[1]) top = entry;
console.log(top); // → [ 'eat', 2 ]

const groups = new Map<string, string[]>();
for (const w of new Set(words)) {
  const key = [...w].sort().join("");    // anagrams share a key
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(w);
}
console.log([...groups.values()]);
// → [ [ 'eat', 'tea', 'ate' ], [ 'tan', 'nat' ] ]` },
    ],
    tips: [
      "?? 0 starts a new key at zero; get(k)! is safe right after you set it.",
      "[...map] gives [key, value] pairs you can sort.",
      "Finding the max in one pass is O(n); sorting first is O(n log n).",
    ],
    watchOut: [
      "counts.get(w) + 1 is NaN for a new key without ?? 0.",
      "Number keys in a plain object come back as strings.",
    ],
    say: "One pass builds the counts in a Map, then one pass finds the max: O(n).",
  },
  {
    id: "big-o", title: "How fast is it?", guide: "loops",
    keywords: "big o complexity time space fast slow o(n) o(1) o(log n)",
    summary: "Big O says how work grows with input size. The classic improvement swaps a search inside a loop for a Map or Set lookup.",
    useWhen: [
      "O(1): index and pop; Map/Set lookup on average; push amortized",
      "O(log n): binary search",
      "O(n): one pass",
      "O(n log n): sorting",
      "O(n²): nested loops over the same data",
    ],
    code: [
      { source: `function hasDuplicateSlow(nums: number[]): boolean {  // O(n²) time
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
  return false;
}

function hasDuplicate(nums: number[]): boolean {      // O(n) time, O(n) space
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

console.log(hasDuplicateSlow([3, 1, 3]), hasDuplicate([3, 1, 3])); // → true true` },
    ],
    tips: [
      "At n = 1,000, O(n) is about 1,000 steps and O(n²) about 1,000,000.",
      "Rough limits: n up to 10⁴ allows O(n²); 10⁵ to 10⁶ needs O(n log n) or O(n).",
      "Big O ignores constants: two passes is still O(n).",
    ],
    watchOut: [
      "includes or indexOf inside a loop is a hidden O(n²).",
      "Spreading in a loop ([...acc, x]) copies every time: O(n²).",
    ],
    say: "The nested loop is O(n²); with a Set it's one pass, O(n) time and O(n) space.",
  },
  {
    id: "sorting", title: "Sorting", guide: "loops",
    keywords: "sort sorting comparator localecompare tosorted descending",
    summary: "Always pass a compare function. It returns a negative number when a comes first, positive when b comes first, and 0 for a tie.",
    useWhen: [
      "Numbers → (a, b) => a - b",
      "Text → a.localeCompare(b)",
      "Several rules → first rule || second rule",
      "Keep the original → toSorted",
    ],
    code: [
      { source: `const nums = [10, 9, 1];
console.log([...nums].sort());               // → [ 1, 10, 9 ]
console.log(nums.toSorted((a, b) => a - b)); // → [ 1, 9, 10 ]

type Player = { name: string; score: number };
const players: Player[] = [
  { name: "bo", score: 7 },
  { name: "ana", score: 7 },
  { name: "cy", score: 9 },
];
const ranked = players.toSorted(
  (a, b) => b.score - a.score || a.name.localeCompare(b.name),
);
console.log(ranked.map(p => p.name)); // → [ 'cy', 'ana', 'bo' ]` },
    ],
    tips: [
      "Chain tie-breakers with ||.",
      "Sorting is stable: equal items keep their original order.",
      "Sorting costs O(n log n); say it when you do it.",
    ],
    watchOut: [
      "sort() with no compare function sorts numbers as strings.",
      "sort() changes and returns the same array; copy it or use toSorted().",
    ],
    say: "I'll sort by score descending and break ties by name.",
  },
  {
    id: "two-sum", title: "Two Sum (hash map)", guide: "patterns",
    keywords: "two sum pair target hash map complement",
    summary: "For each number, the partner you need is target minus that number. A Map of the numbers you have already seen tells you in O(1) whether that partner exists.",
    useWhen: [
      "Find a pair that adds up to a target",
      "Any have I seen the partner? problem",
      "Pairs with a given difference",
    ],
    code: [
      { source: `function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();   // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need)!, i];
    seen.set(nums[i], i);                   // store after checking
  }
  return null;
}

console.log(twoSum([2, 7, 11, 15], 9)); // → [ 0, 1 ]
console.log(twoSum([3, 3], 6));         // → [ 0, 1 ]
console.log(twoSum([1, 2], 9));         // → null` },
    ],
    tips: [
      "Say the brute force first: every pair, O(n²). Then improve to O(n).",
      "Use has(), not get(), because index 0 is falsy.",
      "O(n) time, O(n) extra space.",
    ],
    watchOut: [
      "Storing before checking lets a number pair with itself.",
      "Ask: return indexes or values? What if there's no pair?",
    ],
    say: "I trade O(n) memory for one pass: each partner is one Map lookup.",
  },
  {
    id: "two-pointers", title: "Two pointers", guide: "patterns",
    keywords: "two pointers palindrome sorted pair remove duplicates in place",
    summary: "Two indexes walk toward each other (or one reads while one writes). On sorted data each step rules out a whole row of pairs, so it's O(n).",
    useWhen: [
      "Pair with a target sum in a sorted array",
      "Palindrome checks",
      "Remove duplicates in place",
      "Reverse in place",
    ],
    code: [
      { source: `function pairInSorted(a: number[], target: number): [number, number] | null {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const sum = a[l] + a[r];
    if (sum === target) return [l, r];
    if (sum < target) l++;     // need bigger
    else r--;                  // need smaller
  }
  return null;
}
console.log(pairInSorted([1, 3, 4, 6, 9], 10)); // → [ 0, 4 ]

function isPalindrome(s: string): boolean {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  let l = 0, r = t.length - 1;
  while (l < r) if (t[l++] !== t[r--]) return false;
  return true;
}
console.log(isPalindrome("A man, a plan, a canal: Panama")); // → true

function dedupeSorted(a: number[]): number {  // returns the new length
  let write = 0;
  for (let read = 0; read < a.length; read++) {
    if (read === 0 || a[read] !== a[read - 1]) a[write++] = a[read];
  }
  return write;
}
console.log(dedupeSorted([1, 1, 2, 3, 3])); // → 3` },
    ],
    tips: [
      "Works when the input is sorted, or when you compare from both ends.",
      "Each step moves one pointer, so the loop is O(n).",
      "A read pointer and a write pointer edit an array in place.",
    ],
    watchOut: [
      "Unsorted input: sort first (O(n log n)) or use a Map.",
      "Use l < r, not l <= r, when a pair needs two different items.",
    ],
    say: "It's sorted, so I move whichever pointer brings the sum closer to the target.",
  },
  {
    id: "sliding-window", title: "Sliding window", guide: "patterns",
    keywords: "sliding window substring longest subarray k in a row",
    summary: "A window over consecutive items grows on the right and shrinks on the left. Each item enters and leaves once, so it's O(n) instead of checking every substring.",
    useWhen: [
      "Longest or shortest run that meets a rule",
      "Best sum of k items in a row",
      "Substring with at most k distinct characters",
    ],
    code: [
      { source: `function longestUnique(s: string): number {
  const lastSeen = new Map<string, number>();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    const prev = lastSeen.get(s[i]);
    if (prev !== undefined && prev >= start) start = prev + 1; // shrink
    lastSeen.set(s[i], i);
    best = Math.max(best, i - start + 1);                       // grow
  }
  return best;
}
console.log(longestUnique("abcabcbb")); // → 3

function maxSumOfK(nums: number[], k: number): number {
  if (!Number.isInteger(k) || k < 1 || k > nums.length) {
    throw new RangeError("k must be between 1 and the array length");
  }
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];
  let best = windowSum;
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k];   // add new, drop oldest
    best = Math.max(best, windowSum);
  }
  return best;
}
console.log(maxSumOfK([2, 1, 5, 1, 3, 2], 3)); // → 9` },
    ],
    tips: [
      "Fixed size k: add the new item and subtract the one leaving.",
      "Variable size: grow the right edge, and move the left edge when the window breaks the rule.",
      "Keep the window's state (counts, last positions) in a Map.",
    ],
    watchOut: [
      "Check prev >= start so old positions outside the window don't move it.",
      "Handle k larger than the array.",
    ],
    say: "Each character enters and leaves the window once, so this is O(n).",
  },
  {
    id: "stack", title: "Stack", guide: "patterns",
    keywords: "stack brackets parentheses balanced next greater monotonic undo",
    summary: "A stack gives you the most recent item first. Use it whenever the last thing opened must be the first thing closed.",
    useWhen: [
      "Matching brackets or tags",
      "Undo history",
      "Next greater element (monotonic stack)",
      "Iterative DFS",
    ],
    code: [
      { source: `function isBalanced(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) return false;
  }
  return stack.length === 0;
}
console.log(isBalanced("{[()]}"), isBalanced("(]"), isBalanced("(("));
// → true false false

function nextGreater(nums: number[]): number[] {
  const result = new Array<number>(nums.length).fill(-1);
  const waiting: number[] = [];            // indexes still looking
  nums.forEach((n, i) => {
    while (waiting.length && nums[waiting.at(-1)!] < n) {
      result[waiting.pop()!] = n;
    }
    waiting.push(i);
  });
  return result;
}
console.log(nextGreater([2, 1, 5, 3])); // → [ 5, 5, -1, -1 ]` },
    ],
    tips: [
      "An array is a stack: push, pop, and at(-1) to peek.",
      "End check: an empty stack means everything matched.",
      "A stack of indexes solves next greater or warmer-day problems in O(n).",
    ],
    watchOut: [
      "pop() on an empty array returns undefined; compare carefully.",
      "Forgetting the final length check accepts \"((\".",
    ],
    say: "The most recent open bracket has to close first, so a stack fits.",
  },
  {
    id: "binary-search", title: "Binary search", guide: "patterns",
    keywords: "binary search sorted lower bound insert position log n",
    summary: "On sorted data, compare with the middle and throw away the half that can't contain the answer. A million items take about 20 steps.",
    useWhen: [
      "Find a value in a sorted array",
      "First position where a condition becomes true",
      "Insert position",
      "Smallest value that works (search the answer)",
    ],
    code: [
      { source: `function binarySearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);           // floor of the midpoint
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
console.log(binarySearch([1, 3, 5, 7, 9], 7)); // → 3

// First index where a[i] >= target (the insert position)
function lowerBound(a: number[], target: number): number {
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (a[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
console.log(lowerBound([1, 3, 3, 5], 3), lowerBound([1, 3, 5], 4)); // → 1 2` },
    ],
    tips: [
      "lo <= hi with mid ± 1 finds an exact match.",
      "lo < hi with hi = mid finds the first position that works.",
      "It also works on any yes/no condition that flips once.",
    ],
    watchOut: [
      "Decide whether hi is inclusive or exclusive and stick to it.",
      "Needs sorted data; sorting first costs O(n log n).",
    ],
    say: "It's sorted, so I can halve the range each step: O(log n).",
  },
  {
    id: "bfs", title: "BFS: fewest steps", guide: "patterns",
    keywords: "bfs breadth first search shortest path grid queue maze",
    summary: "Breadth-first search explores in rings: everything 1 step away, then 2, and so on. The first time it reaches the goal is the shortest path in an unweighted grid or graph.",
    useWhen: [
      "Fewest moves in a grid or maze",
      "Shortest path when every edge costs the same",
      "Level-order tree traversal",
      "Spreading problems (rotting oranges)",
    ],
    code: [
      { source: `function shortestPath(grid: string[]): number {
  if (!grid.length || !grid[0].length) return -1;
  const rows = grid.length, cols = grid[0].length;
  if (grid.some(row => row.length !== cols)) return -1;
  if (grid[0][0] === "#" || grid[rows - 1][cols - 1] === "#") return -1;
  const queue: [number, number, number][] = [[0, 0, 0]]; // row, col, steps
  const seen = new Set<string>(["0,0"]);
  const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head++) {
    const [r, c, steps] = queue[head];
    if (r === rows - 1 && c === cols - 1) return steps;
    for (const [dr, dc] of moves) {
      const nr = r + dr, nc = c + dc;
      const key = \`\${nr},\${nc}\`;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (grid[nr][nc] === "#" || seen.has(key)) continue;
      seen.add(key);                       // mark when queued
      queue.push([nr, nc, steps + 1]);
    }
  }
  return -1;
}

console.log(shortestPath([
  "..#",
  ".##",
  "...",
])); // → 4` },
    ],
    tips: [
      "Mark a cell seen when you add it to the queue, not when you take it out.",
      "A head index keeps the queue O(1) per step; shift() is O(n).",
      "O(rows × cols) time and space.",
    ],
    watchOut: [
      "Without a seen set, cycles loop forever.",
      "Check bounds before reading grid[nr][nc].",
    ],
    say: "BFS goes level by level, so the first time I reach the goal is the shortest path.",
  },
  {
    id: "dfs", title: "DFS and recursion", guide: "patterns",
    keywords: "dfs depth first search recursion tree islands graph backtracking",
    summary: "Depth-first search goes as deep as it can before backing up. Write it recursively: a base case, a call on something smaller, and a way to combine the results.",
    useWhen: [
      "Tree problems: depth, sums, paths",
      "Count connected regions (islands)",
      "Explore every option (backtracking)",
      "Detect cycles in a graph",
    ],
    code: [
      { source: `type TreeNode = { val: number; left?: TreeNode; right?: TreeNode };

function maxDepth(node?: TreeNode): number {
  if (!node) return 0;                               // base case
  return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
}
const tree: TreeNode = {
  val: 1,
  left: { val: 2, left: { val: 4 } },
  right: { val: 3 },
};
console.log(maxDepth(tree)); // → 3

function countIslands(grid: string[][]): number {
  const sink = (r: number, c: number): void => {
    if (grid[r]?.[c] !== "1") return;                // outside or water
    grid[r][c] = "0";                                // mark visited
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  };
  let islands = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === "1") { islands++; sink(r, c); }
    }
  }
  return islands;
}
console.log(countIslands([
  ["1", "1", "0"],
  ["0", "0", "1"],
  ["1", "0", "1"],
])); // → 3` },
    ],
    tips: [
      "Write the base case first, then trust the recursive call.",
      "grid[r]?.[c] reads safely outside the grid.",
      "Very deep input can overflow the call stack; an explicit stack array avoids that.",
    ],
    watchOut: [
      "A missing base case recurses forever.",
      "Changing the input grid is fast; ask whether it's allowed, or use a seen Set.",
    ],
    say: "My base case is an empty node, which has depth 0.",
  },
  {
    id: "memo-dp", title: "Memoization and DP", guide: "patterns",
    keywords: "memo memoization dp dynamic programming fibonacci stairs coin change",
    summary: "When a recursive solution solves the same subproblem again and again, save each answer (memoization) or fill a table from small to large (dynamic programming).",
    useWhen: [
      "Counting ways (stairs, paths)",
      "Fewest coins, cheapest cost",
      "Anything where today's answer uses earlier answers",
    ],
    code: [
      { source: `const memo = new Map<number, number>();
function climbWays(n: number): number {          // top-down
  if (n <= 1) return 1;
  if (memo.has(n)) return memo.get(n)!;
  const result = climbWays(n - 1) + climbWays(n - 2);
  memo.set(n, result);
  return result;
}
console.log(climbWays(10)); // → 89

function fib(n: number): number {                // bottom-up, O(1) space
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}
console.log(fib(10), fib(50)); // → 55 12586269025

function coinChange(coins: number[], amount: number): number {
  const best = new Array<number>(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1);
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}
console.log(coinChange([1, 2, 5], 11)); // → 3` },
    ],
    tips: [
      "Plain recursion with two calls repeats work exponentially; a memo makes it O(n).",
      "Bottom-up fills a table from the smallest answers.",
      "If each answer needs only the last two, keep two variables.",
    ],
    watchOut: [
      "Numbers stay exact only up to Number.MAX_SAFE_INTEGER; use BigInt for huge results.",
      "Keep the memo outside the function, or pass it in, so it survives between calls.",
    ],
    say: "The same subproblems repeat, so I'll cache them; that makes it O(n).",
  },
  {
    id: "intervals", title: "Merge intervals", guide: "patterns",
    keywords: "intervals merge overlapping ranges meetings",
    summary: "Sort by start time; then each interval either overlaps the last merged one (extend it) or starts a new one.",
    useWhen: [
      "Merge overlapping ranges",
      "Meeting rooms and free time",
      "Insert an interval into a sorted list",
    ],
    code: [
      { source: `type Interval = [start: number, end: number];

function merge(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = intervals.toSorted((a, b) => a[0] - b[0]);
  const out: Interval[] = [[sorted[0][0], sorted[0][1]]];
  for (const [start, end] of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end); // overlap
    else out.push([start, end]);
  }
  return out;
}

console.log(merge([[8, 10], [1, 3], [2, 6], [15, 18]]));
// → [ [ 1, 6 ], [ 8, 10 ], [ 15, 18 ] ]` },
    ],
    tips: [
      "After sorting, only the last merged interval can overlap the next one.",
      "O(n log n) for the sort, then O(n).",
      "Ask whether touching ranges like [1, 2] and [2, 3] count as overlapping.",
    ],
    watchOut: [
      "Copy before sorting so you don't change the input.",
      "Handle the empty list.",
    ],
    say: "Sorting by start means I only compare each interval with the last merged one.",
  },
  {
    id: "fetch-typed", title: "Fetch typed data", guide: "practical",
    keywords: "fetch api http request response json validate res.ok timeout abort",
    summary: "fetch rejects on network failures and aborted requests, but not HTTP error statuses. Check res.ok yourself. The JSON is unknown until you validate it; a type annotation alone checks nothing.",
    useWhen: [
      "Load data from an API",
      "Any request that can fail or hang",
      "Code you want to test without a network (pass fetch in)",
    ],
    code: [
      { source: `interface Todo { id: number; title: string; done: boolean }

class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(\`GET \${url} failed with \${status}\`);
    this.name = "HttpError";
  }
}

function isTodo(x: unknown): x is Todo {
  if (typeof x !== "object" || x === null) return false;
  const t = x as Partial<Todo>;
  return typeof t.id === "number" && typeof t.title === "string" &&
    typeof t.done === "boolean";
}

async function getTodos(fetchFn: typeof fetch, url: string): Promise<Todo[]> {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new HttpError(res.status, url);
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data.every(isTodo)) {
    throw new Error("unexpected response shape");
  }
  return data;
}

const fakeFetch: typeof fetch = async input =>
  String(input).endsWith("/todos")
    ? new Response(JSON.stringify([{ id: 1, title: "ship", done: false }]))
    : new Response("not found", { status: 404 });

async function main() {
  const todos = await getTodos(fakeFetch, "https://api.test/todos");
  console.log(todos[0].title); // → ship
  try {
    await getTodos(fakeFetch, "https://api.test/missing");
  } catch (e) {
    if (e instanceof HttpError) console.log(e.status); // → 404
  }
}
main();` },
    ],
    tips: [
      "Check res.ok (or res.status); fetch resolves on 404 and 500.",
      "Type the JSON as unknown, then narrow it with a guard.",
      "Pass fetch in as a parameter so a test can use a fake.",
      "AbortSignal.timeout(ms) stops a hung request.",
    ],
    watchOut: [
      "res.json() as Promise<T> trusts the server blindly.",
      "Forgetting await gives you a Promise, not the data.",
    ],
    say: "fetch doesn't throw on a 404, so I check res.ok and throw an error with the status.",
  },
  {
    id: "transform", title: "Transform records", guide: "practical",
    keywords: "transform data records group sum aggregate report normalize dedupe",
    summary: "Most practical tasks are filter, then aggregate in a Map, then shape and sort the result. Keep each step small so you can print and check it.",
    useWhen: [
      "Totals or counts per customer, category, or day",
      "Look up records by id",
      "Unique values",
      "Reshape API data for the UI",
    ],
    code: [
      { source: `interface Order {
  id: number;
  customer: string;
  amount: number;
  status: "paid" | "refunded";
}

const orders: Order[] = [
  { id: 1, customer: "ana", amount: 30, status: "paid" },
  { id: 2, customer: "bo", amount: 20, status: "paid" },
  { id: 3, customer: "ana", amount: 15, status: "refunded" },
  { id: 4, customer: "ana", amount: 10, status: "paid" },
];

const totals = new Map<string, number>();
for (const o of orders) {
  if (o.status !== "paid") continue;
  totals.set(o.customer, (totals.get(o.customer) ?? 0) + o.amount);
}

const report = [...totals]
  .map(([customer, total]) => ({ customer, total }))
  .toSorted((a, b) => b.total - a.total);
console.log(report);
// → [ { customer: 'ana', total: 40 }, { customer: 'bo', total: 20 } ]

const byId = new Map(orders.map(o => [o.id, o]));
console.log(byId.get(3)?.status); // → refunded
console.log([...new Set(orders.map(o => o.customer))]); // → [ 'ana', 'bo' ]` },
    ],
    tips: [
      "Filter first, then aggregate, then sort; each step is easy to test.",
      "A Map keyed by id turns repeated O(n) searches into O(1) lookups.",
      "Return new objects; don't change the input records.",
    ],
    watchOut: [
      "A reduce that builds objects is hard to read under pressure; a for...of loop is fine.",
      "Money as floats drifts; work in cents or round at the end.",
    ],
    say: "I'll keep paid orders, total them per customer in a Map, then sort the totals.",
  },
  {
    id: "concurrency", title: "Async in parallel", guide: "practical",
    keywords: "concurrency parallel promise.all limit rate limit workers",
    summary: "Start independent requests together with Promise.all. When an API limits you, run a few workers that each pull the next item.",
    useWhen: [
      "Independent requests → Promise.all",
      "Order matters or calls depend on each other → for...of with await",
      "Too many requests in flight → a concurrency limit",
      "Some may fail → Promise.allSettled",
    ],
    code: [
      { source: `const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
let running = 0, peak = 0;

async function fetchItem(id: number): Promise<string> {
  running++;
  peak = Math.max(peak, running);
  await sleep(10);
  running--;
  return \`item\${id}\`;
}

async function mapLimit<T, R>(
  items: T[], limit: number, fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;                     // claim the next index
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function main() {
  const all = await Promise.all([1, 2, 3].map(fetchItem));
  console.log(all); // → [ 'item1', 'item2', 'item3' ]

  peak = 0;
  const limited = await mapLimit([1, 2, 3, 4, 5], 2, fetchItem);
  console.log(limited.length, peak); // → 5 2
}
main();` },
    ],
    tips: [
      "Promise.all takes as long as the slowest request.",
      "next++ is safe because JavaScript runs one piece of code at a time.",
      "Results keep the input order because each worker writes to results[i].",
    ],
    watchOut: [
      "forEach with an async callback starts everything and doesn't wait.",
      "Promise.all rejects on the first failure; use allSettled to keep the rest.",
      "A concurrency cap is not requests per second; time-based limits also need pacing.",
    ],
    say: "They're independent, so Promise.all; with a rate limit, I'd cap it at k at a time.",
  },
  {
    id: "retry-paginate", title: "Retry and paginate", guide: "practical",
    keywords: "retry backoff paginate pagination cursor pages async generator",
    summary: "Retry only failures that might pass on a second try, and wait longer each time. Page through results until the API stops returning a cursor.",
    useWhen: [
      "Timeouts, 429, and 5xx responses → retry with backoff",
      "Results split into pages → follow the cursor",
      "Stream items to the caller → async generator",
    ],
    code: [
      { source: `const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
  call: () => Promise<T>, shouldRetry: (error: unknown) => boolean,
  waits = [10, 20, 40],
): Promise<T> {
  for (const ms of waits) {
    try {
      return await call();
    } catch (error) {
      if (!shouldRetry(error)) throw error;
      await sleep(ms);                     // back off, then try again
    }
  }
  return call();                           // last try: let the error out
}

class HttpError extends Error {
  constructor(public status: number) { super(String(status)); }
}
const retryable = (e: unknown) => e instanceof HttpError &&
  (e.status === 429 || (e.status >= 500 && e.status <= 599));

let attempts = 0;
async function flaky(): Promise<string> {
  attempts++;
  if (attempts < 3) throw new HttpError(503);
  return "ok";
}

interface Page { items: number[]; next: string | null }
const pages: Record<string, Page> = {
  start: { items: [1, 2], next: "p2" },
  p2: { items: [], next: "p3" },          // empty page, not the end
  p3: { items: [3], next: null },
};

async function* allItems(getPage: (cursor: string) => Promise<Page>) {
  let cursor: string | null = "start";
  while (cursor !== null) {
    const page: Page = await getPage(cursor);
    yield* page.items;
    cursor = page.next;
  }
}

async function main() {
  console.log(await withRetry(flaky, retryable), attempts); // → ok 3
  const seen: number[] = [];
  for await (const item of allItems(async c => pages[c])) seen.push(item);
  console.log(seen); // → [ 1, 2, 3 ]
}
main();` },
    ],
    tips: [
      "The predicate retries 429 and 5xx; add known timeout errors if the operation is safe to repeat.",
      "Wait longer after each failure (backoff) so you don't hammer a struggling server.",
      "An async generator lets callers stop early with break.",
    ],
    watchOut: [
      "Stopping on an empty page misses later pages; the cursor is the signal.",
      "Retrying a POST can do the work twice; use an idempotency key.",
    ],
    say: "I retry only transient failures with backoff, and page until the cursor is null.",
  },
  {
    id: "debounce", title: "Debounce and throttle", guide: "practical",
    keywords: "debounce throttle search box scroll timer",
    summary: "Debounce waits until calls stop for a moment, then runs once. Throttle runs at most once per interval. Both are closures over a timer or timestamp.",
    useWhen: [
      "Search as you type → debounce",
      "Scroll, resize, mouse move → throttle",
      "Save drafts after typing pauses → debounce",
    ],
    code: [
      { source: `function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer);                       // restart the wait
    timer = setTimeout(() => fn(...args), ms);
  };
}

function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = -Infinity;
  return (...args: A): void => {
    const now = Date.now();
    if (now - last >= ms) {                    // at most once per window
      last = now;
      fn(...args);
    }
  };
}

const searched: string[] = [];
const search = debounce((q: string) => { searched.push(q); }, 20);
search("t"); search("ty"); search("typ");       // only the last runs

const clicks: number[] = [];
const click = throttle((n: number) => { clicks.push(n); }, 1000);
click(1); click(2); click(3);                  // only the first runs

setTimeout(() => console.log(searched, clicks), 50); // → [ 'typ' ] [ 1 ]` },
    ],
    tips: [
      "A extends unknown[] keeps the wrapped function's argument types.",
      "ReturnType<typeof setTimeout> works in both the browser and Node.",
      "Cancel the pending timer when a component unmounts.",
    ],
    watchOut: [
      "Debouncing a function that must run every time (like saving each keystroke) loses calls.",
      "this inside fn is lost; wrap methods in an arrow function first.",
    ],
    say: "Debounce waits until typing stops, so we send one request instead of one per key.",
  },
  {
    id: "five-steps", title: "Five steps", guide: "plan",
    keywords: "steps process approach plan stuck talk out loud",
    summary: "Use the same five steps on every coding question and say each one out loud. They keep you from freezing and show your thinking even if time runs out.",
    useWhen: [
      "The first minute of any coding question",
      "Whenever you get stuck",
    ],
    code: [
      { caption: "Steps 3 to 5 on one task", source: `// Task: first character that appears once. "swiss" -> "w"

function firstUniqueSlow(s: string): string | null {   // step 3: O(n²)
  for (const ch of s) if (s.indexOf(ch) === s.lastIndexOf(ch)) return ch;
  return null;
}

function firstUnique(s: string): string | null {       // step 4: O(n)
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of s) if (counts.get(ch) === 1) return ch;
  return null;
}

for (const s of ["swiss", "", "aabb", "x"]) {           // step 5: edges
  console.log(JSON.stringify(s), firstUnique(s), firstUniqueSlow(s));
}
// → "swiss" w w / "" null null / "aabb" null null / "x" x x` },
    ],
    tips: [
      "1. Repeat the task in your own words and work one example.",
      "2. Ask about edge cases: empty, one item, duplicates, negatives, no answer.",
      "3. Say the simple way first, and how slow it is.",
      "4. Find the repeated work and remove it, usually with a Map, a Set, sorting, or two pointers.",
      "5. Walk your example through the code, then run the edge cases.",
    ],
    watchOut: [
      "Typing before you have an example usually means solving the wrong problem.",
      "If time runs out, say the next test you'd add.",
    ],
    say: "Let me start with a simple version, then remove the repeated work.",
  },
  {
    id: "edge-cases", title: "Edge cases", guide: "plan",
    keywords: "edge cases empty null test checklist",
    summary: "Run these inputs before you say done. Most bugs live at the edges, not in the normal case.",
    useWhen: [
      "Step 2: ask about them",
      "Step 5: test them",
    ],
    code: [
      { source: `function largest(nums: number[]): number | null {
  if (nums.length === 0) return null;  // empty input
  let best = nums[0];                  // not 0: values may be negative
  for (const n of nums) if (n > best) best = n;
  return best;
}

const cases: [number[], number | null][] = [
  [[], null], [[7], 7], [[2, 2], 2], [[-5, -1], -1], [[3, 2, 1], 3],
];
console.log(cases.every(([input, want]) => largest(input) === want)); // → true` },
    ],
    tips: [
      "Empty input",
      "One item",
      "Duplicates",
      "Zero or negative numbers",
      "Already sorted, or reversed",
      "No answer: what should it return?",
      "Very large input: does it fit the time limit?",
    ],
    watchOut: [
      "Starting best at 0 breaks when every number is negative.",
      "undefined vs null vs -1: agree on what no answer returns.",
    ],
    say: "Let me run the empty case and a single item before I call it done.",
  },
  {
    id: "hints", title: "Task words → pattern", guide: "plan",
    keywords: "hints pattern which pattern task words keywords approach",
    summary: "Certain words in a task point to a known approach. Say the hint out loud, then check it against your example before you commit.",
    useWhen: [
      "count, duplicates, seen before → Map or Set",
      "pair adds up to a target → Map of values seen",
      "sorted, compare both ends → two pointers",
      "k in a row, longest stretch → sliding window",
      "brackets, undo, most recent → stack",
      "fewest steps on a grid → BFS",
      "connected regions, all paths → DFS",
      "overlapping ranges → sort by start, then merge",
      "find in sorted data → binary search",
      "repeated subproblems → memo or DP",
    ],
    code: [],
    tips: [
      "Sorting first is often the trick itself: O(n log n), and then two pointers or merging work.",
      "If brute force is O(n²), ask what you're searching for repeatedly; that's what goes in a Map or Set.",
    ],
    watchOut: [
      "A hint is a guess. Check it on your example before committing.",
    ],
    say: "Overlapping ranges usually means sort by start, then one pass to merge.",
  },
  {
    id: "terms", title: "Terms", guide: "plan",
    keywords: "terms glossary vocabulary definitions",
    summary: "Words interviewers use without explaining them, in plain English.",
    useWhen: [
      "When a word in the question doesn't land, glance here",
    ],
    code: [],
    tips: [
      "Closure: a function plus the variables it captured.",
      "Hoisting: declarations are processed before code runs (function declarations are fully usable early).",
      "Microtask: a promise callback; runs before timers.",
      "Pure function: same input gives the same output and changes nothing else.",
      "Mutate: change an object or array in place.",
      "Generic: a type parameter like <T> that keeps types linked.",
      "Narrowing: a check that makes TypeScript treat a value as a more specific type.",
      "Type guard: a function returning x is T.",
      "Discriminated union: a union whose members share a literal kind field.",
      "Idempotent: safe to do twice; the second time changes nothing.",
      "Brute force: the simple, try-everything version.",
      "Memoization: saving answers so each input is computed once.",
    ],
    watchOut: [
      "If you don't know a word, ask. \"Do you mean X?\" is a strong answer.",
    ],
  },
  {
    id: "say-why", title: "Say why", guide: "plan",
    keywords: "say why explain reasoning communicate",
    summary: "Name the tool and the reason in one sentence before you type. Interviewers grade the reasoning as much as the code.",
    useWhen: [
      "Every time you choose a loop, a collection, a pattern, or a type",
    ],
    code: [],
    tips: [
      "\"A Set, because I check seen-before on every item and a Set does that in O(1).\"",
      "\"A Map from value to index, so finding the partner is one lookup instead of a second loop.\"",
      "\"A while loop, because I stop when the pointers meet, not after a fixed count.\"",
      "\"Promise.all, because these requests don't depend on each other.\"",
      "\"A discriminated union, so the compiler checks I handle every case.\"",
      "\"unknown plus a type guard, because this data comes from outside.\"",
      "\"This is O(n) time and O(n) extra space for the Map.\"",
    ],
    watchOut: [
      "\"I always use Maps\" is a habit, not a reason. Name the operation it makes fast.",
    ],
    say: "I'll use a Set because I check membership on every item.",
  },
];

export function topicById(id: string): InterviewTopic | undefined {
  return interviewTopics.find(topic => topic.id === id);
}
