import type { Role, CheatSheet, Flashcard, Exercise, Story, Source } from "../lib/types";

const source = (title: string, url: string): Source => ({ title, url });
const refs = {
  fde: source("Sycamore: Forward Deployed Engineer", "https://sycamore.so/careers/forward-deployed-engineer/"),
  core: source("Sycamore: Core AI", "https://sycamore.so/careers/mts-core-ai/"),
  services: source("Sycamore: AI Services", "https://sycamore.so/careers/mts-ai-services/"),
  products: source("Sycamore: Products", "https://sycamore.so/careers/mts-products/"),
  product: source("Sycamore: Member of Product Staff", "https://sycamore.so/careers/member-of-product-staff/"),
  security: source("Sycamore: Security", "https://sycamore.so/careers/mts-security/"),
  sse: source("MDN: Server-sent events", "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events"),
  retries: source("AWS: Timeouts, retries, and jitter", "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/"),
  outbox: source("AWS: Transactional outbox", "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html"),
  rls: source("PostgreSQL: Row security", "https://www.postgresql.org/docs/current/ddl-rowsecurity.html"),
  constraints: source("PostgreSQL: Constraints", "https://www.postgresql.org/docs/current/ddl-constraints.html"),
  injection: source("OWASP: Prompt injection prevention", "https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html"),
  temporal: source("Temporal: Activity definition", "https://docs.temporal.io/activity-definition"),
  ts: source("TypeScript: Narrowing", "https://www.typescriptlang.org/docs/handbook/2/narrowing.html"),
  python: source("Python: Data structures", "https://docs.python.org/3/tutorial/datastructures.html"),
  asyncio: source("Python: Coroutines and tasks", "https://docs.python.org/3/library/asyncio-task.html"),
  pydantic: source("Pydantic: Models", "https://docs.pydantic.dev/latest/concepts/models/"),
  evals: source("LangChain: Evaluation", "https://docs.langchain.com/langsmith/evaluation"),
  map: source("MDN: Map", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map"),
  pyControl: source("Python: More control flow tools", "https://docs.python.org/3/tutorial/controlflow.html"),
  pyClasses: source("Python: Classes", "https://docs.python.org/3/tutorial/classes.html"),
  pyCollections: source("Python: collections", "https://docs.python.org/3/library/collections.html"),
  functools: source("Python: functools", "https://docs.python.org/3/library/functools.html"),
  pySorting: source("Python: Sorting techniques", "https://docs.python.org/3/howto/sorting.html"),
  urllib: source("Python: urllib.request", "https://docs.python.org/3/library/urllib.request.html"),
  mdnLoops: source("MDN: Loops and iteration", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration"),
  mdnForEach: source("MDN: Array.prototype.forEach()", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach"),
  pyTimeComplexity: source("Python wiki: Time complexity", "https://wiki.python.org/moin/TimeComplexity"),
  mdnSet: source("MDN: Set", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set"),
  mdnClasses: source("MDN: Classes", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes"),
  mdnSort: source("MDN: Array.prototype.sort()", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort"),
  mdnResponseOk: source("MDN: Response.ok", "https://developer.mozilla.org/en-US/docs/Web/API/Response/ok"),
  mdnFetch: source("MDN: Using the Fetch API", "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"),
  textDecoderStream: source("MDN: TextDecoderStream", "https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream"),
  goHttp: source("Go: net/http", "https://pkg.go.dev/net/http"),
  goErrors: source("Go: errors", "https://pkg.go.dev/errors"),
  sseSpec: source("HTML Standard: Server-sent events", "https://html.spec.whatwg.org/multipage/server-sent-events.html"),
  fastapiStreaming: source("FastAPI: Custom response classes", "https://fastapi.tiangolo.com/advanced/custom-response/"),
};

export const roles: Role[] = [];

export const cheatSheets: CheatSheet[] = [
  {
    id: "today", title: "Interview plan", subtitle: "A repeatable preparation outline.", category: "Start here",
    sections: [
      { title: "Set the frame", body: "Confirm the task, constraints, language, environment, time budget, and allowed tools. Separate known facts from assumptions.", bullets: ["Use one concrete input/output example.", "Ask what a useful outcome looks like."] },
      { title: "Work one complete example", body: "Choose a small design or coding exercise. Explain the main invariant, implement the simplest correct path, and inspect one failure case.", bullets: ["Keep notes on questions to resolve.", "Leave time to review behavior and limitations."] },
      { title: "When you get stuck", body: "Reduce the task to one example. Make a straightforward version correct before improving a bottleneck.", bullets: ["Ask a precise question.", "Separate a fact, an assumption, and a design choice.", "Close with a tradeoff and how you would verify it."] },
    ], sources: [],
  },
  {
    id: "agent-design", title: "Design a durable agent run", subtitle: "Start with one workflow, then defend failure behavior.", category: "System design",
    sections: [
      { title: "Open with the customer's work", body: "Who does this work today, where do they lose time, what result would change their day, and which system must stay authoritative? Then ask which tools and approvals are allowed. State a concrete success criterion before choosing services.", bullets: ["For practice: an operator investigates a support case and proposes a CRM update. Ask whether reducing investigation time or improving resolution quality matters more.", "Choose one case type and one CRM integration first. Assume tenant isolation, approved writes, and worker recovery; ask the interviewer to adjust these assumptions.", "Separate repeated platform needs from customer-specific business rules. Validate the first version with an operator using a real, permitted example."] },
      { title: "Walk one request", body: "Browser -> authenticated API -> durable run record -> workflow worker -> model/tool gateway. Persist state transitions and events. Return a run ID quickly; the UI reads a snapshot and subsequent events.", bullets: ["Start with Postgres, a durable workflow mechanism, and a small number of services. Add separation only for a clear ownership or scaling need.", "Model runs, steps, approvals, tool attempts, and events. Every resource has a tenant boundary and version.", "Proposed states: queued, running, awaiting approval, succeeded, failed, cancelled. Define legal transitions and terminal behavior."] },
      { title: "The failure you should volunteer", body: "A remote write can succeed before your worker records its response. Retrying may repeat the write. Give the external operation a stable key when supported; otherwise reconcile its outcome before another attempt. A durable workflow does not make arbitrary side effects exactly once.", bullets: ["Keep deterministic orchestration separate from retried external activity execution.", "For a database update plus queue notification, commit an outbox record with the update. A relay may redeliver, so consumers still deduplicate.", "Approval must bind to an action, arguments, actor, and version. Recheck authorization when execution resumes."] },
      { title: "Finish with operation", body: "Measure completion, queue age, time to first useful progress, tool failure rates, and cost per completed task. Explain a rollback or disable switch for a bad agent version.", bullets: ["Trace tenant, run, step, tool attempt, and version without dumping secrets into logs.", "Test a worker crash, duplicate event, expired approval, provider timeout, and tenant mismatch.", "Name your remaining uncertainty: expected workload, acceptable recovery time, and retention policy."] },
    ], sources: [refs.temporal, refs.outbox, refs.constraints],
  },
  {
    id: "api-reliability", title: "APIs, retries, and idempotency", subtitle: "A timeout tells you what you observed, not what the server did.", category: "Backend",
    sections: [
      { title: "A request contract", body: "POST /runs accepts validated input and a caller-generated idempotency key. Derive identity and tenant from trusted authentication. Return the existing run for a matching retry; reject reuse of the key with different input.", bullets: ["Use a database uniqueness rule over tenant plus operation plus key. A check followed by an unguarded insert has a race.", "Keep the input fingerprint and result durable. Define key retention and in-progress behavior.", "GET /runs/:id returns authoritative state. POST /runs/:id/cancel requests a state transition; it cannot undo a completed external write."] },
      { title: "Retry policy you can say aloud", body: "I retry only a classified transient failure, within an overall deadline and attempt budget, and only when the operation is safe to repeat. I use capped backoff with jitter and respect provider retry guidance.", bullets: ["Do not retry validation or authorization failures blindly.", "A timeout can leave the external outcome unknown. Preserve that uncertainty and reconcile.", "Avoid independent retries at every layer; they multiply load during an outage."] },
      { title: "Typed Python boundary", body: "This validates shape. Authorization and business rules still run separately. The snippet is a study example, not a complete API.", code: "from pydantic import BaseModel, ConfigDict, Field\n\nclass StartRun(BaseModel):\n    model_config = ConfigDict(extra='forbid', strict=True)\n    prompt: str = Field(min_length=1, max_length=8000)\n    agent_id: str = Field(min_length=1)\n\nrequest = StartRun.model_validate({\n    'prompt': 'Investigate case 42', 'agent_id': 'support'\n})" },
      { title: "A crisp tradeoff", body: "I would favor durable correctness for writes and a fast retryable read path for progress. If we add a cache, it cannot become the authority for permissions or completion.", bullets: ["Name the invariant: the same accepted command must not create two runs.", "Then distinguish it from the harder invariant: the remote business action must not happen twice."] },
    ], sources: [refs.retries, refs.constraints, refs.pydantic],
  },
  {
    id: "streaming-ui", title: "Streaming run state", subtitle: "Connection status, run status, and draft output are different facts.", category: "Frontend",
    sections: [
      { title: "Choose the channel", body: "SSE carries server-to-browser events over HTTP and supports event IDs and reconnect behavior. Use ordinary requests for start, approval, and cancel commands. Choose WebSockets when the product actually needs a persistent bidirectional channel.", bullets: ["Reconnection alone does not restore missed application state. Design event retention, replay, and snapshot recovery.", "Keep a last-applied event position. Ignore duplicates; handle a gap by resynchronizing.", "A disconnected browser does not necessarily mean the background run stopped."] },
      { title: "Make state explicit", body: "Use a discriminated union so impossible combinations are harder to represent. Runtime validation is still required for network data; TypeScript assertions do not validate JSON.", code: "type RunView =\n  | { status: 'running'; draft: string }\n  | { status: 'awaiting_approval'; action: string }\n  | { status: 'succeeded'; result: string }\n  | { status: 'failed'; message: string };\n\nfunction label(run: RunView): string {\n  switch (run.status) {\n    case 'running': return 'Working';\n    case 'awaiting_approval': return 'Approval needed';\n    case 'succeeded': return 'Complete';\n    case 'failed': return run.message;\n  }\n}" },
      { title: "Small product decisions matter", body: "Keep partial output visibly provisional. Show what needs approval and its consequence. Preserve useful work after failure and provide an explicit recovery action.", bullets: ["Do not auto-scroll if the user is reading older output.", "Announce meaningful status changes accessibly, not every token.", "Render model output as untrusted content. Avoid executing generated HTML.", "Test slow events, reconnect, cancel races, empty output, keyboard use, and a narrow viewport."] },
    ], sources: [refs.sse, refs.ts, refs.injection],
  },
  {
    id: "tenant-security", title: "Tenant boundaries and agent authority", subtitle: "The model proposes. Trusted code decides what can execute.", category: "Security",
    sections: [
      { title: "Walk the trust boundary", body: "Authenticate the caller, resolve allowed tenant membership, authorize the specific resource and action, then pass a narrowed execution identity to the tool layer. A tenant ID supplied in a prompt is not proof of access.", bullets: ["Scope SQL, object storage, search indexes, cache keys, events, and logs consistently.", "Test user A reading, approving, subscribing to, and cancelling user B's run.", "An unguessable ID helps avoid enumeration but does not replace authorization."] },
      { title: "Defense in depth in Postgres", body: "Row-level security can restrict visible and writable rows. An enabled table without an applicable policy defaults to denial. Owners normally bypass policies; superusers and BYPASSRLS roles also bypass them.", bullets: ["Use a restricted application role and test under that role.", "Set tenant context from trusted code within the transaction; avoid leaking context through a pooled connection.", "Keep explicit application authorization even when database policies exist."] },
      { title: "A malicious document scenario", body: "A retrieved document says to export customer records. Treat that as data, not a new permission. Enforce tool allowlists, schema validation, least privilege, and approval for consequential actions outside the model.", bullets: ["Keep credentials in a broker or vault, outside the prompt and model-visible tool output.", "Constrain network destinations and resources for generated code. A plain container alone is not a complete threat model.", "Record who delegated what action, which policy allowed it, and what actually happened."] },
      { title: "A good security answer", body: "Name the asset, attacker-controlled input, trust boundary, concrete control, and verification. Example: cross-tenant event leakage -> authorize the run subscription -> test mismatched tenant credentials before any event is sent." },
    ], sources: [refs.rls, refs.injection, refs.security],
  },
  {
    id: "evals", title: "Release evals", subtitle: "Better examples are useful. They are not proof of broad improvement.", category: "AI engineering",
    sections: [
      { title: "Define success before running", body: "For a support workflow, measure correct resolution, permitted tool behavior, and whether the final business state is right. A fluent explanation is not enough.", bullets: ["Version the prompt, model settings, tool schemas, dataset, and application code.", "Use a development set for iteration and a separate held-out set for a less biased comparison.", "Include representative failures, permission boundaries, and interrupted runs, not only clean examples."] },
      { title: "Use the cheapest credible check", body: "Use deterministic checks for schemas, known answers, forbidden operations, and resulting database state. Add human review for subjective outcomes. Use model judges as imperfect measurements and inspect disagreements.", bullets: ["Compare the candidate and baseline on the same cases and conditions.", "Report failure categories alongside aggregate quality, latency, and cost.", "Repeat stochastic cases when variability could change the decision. Keep assumptions and sample size visible."] },
      { title: "Tiny numbers, honest conclusion", body: "Baseline: 40 successes in 50 tasks = 80%. Candidate: 43 in 50 = 86%. That is 6 percentage points, or 3 more successful tasks. It does not by itself establish a reliable gain. Inspect which cases changed and repeat or expand the evaluation.", bullets: ["If 2 of the 3 apparent gains violate permissions, the aggregate hides a release blocker.", "Proposed rollout: offline checks, a limited monitored release, explicit stop criteria, and a reversible version switch."] },
      { title: "Connect evidence to evaluation", body: "Choose one representative task, identify the checks and observed failures, then record the decision that followed. Do not claim an improvement without a defensible comparison." },
    ], sources: [refs.evals, refs.core],
  },
  {
    id: "math-patterns", title: "Math and algorithm patterns", subtitle: "Write units. Use one concrete example. Explain growth in words.", category: "Algorithms",
    sections: [
      { title: "Capacity without mental gymnastics", body: "Assume 600 runs per minute: divide by 60 to get 10 runs per second. If an active run lasts 20 seconds on average, a steady workload has roughly 10 x 20 = 200 runs in flight. This is an average planning estimate, not a peak capacity guarantee.", bullets: ["For 100,000 runs/day at 10 KB each: 1,000,000 KB, about 1 GB/day before indexes, events, and replicas. State decimal units.", "If arrivals are 10 jobs/second and workers complete 8, the backlog grows about 2/second, or 120/minute, while those rates hold.", "Example prices only: 2,000 input tokens at $1/million cost $0.002; 500 output tokens at $4/million cost $0.002. Total $0.004/call. These are not provider prices."] },
      { title: "Say what doubles", body: "One pass over n items: O(n). Comparing every pair: O(n²). Repeatedly halving an ordered search space: O(log n). Sorting is commonly O(n log n). Complexity describes growth, not elapsed milliseconds.", bullets: ["At n = 1,000, one pass is about 1,000 visits; all ordered pairs are about 1,000,000 checks.", "O(1) means input-size-independent work, not literally one machine instruction.", "Mention both time and extra memory. A lookup table often trades memory for less repeated searching."] },
      { title: "Pattern recognition", body: "Need counts or seen-before lookup? Map/set. Need contiguous ranges? Consider a sliding window. Need merging overlapping ranges? Sort by start, then scan. Need nested matching? Stack. Need shortest hops on an unweighted graph? Breadth-first search.", code: "def counts(values: list[str]) -> dict[str, int]:\n    result: dict[str, int] = {}\n    for value in values:\n        result[value] = result.get(value, 0) + 1\n    return result\n\n# ['a', 'b', 'a'] becomes {'a': 2, 'b': 1}" },
      { title: "Before optimizing", body: "Try empty input, one item, duplicates, sorted/reversed input, and boundary values. State whether mutation is allowed. First explain a correct simple approach, then identify repeated work you can eliminate." },
    ], sources: [refs.python, refs.map],
  },
  {
    id: "coding-collab", title: "Live coding", subtitle: "Show your reasoning, keep the scope small, and make behavior testable.", category: "Live coding",
    sections: [
      { title: "The first five minutes", body: "Restate the task, give one input/output example, ask about invalid data and ordering, and confirm the time budget. Propose a minimal interface before implementing.", bullets: ["Narrate a decision, not every keystroke.", "If AI coding tools are permitted, explain what you delegate and verify its output with your own examples and tests.", "When a requirement changes, say which invariant or interface it affects before rewriting."] },
      { title: "A Python timeout", body: "Timeouts bound waiting, and cancellation is cooperative. Clean up resources and propagate cancellation. Do not claim that cancelling the local task reverses a completed remote action.", code: "import asyncio\n\nasync def with_deadline(operation, seconds: float):\n    async with asyncio.timeout(seconds):\n        return await operation()\n\n# operation is an async callable. TimeoutError is\n# handled by the caller according to the API contract." },
      { title: "Test useful boundaries", body: "For a run reducer: duplicate event, gap, terminal state. For idempotency: same key/same input, same key/different input, different tenants. For a worker pool: input ordering, concurrency bound, a failed task, and empty input.", bullets: ["A type check cannot prove an algorithm or permission check is correct.", "Keep time and external services injectable so behavior can be tested deterministically.", "If you run out of time, explain the remaining case and the exact test you would add."] },
      { title: "The last five minutes", body: "Walk one normal example and one failure. State complexity, limitations, and the next production change. Distinguish the exercise solution from a deployable system." },
    ], sources: [refs.asyncio, refs.ts, refs.retries],
  },
  {
    id: "pyjs-choose-control", title: "Choose if, for, or while", subtitle: "One question tells you which control tool to write, in Python and JavaScript.", category: "Python and JavaScript",
    sections: [
      { title: "The one question to ask", body: "Control flow is how code decides what runs next. Every choice comes down to one question. Are you making a decision? Use if. Do you already have a group of things and want to visit each one? Use for. Are you repeating until something changes, without knowing how many times? Use while. Most interview code is a for loop with an if inside it. Reach for while only when there is no list to walk.", bullets: ["if / elif / else (JavaScript: if / else if / else): pick one path. It runs once, not over and over.", "for: visit every item in a list, string, dict, set, or range of numbers. It stops by itself after the last item.", "while: repeat as long as a condition is true. Something inside the loop must change, or it never stops.", "List comprehension (Python), map and filter (JavaScript): build a new list from an old one in one line.", "forEach (JavaScript only): runs a function on each item, but you cannot stop it early. Prefer for...of when you might stop.", "break leaves the loop. continue skips to the next item. return leaves the whole function."] },
      { title: "if: make a choice", body: "if checks a condition once and runs the matching block. The first true branch wins and the rest are skipped, so put the most specific case first. A guard clause is an if at the top of a function that handles a bad case and returns early. It keeps the main code flat, with no else needed.", code: "# Python\ndef grade(score):\n    if score >= 90:\n        return \"A\"\n    elif score >= 80:\n        return \"B\"\n    else:\n        return \"C\"\n\nprint(grade(95), grade(85), grade(10))\n# A B C\n\ndef safe_divide(a, b):\n    if b == 0:          # guard clause: bad case first\n        return None\n    return a / b\n\nprint(safe_divide(6, 3), safe_divide(1, 0))\n# 2.0 None\n\n// JavaScript\nfunction grade(score) {\n  if (score >= 90) return \"A\";\n  else if (score >= 80) return \"B\";\n  else return \"C\";\n}\n\nconsole.log(grade(95), grade(85), grade(10));\n// A B C\n\nfunction safeDivide(a, b) {\n  if (b === 0) return null;  // guard clause\n  return a / b;\n}\n\nconsole.log(safeDivide(6, 3), safeDivide(1, 0));\n// 2 null" },
      { title: "for: visit every item", body: "Use for when you already have the items: a list, a string, the keys of a dict, or a range of numbers. The loop ends by itself after the last item, so it cannot run forever. Python has one for loop, and range(n) gives counting numbers from 0 to n - 1. In JavaScript, for...of is the everyday choice. The older counting form, for (let i = 0; i < n; i++), is for when you need the position to do math, such as comparing each item with the next one.", code: "# Python\nnames = [\"ana\", \"bo\", \"cy\"]\nfor name in names:                # each item\n    print(name)\n\nfor i in range(3):                # 0, 1, 2\n    print(i)\n\nfor i, name in enumerate(names):  # position and item\n    print(i, name)\n\nprices = {\"tea\": 3, \"cake\": 5}\nfor item, price in prices.items():  # key and value\n    print(item, price)\n\n// JavaScript\nconst names = [\"ana\", \"bo\", \"cy\"];\nfor (const name of names) {       // each item\n  console.log(name);\n}\n\nfor (let i = 0; i < 3; i++) {     // 0, 1, 2\n  console.log(i);\n}\n\n// Use the counting form to compare neighbors.\nconst nums = [1, 3, 2];\nfor (let i = 0; i < nums.length - 1; i++) {\n  if (nums[i] > nums[i + 1]) console.log(\"drop at\", i);\n}\n// drop at 1\n\nconst prices = { tea: 3, cake: 5 };\nfor (const [item, price] of Object.entries(prices)) {\n  console.log(item, price);\n}" },
      { title: "while: repeat until something changes", body: "Use while when you do not know how many steps it will take, and you stop because something changed: a number got small enough, two pointers met, or the API said there are no more pages. Every while loop needs three parts: a starting value, a condition to test, and a line inside the loop that moves toward making the condition false. Forget the third part and the loop runs forever.", code: "# Python\n# Count the digits in a number.\nn, digits = 4096, 0       # 1. start\nwhile n > 0:              # 2. test\n    n //= 10              # 3. move toward the end\n    digits += 1\nprint(digits)             # 4\n\n# Two pointers walk in from both ends.\ndef is_palindrome(s):\n    left, right = 0, len(s) - 1\n    while left < right:\n        if s[left] != s[right]:\n            return False\n        left += 1\n        right -= 1\n    return True\n\nprint(is_palindrome(\"racecar\"), is_palindrome(\"ab\"))\n# True False\n\n// JavaScript\nlet n = 4096, digits = 0;\nwhile (n > 0) {\n  n = Math.floor(n / 10);\n  digits++;\n}\nconsole.log(digits); // 4\n\nfunction isPalindrome(s) {\n  let left = 0, right = s.length - 1;\n  while (left < right) {\n    if (s[left] !== s[right]) return false;\n    left++;\n    right--;\n  }\n  return true;\n}\n\nconsole.log(isPalindrome(\"racecar\"), isPalindrome(\"ab\"));\n// true false" },
      { title: "Same task, which tool?", body: "A for loop is a while loop with the counter built in, so you can always rewrite one as the other. Pick the one that says what you mean. If you can name the list you are walking, write for. If you can only name the stopping condition, write while. A retry with a maximum number of attempts is a for loop over a range with break on success, because the maximum is known even though you may stop early.", code: "# Python\n# Known items: for\ntotal = 0\nfor price in [3, 5, 2]:\n    total += price\nprint(total)  # 10\n\n# Unknown count, stop on a condition: while\nbalance, years = 100, 0\nwhile balance < 200:\n    balance *= 1.1\n    years += 1\nprint(years)  # 8\n\n# Known maximum, may stop early: for + break\ndef works(attempt):\n    return attempt == 2   # succeeds on the third try\n\nfor attempt in range(5):\n    if works(attempt):\n        print(\"ok on attempt\", attempt + 1)\n        break\nelse:\n    print(\"gave up\")\n# ok on attempt 3\n\n// JavaScript\nlet total = 0;\nfor (const price of [3, 5, 2]) total += price;\nconsole.log(total); // 10\n\nlet balance = 100, years = 0;\nwhile (balance < 200) {\n  balance *= 1.1;\n  years++;\n}\nconsole.log(years); // 8\n\nconst works = attempt => attempt === 2;\nlet succeeded = false;\nfor (let attempt = 0; attempt < 5; attempt++) {\n  if (works(attempt)) {\n    console.log(\"ok on attempt\", attempt + 1);\n    succeeded = true;\n    break;\n  }\n}\nif (!succeeded) console.log(\"gave up\");\n// ok on attempt 3" },
      { title: "map, filter, forEach, and comprehensions", body: "These are shortcuts for common for loops. map makes a new list with one result per item. filter makes a new list with only the items that pass a test. In Python, a list comprehension does both: [f(x) for x in items if test(x)]. JavaScript's forEach runs a function for each item and gives back nothing. It cannot stop early: break is not allowed inside it, and return only ends that one call. When you need to stop at the first match, write for...of, or use find or some, which stop by themselves.", code: "# Python\nprices = [3, 5, 12]\nwith_tax = [p * 1.1 for p in prices]     # like map\ncheap = [p for p in prices if p < 10]    # like filter\nprint([round(p, 2) for p in with_tax])   # [3.3, 5.5, 13.2]\nprint(cheap)                             # [3, 5]\n\n# First match, or None if there is none.\nprint(next((p for p in prices if p > 4), None))  # 5\nprint(any(p > 10 for p in prices))       # True\n\n// JavaScript\nconst prices = [3, 5, 12];\nconst withTax = prices.map(p => p * 1.1);\nconst cheap = prices.filter(p => p < 10);\nconsole.log(withTax.map(p => +p.toFixed(2)));\n// [ 3.3, 5.5, 13.2 ]\nconsole.log(cheap);                     // [ 3, 5 ]\nconsole.log(prices.find(p => p > 4));   // 5\nconsole.log(prices.some(p => p > 10));  // true\n\n// return inside forEach only skips one item.\nprices.forEach(p => {\n  if (p > 4) return;\n  console.log(\"small\", p);\n});\n// small 3" },
      { title: "Common mistake: the loop that never ends", body: "The two most common control flow bugs are a while loop whose condition never changes and a loop that runs one time too many or too few. Before you run a loop, say its first and last values out loud.", bullets: ["while i < len(items): without i += 1 inside runs forever.", "range(5) is 0 to 4. range(1, 6) is 1 to 5.", "Starting at 0, i < n runs n times and i <= n runs n + 1 times.", "In JavaScript, for...in gives keys as strings. Use for...of for arrays.", "Do not remove items from a list while a for loop walks it. Build a new list instead."] },
      { title: "Words to know", body: "Interviewers use these words without explaining them. Each one has a plain meaning.", bullets: ["Condition: a yes-or-no test, such as x > 5.", "Branch: one of the paths an if can take.", "Loop body: the indented or braced lines that repeat.", "Iteration: one trip through the loop body.", "Iterable: anything a for loop can walk: a list, string, dict, set, or range.", "Guard clause: an if near the top that handles a bad case and returns early.", "Off-by-one error: a loop that runs one time too many or too few.", "Infinite loop: a loop whose condition never becomes false.", "Side effect: a change outside the function, such as printing or editing a shared list."] },
      { title: "Try it: name the tool", body: "For each task, say which tool fits and why in one sentence, then write it in both languages. The answers are in the last bullet.", bullets: ["Print every name in a list of users.", "Keep dividing a number by 2 while it is even, and count the steps.", "Return the first order over $100, or nothing if there is none.", "Make a list of only the active users.", "Check whether a sorted list has two numbers that add up to a target.", "Answers: for; while; for with an early return (or find); a comprehension or filter; while with two pointers."] },
    ], sources: [refs.pyControl, refs.mdnLoops, refs.mdnForEach],
  },
  {
    id: "pyjs-control-flow", title: "Loops in practice: early exits, empty values, Fibonacci", subtitle: "Combine loops and ifs, stop at the right moment, and explain three Fibonacci versions.", category: "Python and JavaScript",
    sections: [
      { title: "A small scenario", body: "Most interview code is a for loop with an if inside. Task: you get run times in milliseconds. Label each one fast (under 200), slow (1,000 or more), or normal. A negative value means the data is broken, so stop with an error. Read the code as: for each item, check the bad case first, then pick one label.", code: "# Python\ndef label_runs(durations):\n    labels = []\n    for ms in durations:\n        if ms < 0:\n            raise ValueError(f\"negative duration: {ms}\")\n        if ms < 200:\n            labels.append(\"fast\")\n        elif ms >= 1000:\n            labels.append(\"slow\")\n        else:\n            labels.append(\"normal\")\n    return labels\n\nprint(label_runs([120, 450, 1500]))\n# ['fast', 'normal', 'slow']\n\n// JavaScript\nfunction labelRuns(durations) {\n  const labels = [];\n  for (const ms of durations) {\n    if (ms < 0) throw new Error(`negative duration: ${ms}`);\n    if (ms < 200) labels.push(\"fast\");\n    else if (ms >= 1000) labels.push(\"slow\");\n    else labels.push(\"normal\");\n  }\n  return labels;\n}\n\nconsole.log(labelRuns([120, 450, 1500]));\n// [ 'fast', 'normal', 'slow' ]" },
      { title: "Empty, zero, and missing values", body: "if items: does not ask whether items is True. It asks whether items is truthy, meaning it counts as true. In Python, empty things and zero count as false: 0, \"\", [], {}, set(), and None. JavaScript has one difference that causes bugs: [] and {} count as true even when empty, so check items.length === 0 instead. To check for no value, use x is None in Python. In JavaScript, always compare with ===, and note that a ?? b uses b only when a is null or undefined, while a || b also replaces 0 and \"\".", code: "# Python\nitems = []\nif not items:\n    print(\"empty\")      # runs: an empty list is falsy\nretries = 0\nprint(retries is None)  # False: 0 is a value\n\n// JavaScript\nconst items = [];\n// [] itself is truthy, so test the length.\nif (items.length === 0) console.log(\"empty\");\nconst retries = 0;\nconsole.log(retries || 3);  // 3: || replaces any falsy value\nconsole.log(retries ?? 3);  // 0: ?? replaces null, undefined" },
      { title: "Early exits: return, break, continue", body: "return leaves the whole function. break leaves only the loop it is in. continue skips the rest of this item and moves to the next one. A Python loop can have an else block that runs only when the loop finished without hitting break; it reads well for searched everything, found nothing. For errors, raise (Python) or throw (JavaScript) stops the code, try/except or try/catch handles it, and finally runs cleanup either way. Catch only errors you can do something about.", code: "# Python\nfor n in [1, -2, 3]:\n    if n < 0:\n        continue          # skip this item\n    print(n)              # 1, then 3\n\ndef first_failed(runs):\n    for run in runs:\n        if run[\"status\"] == \"error\":\n            return run[\"id\"]  # leaves loop and function\n    return None\n\nruns = [{\"id\": \"r1\", \"status\": \"ok\"},\n        {\"id\": \"r2\", \"status\": \"error\"}]\nprint(first_failed(runs))  # r2\n\nfor attempt in range(3):\n    if attempt == 1:\n        break\nelse:\n    print(\"not printed: the loop hit break\")\n\ntry:\n    count = int(\"12x\")\nexcept ValueError:\n    count = 0\nfinally:\n    print(\"finally always runs\")\nprint(count)                             # 0\n\n// JavaScript\nfor (const n of [1, -2, 3]) {\n  if (n < 0) continue;    // skip this item\n  console.log(n);         // 1, then 3\n}\n\nfunction firstFailed(runs) {\n  for (const run of runs) {\n    if (run.status === \"error\") return run.id;\n  }\n  return null;\n}\n\nconst runs = [\n  { id: \"r1\", status: \"ok\" },\n  { id: \"r2\", status: \"error\" },\n];\nconsole.log(firstFailed(runs)); // r2\n\nlet count;\ntry {\n  count = JSON.parse(\"12x\");             // throws SyntaxError\n} catch (error) {\n  count = 0;\n} finally {\n  console.log(\"finally always runs\");\n}\nconsole.log(count);                      // 0" },
      { title: "Fibonacci three ways", body: "Each Fibonacci number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8. Interviewers use it to see whether you spot repeated work. The plain recursive version (a function that calls itself) calls itself twice per step and redoes the same work again and again, so the time roughly doubles each time n grows by one. Memoization means saving each answer the first time and reusing it, so each n is computed once. The loop keeps only the last two numbers: O(n) time and almost no extra memory. Give the loop first, then mention the others. Python stops recursion at about 1,000 calls deep. JavaScript numbers are exact only up to fib(78); use BigInt, numbers written with an n at the end, beyond that.", code: "# Python\nfrom functools import cache\n\n# Exponential: recomputes the same values.\ndef fib_naive(n):\n    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)\n\n# O(n): each n is computed once.\n@cache\ndef fib_memo(n):\n    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)\n\n# O(n) time, O(1) extra space.\ndef fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint(fib_naive(20))            # 6765\nprint(fib_memo(90) == fib(90))  # True\nprint(fib(90))                  # 2880067194370816120\n\n// JavaScript\nfunction fib(n) {\n  let [a, b] = [0, 1];\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n\nfunction fibBig(n) {  // exact beyond fib(78)\n  let [a, b] = [0n, 1n];\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n\nconsole.log(fib(78));     // 8944394323791464\nconsole.log(fibBig(90));  // 2880067194370816120n" },
      { title: "Common mistake: the boundary", body: "Most loop bugs are boundary bugs. Decide whether the end is included before you type the loop, then test the smallest inputs aloud.", bullets: ["range(n) stops at n - 1. Write range(1, n + 1) when the task says 1 through n.", "In JavaScript, i <= n and i < n differ by exactly one iteration. Say which one you mean.", "Do not add or remove items from a list while looping over it. Build a new list instead.", "Test 0, 1, and a small normal value before anything clever."] },
      { title: "Words to know", body: "Terms from this lesson, in plain words.", bullets: ["Truthy and falsy: values that count as true or false inside an if, even though they are not True or False.", "Early return: leaving a function as soon as you have the answer.", "Exception (Python) or error (JavaScript): an object that stops normal flow until something catches it.", "Recursion: a function that calls itself on a smaller input.", "Base case: the input where recursion stops, such as n < 2 for Fibonacci.", "Memoization: saving a function's answers so the same input is never computed twice.", "Exponential: work that roughly doubles each time the input grows by one."] },
      { title: "Try it: FizzBuzz in both languages", body: "Practice this in your own editor; there is no runner for it in Deems. Return a list of strings for 1 through n, using Fizz for multiples of 3, Buzz for multiples of 5, and FizzBuzz for both.", bullets: ["Check the both-multiples case first, or it will never be reached.", "Expected for n = 5: 1, 2, Fizz, 4, Buzz. Expected for n = 0: an empty list.", "Write it once with if/elif/else and once in JavaScript with else if, then compare."] },
    ], sources: [refs.pyControl, refs.mdnLoops, refs.functools],
  },
  {
    id: "pyjs-choose-collection", title: "Choose a list, dict, set, or tuple", subtitle: "Pick the container by what you will do with the data most often.", category: "Python and JavaScript",
    sections: [
      { title: "The one question to ask", body: "A collection is any container that holds several values. Python's main ones are list, dict, set, and tuple. JavaScript's are array, Map, plain object, and Set. Pick one by asking what you will do with the data most often. Need things in order? List. Need to look something up by a name or ID? Dict. Need to know whether you have seen something, or to remove duplicates? Set. Need a small group of values that belong together and never change? Tuple.", bullets: ["list (JavaScript array): keeps order, allows duplicates, read by position: items[0].", "dict (JavaScript Map or object): pairs of key and value; look up by key: prices[\"tea\"].", "set (JavaScript Set): unique values only, fast is-it-in-here checks, no positions.", "tuple (Python only): like a list that cannot change, so it can be a dict key or set member.", "Written in Python: list [1, 2], dict {\"a\": 1}, set {1, 2}, tuple (1, 2). An empty set is set(), because {} is an empty dict.", "When unsure, start with a list. Switch when you notice you keep searching it."] },
      { title: "list and array: things in order", body: "Use a list when order matters or duplicates are allowed: the steps a user took, scores in the order they arrived, a stack of undo actions. Reading items[i] is instant. Checking whether a value is in a list means looking at every item one by one, which gets slow when you do it inside another loop.", code: "# Python\nsteps = [\"login\", \"search\", \"search\", \"buy\"]\nsteps.append(\"logout\")        # add to the end\nprint(steps[0], steps[-1])    # login logout\nprint(len(steps))             # 5\nprint(\"buy\" in steps)         # True, checks one by one\n\nstack = [\"a\", \"b\"]\nprint(stack.pop())            # b: last in, first out\n\n// JavaScript\nconst steps = [\"login\", \"search\", \"search\", \"buy\"];\nsteps.push(\"logout\");\nconsole.log(steps[0], steps.at(-1)); // login logout\nconsole.log(steps.length);           // 5\nconsole.log(steps.includes(\"buy\"));  // true, checks each\n\nconst stack = [\"a\", \"b\"];\nconsole.log(stack.pop());            // b" },
      { title: "dict and Map: look up by key", body: "Use a dict when you will ask what goes with this name or ID: price by product, count by word, user by ID. Looking up a key is instant no matter how big the dict gets. Counting is the most common interview use: start each key at 0 and add 1. In JavaScript, a plain object is fine for fixed string keys like settings. Use a Map when the keys come from data, are not strings, or you need the size.", code: "# Python\nprices = {\"tea\": 3, \"cake\": 5}\nprint(prices[\"tea\"])          # 3\nprint(prices.get(\"pie\", 0))   # 0: default when missing\nprices[\"pie\"] = 4             # add or update\n\ncounts = {}\nfor word in [\"a\", \"b\", \"a\"]:\n    counts[word] = counts.get(word, 0) + 1\nprint(counts)                 # {'a': 2, 'b': 1}\n\n// JavaScript\nconst prices = new Map([[\"tea\", 3], [\"cake\", 5]]);\nconsole.log(prices.get(\"tea\"));       // 3\nconsole.log(prices.get(\"pie\") ?? 0);  // 0\nprices.set(\"pie\", 4);\n\nconst counts = new Map();\nfor (const word of [\"a\", \"b\", \"a\"]) {\n  counts.set(word, (counts.get(word) ?? 0) + 1);\n}\nconsole.log(counts);\n// Map(2) { 'a' => 2, 'b' => 1 }" },
      { title: "set and Set: have I seen it?", body: "Use a set when you only care whether something is there: IDs you already processed, grid cells you visited, unique emails. A set keeps one copy of each value and answers is x in here instantly. It has no positions. Turning a list into a set is the shortest way to remove duplicates. A Python set does not keep the original order, so use dict.fromkeys(items) when order matters. A JavaScript Set does keep insertion order.", code: "# Python\nemails = [\"a@x.io\", \"b@x.io\", \"a@x.io\"]\nunique = set(emails)\nprint(len(unique))            # 2\nprint(\"b@x.io\" in unique)     # True, instantly\nprint(list(dict.fromkeys(emails)))\n# ['a@x.io', 'b@x.io']: duplicates gone, order kept\n\nseen = set()\nfor n in [3, 1, 3]:\n    if n in seen:\n        print(\"repeat\", n)    # repeat 3\n    seen.add(n)\n\n// JavaScript\nconst emails = [\"a@x.io\", \"b@x.io\", \"a@x.io\"];\nconst unique = new Set(emails);\nconsole.log(unique.size);           // 2\nconsole.log(unique.has(\"b@x.io\"));  // true\nconsole.log([...unique]);\n// [ 'a@x.io', 'b@x.io' ]\n\nconst seen = new Set();\nfor (const n of [3, 1, 3]) {\n  if (seen.has(n)) console.log(\"repeat\", n); // repeat 3\n  seen.add(n);\n}" },
      { title: "tuple: a small fixed group", body: "A tuple is a small group of values that belong together and will not change, like a point (x, y) or a pair (name, score). Because it cannot change, Python lets you use it as a dict key or put it in a set. A list cannot do either. Functions often return a tuple to hand back two values at once. JavaScript has no tuple: return a small array and unpack it, and use a string such as \"2,3\" when a pair must be a Set or Map key.", code: "# Python\npoint = (2, 3)\nx, y = point                  # unpack\nvisited = {(0, 0), (2, 3)}    # tuples in a set\nprint((2, 3) in visited)      # True\n\ndef min_max(nums):\n    return min(nums), max(nums)   # a tuple\n\nlow, high = min_max([4, 1, 9])\nprint(low, high)              # 1 9\n# visited.add([2, 3]) fails: a list can change,\n# so it cannot be a set member or dict key.\n\n// JavaScript\nconst [x, y] = [2, 3];\nconst visited = new Set([\"0,0\", \"2,3\"]);\nconsole.log(visited.has(`${x},${y}`)); // true\n\nfunction minMax(nums) {\n  return [Math.min(...nums), Math.max(...nums)];\n}\n\nconst [low, high] = minMax([4, 1, 9]);\nconsole.log(low, high);                // 1 9" },
      { title: "Same data, four questions", body: "Here is one list of page visits and four questions about it. The question picks the collection, not the data. Keeping the visits in order needs a list. Counting visits per user needs a dict. Finding the distinct pages needs a set. Counting visits per user and page pair needs a dict with tuple keys in Python, or string keys in JavaScript.", code: "# Python\nvisits = [(\"ana\", \"/home\"), (\"bo\", \"/cart\"),\n          (\"ana\", \"/cart\"), (\"ana\", \"/home\")]\n\n# 1. In order: the list itself.\nprint(visits[0])          # ('ana', '/home')\n\n# 2. Visits per user: a dict.\nper_user = {}\nfor user, page in visits:\n    per_user[user] = per_user.get(user, 0) + 1\nprint(per_user)           # {'ana': 3, 'bo': 1}\n\n# 3. Distinct pages: a set.\nprint(sorted({page for _, page in visits}))\n# ['/cart', '/home']\n\n# 4. Per user and page: tuple keys.\npairs = {}\nfor visit in visits:\n    pairs[visit] = pairs.get(visit, 0) + 1\nprint(pairs[(\"ana\", \"/home\")])  # 2\n\n// JavaScript\nconst visits = [[\"ana\", \"/home\"], [\"bo\", \"/cart\"],\n                [\"ana\", \"/cart\"], [\"ana\", \"/home\"]];\n\nconsole.log(visits[0]);   // [ 'ana', '/home' ]\n\nconst perUser = new Map();\nfor (const [user] of visits) {\n  perUser.set(user, (perUser.get(user) ?? 0) + 1);\n}\nconsole.log(perUser);\n// Map(2) { 'ana' => 3, 'bo' => 1 }\n\nconsole.log(new Set(visits.map(([, page]) => page)));\n// Set(2) { '/home', '/cart' }\n\nconst pairs = new Map();\nfor (const [user, page] of visits) {\n  const key = `${user} ${page}`;\n  pairs.set(key, (pairs.get(key) ?? 0) + 1);\n}\nconsole.log(pairs.get(\"ana /home\")); // 2" },
      { title: "How fast is each one?", body: "Big O is a short way to say how the work grows as the data grows. O(1) means about the same time whether there are ten items or ten million. O(n) means the time grows with the number of items, because each one gets looked at. The classic interview improvement is replacing a search through a list inside a loop with a set or dict lookup. That turns O(n²), every item times every item, into O(n), one pass.", bullets: ["Instant, O(1): items[i], d[key], key in d, x in s.", "One by one, O(n): x in items, items.index(x), array.includes(x).", "Adding to the end with append or push is O(1). Adding or removing at the front is O(n), because everything shifts.", "For a first in, first out queue in Python, use collections.deque with popleft().", "Sorting is O(n log n): faster than comparing every pair, slower than one pass."] },
      { title: "Words to know", body: "The words you will hear when someone talks about collections.", bullets: ["Collection or data structure: a container of values. Lists, dicts, sets, and tuples are all collections.", "Element or item: one value inside a collection.", "Index: a position number, starting at 0.", "Key and value: in a dict, the key is what you look up and the value is what you get back.", "Mutable: can be changed after it is made (list, dict, set). Immutable: cannot be changed (tuple, string, number).", "Hashable: allowed as a dict key or set member. In Python, tuples and strings are hashable and lists are not.", "Membership check: asking whether a value is in a collection.", "Duplicate: the same value appearing more than once. A set keeps only one."] },
      { title: "Try it: name the collection", body: "For each task, name the collection and give the reason in one sentence. The answers are in the last bullet.", bullets: ["Store the moves of a chess game so you can replay them.", "Look up a user's name from their ID.", "Check whether a username is already taken, many times a second.", "Remember which (row, col) cells you have visited in a grid.", "Count how many times each word appears in a sentence.", "Answers: list; dict; set; set of tuples (string keys in JavaScript); dict of counts."] },
    ], sources: [refs.python, refs.pyTimeComplexity, refs.map, refs.mdnSet, refs.pyCollections],
  },
  {
    id: "pyjs-collections", title: "Collections in practice: count, group, sort", subtitle: "Dedupe, count, group, and sort in Python and JavaScript, and avoid the classic traps.", category: "Python and JavaScript",
    sections: [
      { title: "Worked example: dedupe and count", body: "Task: return the distinct items in the order first seen, plus how many times each appeared. Python uses three collections, each for its own job: a set to answer seen it before, a list to keep the order, and a dict for the counts. A JavaScript Map remembers the order its keys were first added, so the Map alone gives both answers. Either way it is one pass over the input: O(n) time.", code: "# Python\ndef dedupe_with_counts(items):\n    seen, order, counts = set(), [], {}\n    for item in items:\n        counts[item] = counts.get(item, 0) + 1\n        if item not in seen:\n            seen.add(item)\n            order.append(item)\n    return order, counts\n\nprint(dedupe_with_counts([\"b\", \"a\", \"b\"]))\n# (['b', 'a'], {'b': 2, 'a': 1})\n\n// JavaScript\nfunction dedupeWithCounts(items) {\n  const counts = new Map();\n  for (const item of items) {\n    counts.set(item, (counts.get(item) ?? 0) + 1);\n  }\n  return [[...counts.keys()], counts];\n}\n\nconsole.log(dedupeWithCounts([\"b\", \"a\", \"b\"]));\n// [ [ 'b', 'a' ], Map(2) { 'b' => 2, 'a' => 1 } ]" },
      { title: "Grouping and sorting with a key", body: "Grouping means building a dict where each key holds a list of matching items. For anagrams, the key is the word's letters sorted, so eat and tea both become aet. defaultdict(list) starts each new key as an empty list, so you skip the does-it-exist check. To sort by more than one rule in Python, give sorted a key that returns a tuple: (-count, value) means most common first, then smallest value. JavaScript uses a compare function instead. Watch out: JavaScript's sort() with no compare function sorts numbers as text, and it changes the original array.", code: "# Python\nfrom collections import Counter, defaultdict\n\ngroups = defaultdict(list)  # a missing key starts as []\nfor word in [\"eat\", \"tea\", \"tan\", \"ate\"]:\n    groups[\"\".join(sorted(word))].append(word)\nprint(list(groups.values()))\n# [['eat', 'tea', 'ate'], ['tan']]\n\ncounts = Counter([3, 1, 3, 2, 1, 3])\norder = sorted(counts, key=lambda v: (-counts[v], v))\nprint(order)  # [3, 1, 2]\n\n// JavaScript\nconst groups = new Map();\nfor (const word of [\"eat\", \"tea\", \"tan\", \"ate\"]) {\n  const key = [...word].sort().join(\"\");\n  if (!groups.has(key)) groups.set(key, []);\n  groups.get(key).push(word);\n}\nconsole.log([...groups.values()]);\n// [ [ 'eat', 'tea', 'ate' ], [ 'tan' ] ]\n\nconsole.log([10, 9, 1].sort());  // [ 1, 10, 9 ] as strings\nconsole.log([10, 9, 1].sort((a, b) => a - b));  // [ 1, 9, 10 ]" },
      { title: "Common mistake: object keys and shared rows", body: "Two traps come up often. A plain JavaScript object turns every key into a string, so 1 and \"1\" become the same key; a Map keeps the real type. In Python, [[0] * 3] * 3 does not make three rows. It makes three references to one row, so changing one row changes all of them. Build each row separately with a comprehension instead.", code: "# Python\ngrid = [[0] * 3] * 3\ngrid[0][0] = 1\nprint(grid[1][0])  # 1: the three rows are one list\ngrid = [[0] * 3 for _ in range(3)]  # a new row each time\ngrid[0][0] = 1\nprint(grid[1][0])  # 0\n\n// JavaScript\nconst byId = {};\nbyId[1] = \"a\";\nconsole.log(Object.keys(byId));     // [ '1' ]: string keys\nconst m = new Map([[1, \"a\"]]);\nconsole.log(m.has(1), m.has(\"1\"));  // true false" },
      { title: "Try it: two sum, then explain the trade", body: "Two Sum is runnable in Algorithms with JavaScript and Python tests. Task: find two positions whose numbers add up to a target. The slow way checks every pair, O(n²). The fast way walks the list once with a dict from number to position: for each number, look up the partner it needs (target minus the number). Explain the trade out loud: O(n) time in exchange for O(n) extra memory.", bullets: ["Look up target minus the current value before storing the current value, so one index is never used twice.", "Test a repeated value such as [3, 3] with target 6.", "Say what you would return if no pair exists, and confirm it with the interviewer."] },
    ], sources: [refs.python, refs.pyCollections, refs.map, refs.mdnSet, refs.pySorting, refs.mdnSort],
  },
  {
    id: "pyjs-classes", title: "Classes in Python and JavaScript", subtitle: "Constructors, instance state, methods, and error types you can explain.", category: "Python and JavaScript",
    sections: [
      { title: "When a class earns its place", body: "A class bundles data together with the functions that work on it. Use one when you have state, saved data, that must stay correct across many calls: a cache, an API client that holds a base URL, a counter with a limit. If you only turn an input into an output once, a plain function is simpler. In an interview, a good class has a constructor that checks its inputs and sets every field, plus small methods that each do one job." },
      { title: "Constructor, state, and methods side by side", body: "The constructor runs once, when you create an object: __init__ in Python, constructor in JavaScript. Fields are the object's saved data. Python methods receive the object as self, which you write as the first parameter. JavaScript methods use this, which you do not list. @property in Python and get in JavaScript let a computed value be read like a field, without parentheses.", code: "# Python\nclass RunTracker:\n    # Constructor: validate input and set every field.\n    def __init__(self, limit):\n        if limit < 1:\n            raise ValueError(\"limit must be at least 1\")\n        self.limit = limit\n        self.active = set()\n\n    def start(self, run_id):\n        if len(self.active) >= self.limit:\n            return False\n        self.active.add(run_id)\n        return True\n\n    def finish(self, run_id):\n        self.active.discard(run_id)  # no error if absent\n\n    @property\n    def available(self):  # read as tracker.available\n        return self.limit - len(self.active)\n\ntracker = RunTracker(1)\nprint(tracker.start(\"a\"))  # True\nprint(tracker.start(\"b\"))  # False: limit reached\nprint(tracker.available)   # 0\n\n// JavaScript\nclass RunTracker {\n  constructor(limit) {\n    if (limit < 1) {\n      throw new RangeError(\"limit must be at least 1\");\n    }\n    this.limit = limit;\n    this.active = new Set();\n  }\n\n  start(runId) {\n    if (this.active.size >= this.limit) return false;\n    this.active.add(runId);\n    return true;\n  }\n\n  finish(runId) {\n    this.active.delete(runId);\n  }\n\n  get available() {\n    return this.limit - this.active.size;\n  }\n}\n\nconst tracker = new RunTracker(1);\nconsole.log(tracker.start(\"a\")); // true\nconsole.log(tracker.start(\"b\")); // false: limit reached\nconsole.log(tracker.available);  // 0" },
      { title: "Worked example: an LRU cache", body: "LRU means least recently used. The cache holds at most capacity items. When it is full, it throws out (evicts) the item nobody has touched for the longest. Both get and put count as touching. The trick is a dict that remembers order: move a key to the end each time it is used, and evict from the front. Python's OrderedDict has move_to_end and popitem(last=False). A JavaScript Map keeps insertion order, so deleting and setting a key moves it to the end, and keys().next() gives the oldest. Every operation is O(1).", code: "# Python\nfrom collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.items = OrderedDict()           # oldest first\n\n    def get(self, key):\n        if key not in self.items:\n            return -1\n        self.items.move_to_end(key)\n        return self.items[key]\n\n    def put(self, key, value):\n        self.items[key] = value\n        self.items.move_to_end(key)\n        if len(self.items) > self.capacity:\n            self.items.popitem(last=False)   # evict the oldest\n\ncache = LRUCache(2)\ncache.put(1, \"a\")\ncache.put(2, \"b\")\ncache.get(1)       # 1 is now the most recent\ncache.put(3, \"c\")  # evicts 2\nprint(cache.get(2), cache.get(1))  # -1 a\n\n// JavaScript\nclass LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.items = new Map();                  // oldest first\n  }\n\n  get(key) {\n    if (!this.items.has(key)) return -1;\n    const value = this.items.get(key);\n    this.items.delete(key);\n    this.items.set(key, value);              // move to the end\n    return value;\n  }\n\n  put(key, value) {\n    this.items.delete(key);\n    this.items.set(key, value);\n    if (this.items.size > this.capacity) {\n      const oldest = this.items.keys().next().value;\n      this.items.delete(oldest);\n    }\n  }\n}\n\nconst cache = new LRUCache(2);\ncache.put(1, \"a\");\ncache.put(2, \"b\");\ncache.get(1);       // 1 is now the most recent\ncache.put(3, \"c\");  // evicts 2\nconsole.log(cache.get(2), cache.get(1));  // -1 a" },
      { title: "Errors as classes", body: "Write your own error class when callers need to tell your error apart from others, or need details such as an HTTP status, without reading the message text. In Python, subclass Exception and call super().__init__ with the message. In JavaScript, extend Error, call super(message), and set name. Then catch that one type and let every other error keep going up, so real bugs stay visible.", code: "# Python\nclass ApiError(Exception):\n    def __init__(self, status, message):\n        super().__init__(message)\n        self.status = status\n\ntry:\n    raise ApiError(404, \"run not found\")\nexcept ApiError as error:\n    print(error.status, error)  # 404 run not found\n\n// JavaScript\nclass ApiError extends Error {\n  constructor(status, message) {\n    super(message);\n    this.name = \"ApiError\";\n    this.status = status;\n  }\n}\n\ntry {\n  throw new ApiError(404, \"run not found\");\n} catch (error) {\n  // Rethrow anything else so other bugs stay visible.\n  if (!(error instanceof ApiError)) throw error;\n  console.log(error.status, error.message); // 404 run not found\n}" },
      { title: "Common mistake: shared defaults and lost this", body: "Python trap: a default such as tags=[] is created once, when the function is defined, so every call that uses the default shares the same list. Write tags=None and make a new list inside. JavaScript trap: if you pass counter.increment around by itself, it forgets which object it belongs to, so this is undefined and the call throws. Call it inside an arrow function, () => counter.increment(), or use bind.", code: "# Python\nclass Draft:\n    def __init__(self, tags=None):\n        # A new list for every instance.\n        self.tags = [] if tags is None else list(tags)\n\na, b = Draft(), Draft()\na.tags.append(\"x\")\nprint(b.tags)  # []\n\n// JavaScript\nclass Counter {\n  count = 0;\n  increment() { this.count += 1; }\n}\n\nconst counter = new Counter();\nconst loose = counter.increment;\ntry {\n  loose();\n} catch (error) {\n  console.log(error instanceof TypeError); // true\n}\n// An arrow function keeps the instance.\n[1, 2].forEach(() => counter.increment());\nconsole.log(counter.count); // 2" },
      { title: "Try it: a bounded cache", body: "Write the LRU cache from memory in your stronger language, then translate it. The LRU Cache question in Algorithms has a walkthrough and reference solutions; it does not have a runner yet, so test it yourself.", bullets: ["Capacity 1: putting a second key evicts the first.", "Updating an existing key counts as use and must not grow the cache.", "A get on a missing key returns -1 and changes nothing."] },
      { title: "Words to know", body: "Class vocabulary in plain words.", bullets: ["Class: a blueprint that says what data an object holds and what it can do.", "Instance or object: one thing built from a class, such as cache = LRUCache(2).", "Constructor: the code that runs once when an instance is created and sets its starting data.", "Field or attribute: a piece of data saved on the object, such as self.capacity.", "Method: a function that belongs to a class and works on its data.", "self and this: the object the method was called on.", "Inheritance: one class extending another to reuse its behavior, as ApiError extends Error.", "State: the data an object remembers between calls."] },
    ], sources: [refs.pyClasses, refs.pyControl, refs.mdnClasses, refs.pyCollections],
  },
  {
    id: "pyjs-crash-review", title: "Review: pick the tool and say why", subtitle: "Two cheat sheets, the sentences to say out loud, and every term from the course.", category: "Python and JavaScript",
    sections: [
      { title: "How to use this review", body: "Read the two cheat sheets, then answer the checks without scrolling up. In the interview, say your choice and the reason in one sentence before you type. Interviewers are listening for the reason as much as watching the code." },
      { title: "Control flow cheat sheet", body: "Find your situation on the left. The tool to write is on the right.", code: "Situation                       Write\nChoosing between paths?         if / elif / else\nHave the items, visit each?     for\nStop when something changes?    while\nKnown max, may stop early?      for + break\nNew list from an old one?       comprehension, map, filter\nStop at the first match?        for + return, or find, some\nSkip this item?                 continue\nLeave the loop?                 break\nLeave the function?             return\nBad input at the top?           guard clause: if ...: return" },
      { title: "Collection cheat sheet", body: "Find what you will do most often. Pick that collection.", code: "Need                           Python      JavaScript\nIn order, duplicates, by spot  list []     array []\nLook up by name or ID          dict {}     Map, or object\nSeen it? Unique values?        set()       Set\nFixed small group, or a key    tuple ()    array, \"a,b\" key\nLast in, first out (stack)     list        array push/pop\nFirst in, first out (queue)    deque       array + index\n\nSpeed: d[key], x in set     instant, O(1)\n       x in list            one by one, O(n)\n       loop inside a loop   O(n²): look for a set or dict" },
      { title: "Say it out loud", body: "Name the tool and the reason in one sentence. These are examples of the shape to copy.", bullets: ["I'll use a set for the IDs I have seen, because I check it on every item and a set answers that instantly.", "I'll keep a dict from number to position, so finding the partner is one lookup instead of a second loop.", "This is a while loop because I stop when the two pointers meet, not after a fixed count.", "I'll use a loop instead of recursion, so it is O(n) and cannot hit Python's recursion limit.", "I'll handle the empty input first and return early, so the main loop needs no special cases."] },
      { title: "All the terms in one place", body: "Every term from this course, grouped. Cover the right side and test yourself.", bullets: ["Control flow: the order code runs in, decided by if, loops, and returns.", "Iterable: anything a for loop can walk. Iteration: one trip through the loop.", "Guard clause: an early if that handles a bad case and returns.", "Off-by-one: a loop that runs one time too many or too few.", "Truthy and falsy: values that count as true or false in an if.", "Collection: any container of values, such as a list, dict, set, or tuple.", "Mutable: can change. Immutable: cannot. Hashable: allowed as a dict key or set member.", "O(1): same time at any size. O(n): grows with size. O(n²): every item times every item.", "Memoization: saving answers so the same input is not computed twice.", "Instance: one object built from a class. Constructor: the code that sets it up."] },
    ], sources: [refs.pyControl, refs.python, refs.mdnLoops, refs.pyTimeComplexity],
  },
  {
    id: "fullstack-api-client", title: "Write an API client in Python, JavaScript, and Go", subtitle: "Constants, an error type, a constructor, small methods, and error handling where you can act.", category: "Full-stack code",
    sections: [
      { title: "The shape interviewers look for", body: "Many full-stack interviews start with fetch some data from an API and do something with it. Before the details, lay down a skeleton the interviewer can follow. This lesson uses a made-up API that lists agent runs at /agents/{name}/runs. One idea matters most: the client receives the function that makes HTTP calls as a constructor argument. A test can then hand it a fake function, so you can test without a network.", bullets: ["Constants first: base URL and timeout.", "An error class that remembers the HTTP status.", "A class (a struct in Go) whose constructor receives what it needs.", "One small method per job: get_json makes the HTTP call, runs_for builds the path.", "Catch an error only where you can do something useful. Let the rest go up to the caller.", "Finish by calling it: make the client, call a method, print the result."] },
      { title: "Python", body: "The client receives an http_get function, so a test can pass a fake one. urllib raises HTTPError for 4xx and 5xx statuses. The default http_get turns that into a plain status number, so get_json makes the decision in one place. A network failure still raises URLError, for the caller to handle.", code: "import json\nfrom urllib.error import HTTPError\nfrom urllib.parse import quote\nfrom urllib.request import urlopen\n\nBASE_URL = \"https://api.example.test\"\n\nclass ApiError(Exception):\n    def __init__(self, status, message):\n        super().__init__(message)\n        self.status = status\n\ndef urllib_get(url, timeout=5):\n    try:\n        with urlopen(url, timeout=timeout) as response:\n            return response.status, json.load(response)\n    except HTTPError as error:  # a 4xx or 5xx response\n        return error.code, None\n\nclass RunsClient:\n    def __init__(self, base_url=BASE_URL, http_get=urllib_get):\n        self.base_url = base_url.rstrip(\"/\")\n        # Injected, so tests can pass a fake.\n        self.http_get = http_get\n\n    def get_json(self, path):\n        status, body = self.http_get(self.base_url + path)\n        if status != 200:\n            message = f\"GET {path} returned {status}\"\n            raise ApiError(status, message)\n        return body\n\n    def runs_for(self, agent):\n        return self.get_json(f\"/agents/{quote(agent)}/runs\")\n\ndef fake_get(url):\n    if url.endswith(\"/billing/runs\"):\n        return 200, [{\"id\": \"r1\"}]\n    return 404, None\n\nclient = RunsClient(http_get=fake_get)\nprint(client.runs_for(\"billing\"))  # [{'id': 'r1'}]\ntry:\n    client.runs_for(\"missing\")\nexcept ApiError as error:\n    print(\"handled\", error.status)  # handled 404" },
      { title: "JavaScript", body: "The same shape, with fetch passed in. getJson checks response.ok, because fetch does not throw on a 404 or 500. AbortSignal.timeout stops waiting after 5 seconds. The await outside a function needs an ES module, so save it as a .mjs file to run it.", code: "const BASE_URL = \"https://api.example.test\";\n\nclass ApiError extends Error {\n  constructor(status, message) {\n    super(message);\n    this.name = \"ApiError\";\n    this.status = status;\n  }\n}\n\nclass RunsClient {\n  constructor(baseUrl = BASE_URL, fetchFn = fetch) {\n    this.baseUrl = baseUrl.replace(/\\/$/, \"\");\n    // Injected, so tests can pass a fake.\n    this.fetchFn = fetchFn;\n  }\n\n  async getJson(path) {\n    const response = await this.fetchFn(this.baseUrl + path, {\n      signal: AbortSignal.timeout(5000),\n    });\n    if (!response.ok) {\n      const message = `GET ${path} returned ${response.status}`;\n      throw new ApiError(response.status, message);\n    }\n    return response.json();\n  }\n\n  runsFor(agent) {\n    const name = encodeURIComponent(agent);\n    return this.getJson(`/agents/${name}/runs`);\n  }\n}\n\nconst fakeFetch = async url => url.endsWith(\"/billing/runs\")\n  ? new Response(JSON.stringify([{ id: \"r1\" }]))\n  : new Response(null, { status: 404 });\n\nconst client = new RunsClient(BASE_URL, fakeFetch);\nconsole.log(await client.runsFor(\"billing\"));\n// [ { id: 'r1' } ]\ntry {\n  await client.runsFor(\"missing\");\n} catch (error) {\n  if (!(error instanceof ApiError)) throw error;\n  console.log(\"handled\", error.status); // handled 404\n}" },
      { title: "Go", body: "Go has no classes. A struct holds the data, a NewRunsClient function plays the constructor, and methods are attached to the struct. Errors are not thrown; they come back as a second return value, so you write if err != nil after each call. Wrap an error with %w to add context, and use errors.As later to check its type. Like fetch, Go returns no error for a 404, so check StatusCode yourself.", code: "type APIError struct {\n    Status int\n    Path   string\n}\n\nfunc (e *APIError) Error() string {\n    return fmt.Sprintf(\"GET %s returned %d\", e.Path, e.Status)\n}\n\ntype Run struct {\n    ID string `json:\"id\"`\n}\n\ntype RunsClient struct {\n    baseURL string\n    http    *http.Client\n}\n\nfunc NewRunsClient(baseURL string) *RunsClient {\n    return &RunsClient{\n        baseURL: strings.TrimRight(baseURL, \"/\"),\n        http:    &http.Client{Timeout: 5 * time.Second},\n    }\n}\n\nfunc (c *RunsClient) getJSON(\n    ctx context.Context, path string, out any,\n) error {\n    req, err := http.NewRequestWithContext(\n        ctx, http.MethodGet, c.baseURL+path, nil)\n    if err != nil {\n        return err\n    }\n    resp, err := c.http.Do(req)\n    if err != nil {\n        return fmt.Errorf(\"GET %s: %w\", path, err)\n    }\n    defer resp.Body.Close()\n    if resp.StatusCode != http.StatusOK {\n        return &APIError{Status: resp.StatusCode, Path: path}\n    }\n    return json.NewDecoder(resp.Body).Decode(out)\n}\n\nfunc (c *RunsClient) RunsFor(\n    ctx context.Context, agent string,\n) ([]Run, error) {\n    var runs []Run\n    path := \"/agents/\" + url.PathEscape(agent) + \"/runs\"\n    err := c.getJSON(ctx, path, &runs)\n    return runs, err\n}\n\n// Caller:\n// runs, err := client.RunsFor(ctx, \"billing\")\n// var apiErr *APIError\n// if errors.As(err, &apiErr) && apiErr.Status == 404 {\n//     // not found: show an empty state\n// }" },
      { title: "Common mistake: trusting fetch to throw", body: "Each language reports a bad HTTP status differently. fetch throws only when the network fails or the request is cancelled; a 404 or 500 comes back normally with ok set to false. Python's urllib raises HTTPError, and the popular requests library does not raise until you call raise_for_status. Go returns no error for any status. So check the status yourself in every language. Also avoid a catch-all that logs and returns an empty list: it makes an outage look like there is simply no data.", bullets: ["Decide which errors the client handles itself and which it passes to the caller.", "Keep the status on the error so callers can check it without reading the message.", "Retries need rules about which errors are safe to retry; see the Build reliable API boundaries lesson."] },
      { title: "Words to know", body: "API words in plain terms.", bullets: ["API: a set of URLs a program can call to get or change data.", "Endpoint: one URL in the API, such as /agents/billing/runs.", "Status code: the number a response starts with. 2xx worked, 4xx the request was wrong (404 not found), 5xx the server failed.", "JSON: the text format most APIs send, made of objects, arrays, strings, and numbers.", "Client: the code that calls the API for you.", "Transport: the function that actually sends the HTTP request, such as fetch or urlopen.", "Dependency injection: passing in what a class needs, such as the transport, instead of creating it inside.", "Timeout: the longest you will wait before giving up.", "Propagate: let an error keep going up to the caller instead of catching it."] },
      { title: "Try it: add a second method", body: "Practice in your own editor. Add failed_runs(agent), which returns only runs whose status is error. Call runs_for inside it instead of repeating the HTTP code.", bullets: ["Test it with a fake transport that returns one ok run and one error run.", "Test the 404 path and confirm the caller gets the error class with status 404.", "Say how you would add a timeout and retries without changing the code that calls the method."] },
    ], sources: [refs.urllib, refs.mdnResponseOk, refs.mdnFetch, refs.goHttp, refs.goErrors],
  },
  {
    id: "fullstack-paginate-aggregate", title: "Page through an API and summarize the results", subtitle: "Follow cursors to the end, then group records into a small report.", category: "Full-stack code",
    sections: [
      { title: "The task", body: "A made-up runs API returns results one page at a time: {\"items\": [...], \"next_cursor\": \"abc\"}. On the last page, next_cursor is null. Each item has agent, status, and ms. Build one row per agent with its run count, error count, and average time rounded down, sorted by most errors and then by name. Split the work into two functions: one fetches every page, and one does the math. Then you can test the math with a plain list and the paging with a fake client." },
      { title: "Follow the cursor", body: "Pagination means getting a big result in pages. A cursor is a bookmark the API hands back that means ask for this next. Fetch the first page, hand out its items, and keep going while there is a next cursor. That is a while loop, because you do not know how many pages there are. Stop when the cursor is missing, not when a page is short or empty, since some APIs return an empty page before the end. yield makes the function a generator: it hands out items one at a time, so the caller can stop early and you never hold every page at once.", bullets: ["Encode the cursor when you put it in a URL.", "Guard against a server bug that repeats a cursor: track seen cursors or cap the page count."], code: "# Python\nfrom urllib.parse import quote\n\ndef iter_runs(client):\n    cursor = None\n    while True:\n        path = \"/runs\"\n        if cursor is not None:\n            path += f\"?cursor={quote(cursor)}\"\n        page = client.get_json(path)\n        yield from page[\"items\"]\n        cursor = page.get(\"next_cursor\")\n        if cursor is None:\n            return\n\n// JavaScript\nasync function* iterRuns(client) {\n  let cursor = null;\n  do {\n    let path = \"/runs\";\n    if (cursor !== null) {\n      path += `?cursor=${encodeURIComponent(cursor)}`;\n    }\n    const page = await client.getJson(path);\n    yield* page.items;\n    cursor = page.next_cursor ?? null;\n  } while (cursor !== null);\n}" },
      { title: "Group and summarize", body: "This is the counting pattern from the collections lessons: a dict or Map from agent name to running totals. After the loop, turn each total into a row and sort. The sort key (-errors, agent) means most errors first, and ties in name order. The JavaScript compare function uses < and > on names so both languages order text the same way.", code: "# Python\nfrom collections import defaultdict\n\ndef new_total():\n    return {\"runs\": 0, \"errors\": 0, \"ms\": 0}\n\ndef agent_stats(runs):\n    totals = defaultdict(new_total)\n    for run in runs:\n        t = totals[run[\"agent\"]]\n        t[\"runs\"] += 1\n        t[\"ms\"] += run[\"ms\"]\n        if run[\"status\"] == \"error\":\n            t[\"errors\"] += 1\n    rows = []\n    for agent, t in totals.items():\n        avg_ms = t[\"ms\"] // t[\"runs\"]\n        rows.append({\"agent\": agent, \"runs\": t[\"runs\"],\n                     \"errors\": t[\"errors\"], \"avg_ms\": avg_ms})\n    rows.sort(key=lambda r: (-r[\"errors\"], r[\"agent\"]))\n    return rows\n\n// JavaScript\nconst newTotal = () => ({ runs: 0, errors: 0, ms: 0 });\nconst byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);\n\nfunction agentStats(runs) {\n  const totals = new Map();\n  for (const { agent, status, ms } of runs) {\n    const t = totals.get(agent) ?? newTotal();\n    t.runs += 1;\n    t.ms += ms;\n    if (status === \"error\") t.errors += 1;\n    totals.set(agent, t);\n  }\n  const rows = [...totals].map(([agent, t]) => ({\n    agent, runs: t.runs, errors: t.errors,\n    avg_ms: Math.floor(t.ms / t.runs),\n  }));\n  return rows.sort((a, b) =>\n    b.errors - a.errors || byName(a.agent, b.agent));\n}" },
      { title: "Worked example", body: "Two pages, a fake client, and the expected report. The fake client is a dict of path to response, which is all the paging code needs.", code: "def run(agent, status, ms):\n    return {\"agent\": agent, \"status\": status, \"ms\": ms}\n\npages = {\n    \"/runs\": {\"items\": [run(\"billing\", \"ok\", 100)],\n              \"next_cursor\": \"p2\"},\n    \"/runs?cursor=p2\": {\"items\": [run(\"billing\", \"error\", 300),\n                                  run(\"support\", \"ok\", 50)],\n                        \"next_cursor\": None},\n}\n\nclass FakeClient:\n    def get_json(self, path):\n        return pages[path]\n\nfor row in agent_stats(iter_runs(FakeClient())):\n    print(row)\n# {'agent': 'billing', 'runs': 2, 'errors': 1, 'avg_ms': 200}\n# {'agent': 'support', 'runs': 1, 'errors': 0, 'avg_ms': 50}" },
      { title: "Common mistake: rounding differs by language", body: "Averages show where the languages differ. Python's round sends a half to the nearest even number, so round(22.5) is 22, while JavaScript's Math.round(22.5) is 23. Python's // always rounds down, even for negatives; JavaScript needs Math.floor for that, and Math.trunc just drops the decimals. Agree on the rounding rule up front and use an explicit function, so both versions give the same answer.", code: "# Python\nprint(round(22.5), round(23.5))  # 22 24: half to even\nprint(45 // 2, -7 // 2)          # 22 -4: floor\n\n// JavaScript\nconsole.log(Math.round(22.5), Math.round(23.5)); // 23 24\nconsole.log(Math.floor(45 / 2), Math.trunc(-7 / 2)); // 22 -3" },
      { title: "Try it: add a time window", body: "Practice in your own editor. Change the report to include only runs from the last hour, and decide whether that filter belongs in the API query or in your code.", bullets: ["Test a page with no items that still has a next cursor.", "Test a tie on errors to confirm the name order.", "Say what changes if the API returns millions of runs: add up totals as items arrive and never build the full list."] },
      { title: "Words to know", body: "Paging and summary words in plain terms.", bullets: ["Pagination: getting a large result in smaller pages.", "Cursor: a bookmark token from the API that says where the next page starts.", "Generator: a function that uses yield to hand out values one at a time.", "Aggregate: combine many records into totals, counts, or averages.", "Floor: round down to a whole number.", "Pure function: a function whose output depends only on its input and that changes nothing else, so it is easy to test.", "Fake or stub: a stand-in object that returns fixed answers in a test."] },
    ], sources: [refs.python, refs.pyCollections, refs.mdnLoops, refs.map],
  },
  {
    id: "fullstack-stream-parsing", title: "Parse streamed events in code", subtitle: "Turn server-sent event text into complete messages, even when network chunks split lines.", category: "Full-stack code",
    sections: [
      { title: "Why this shows up", body: "AI products show answers while they are being written, by streaming small pieces. Server-sent events (SSE) is a simple text format for that. In the browser, EventSource reads SSE for you, but only for GET requests without custom headers. If you start a run with a POST body or an auth header, you read the stream yourself and parse it. The same parser works in Python. This lesson is the parsing code; the Keep streaming state honest lesson covers what the screen should do with the events." },
      { title: "The format in five rules", body: "A stream is lines of text. This simple parser handles lines that end in a newline and the event and data fields. The full spec also allows carriage returns and has id and retry fields.", bullets: ["A blank line means the event is finished: hand it out (dispatch it).", "event: name sets the event type. If there is none, the type is message.", "Each data: line adds a line to the event's data. Several data lines are joined with a newline. An event with no data is skipped.", "After the colon, one space is removed if present. A line that starts with a colon is a comment, often a keepalive ping.", "If the stream ends before the blank line, the unfinished event is thrown away."] },
      { title: "A parser that survives chunk boundaries", body: "The network splits data into chunks anywhere, even in the middle of a word. So add each chunk to a buffer, process only complete lines, and keep the leftover partial line for next time. The half-built event also carries over between calls, so an event split across chunks gets finished later.", code: "# Python\nclass SseParser:\n    def __init__(self):\n        self.buffer = \"\"\n        self.event, self.data = \"message\", []\n\n    def feed(self, chunk):\n        self.buffer += chunk\n        # Keep the unfinished last line for the next chunk.\n        *lines, self.buffer = self.buffer.split(\"\\n\")\n        events = []\n        for line in lines:\n            if line == \"\":\n                self._dispatch(events)\n                continue\n            if line.startswith(\":\"):\n                continue\n            field, _, value = line.partition(\":\")\n            if value.startswith(\" \"):\n                value = value[1:]\n            if field == \"event\":\n                self.event = value\n            elif field == \"data\":\n                self.data.append(value)\n        return events\n\n    def _dispatch(self, events):\n        if self.data:\n            data = \"\\n\".join(self.data)\n            events.append({\"event\": self.event, \"data\": data})\n        self.event, self.data = \"message\", []\n\nparser = SseParser()\nprint(parser.feed(\"event: token\\ndata: Hel\"))  # []\nprint(parser.feed(\"lo\\n\\n: ping\\n\\n\"))\n# [{'event': 'token', 'data': 'Hello'}]\nprint(parser.feed(\"data: a\\ndata: b\\n\\n\"))\n# [{'event': 'message', 'data': 'a\\nb'}]\n\n// JavaScript\nclass SseParser {\n  buffer = \"\";\n  event = \"message\";\n  data = [];\n\n  feed(chunk) {\n    this.buffer += chunk;\n    const lines = this.buffer.split(\"\\n\");\n    this.buffer = lines.pop(); // the unfinished line\n    const events = [];\n    for (const line of lines) {\n      if (line === \"\") { this.dispatch(events); continue; }\n      if (line.startsWith(\":\")) continue;\n      const colon = line.indexOf(\":\");\n      const field = colon === -1 ? line : line.slice(0, colon);\n      let value = colon === -1 ? \"\" : line.slice(colon + 1);\n      if (value.startsWith(\" \")) value = value.slice(1);\n      if (field === \"event\") this.event = value;\n      else if (field === \"data\") this.data.push(value);\n    }\n    return events;\n  }\n\n  dispatch(events) {\n    if (this.data.length) {\n      const data = this.data.join(\"\\n\");\n      events.push({ event: this.event, data });\n    }\n    this.event = \"message\";\n    this.data = [];\n  }\n}\n\nconst parser = new SseParser();\nconsole.log(parser.feed(\"event: token\\ndata: Hel\")); // []\nconsole.log(parser.feed(\"lo\\n\\ndata: done\\n\\n\"));\n// [ { event: 'token', data: 'Hello' },\n//   { event: 'message', data: 'done' } ]" },
      { title: "Reading the stream", body: "A static sketch: app, agent, render, prompt, and StartRun stand for your application's code. On the server, FastAPI's StreamingResponse sends whatever an async generator yields; json.dumps keeps each token on one data line. In the browser, fetch exposes the body as a stream, TextDecoderStream turns bytes into text without splitting multi-byte characters, and the parser turns text into events. An AbortController is the Stop button.", code: "# Python\nfrom fastapi.responses import StreamingResponse\n\n@app.post(\"/api/runs\")\nasync def start_run(body: StartRun):\n    async def events():\n        async for token in agent.stream(body.prompt):\n            yield f\"event: token\\ndata: {json.dumps(token)}\\n\\n\"\n        yield \"event: done\\ndata: {}\\n\\n\"\n    return StreamingResponse(\n        events(), media_type=\"text/event-stream\")\n\n// JavaScript\n// controller.abort() is the Stop button.\nconst controller = new AbortController();\nconst response = await fetch(\"/api/runs\", {\n  method: \"POST\",\n  body: JSON.stringify({ prompt }),\n  signal: controller.signal,\n});\nif (!response.ok) {\n  throw new Error(`stream failed with ${response.status}`);\n}\nconst parser = new SseParser();\nconst reader = response.body\n  .pipeThrough(new TextDecoderStream())\n  .getReader();\nwhile (true) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  for (const event of parser.feed(value)) render(event);\n}" },
      { title: "Common mistake: parsing each chunk alone", body: "Splitting each chunk on blank lines works in a demo, where chunks happen to line up with events, and breaks on a slow network. Keep the buffer and the half-built event between chunks. The end of the stream is not the end of an event: an unfinished event is thrown away. Turn bytes into text with a streaming decoder instead of decoding each chunk alone, or a character split across two chunks gets garbled.", bullets: ["Test one event split across three chunks.", "Test a chunk that ends in the middle of the blank line that finishes an event.", "Test that a last event with no blank line after it is not handed out."] },
      { title: "Words to know", body: "Streaming words in plain terms.", bullets: ["Stream: data that arrives a piece at a time instead of all at once.", "Chunk: one piece the network delivers. Its edges are random.", "Buffer: a holding spot for text that arrived but is not a complete line yet.", "Parser: code that turns raw text into structured values.", "Server-sent events (SSE): a text format for a server to push events over one HTTP response.", "Dispatch: hand a finished event to the code that uses it.", "Keepalive: a comment line sent so the connection does not look idle."] },
      { title: "Try it: finish the parser", body: "Practice in your own editor. Extend the parser for the parts this lesson skipped.", bullets: ["Accept carriage-return line feed line endings by removing a trailing carriage return from each line.", "Record the id field so a client can resume with the Last-Event-ID header.", "Return typed events in TypeScript with a discriminated union of token, done, and error."] },
    ], sources: [refs.sseSpec, refs.sse, refs.textDecoderStream, refs.fastapiStreaming],
  },
];


const card = (id: string, category: string, question: string, answer: string, example?: string, difficulty: Flashcard["difficulty"] = "Foundation"): Flashcard => ({ id, category, question, answer, example, difficulty });

export const flashcards: Flashcard[] = [
  card("f01", "System design", "What should I ask before drawing architecture?", "Who uses it, what successful work means, key constraints, scale, and failure tolerance. Confirm the most important workflow before choosing infrastructure.", "For an agent: which tools can act, what needs approval, and how long may a run take?"),
  card("f02", "System design", "What is an invariant?", "A property that must remain true across all allowed operations. State it clearly, then design storage and transitions to preserve it.", "A caller cannot read a run from an unauthorized tenant."),
  card("f03", "System design", "What belongs in a durable run record?", "Identity and tenant, status/version, input reference, timestamps, agent version, and links to steps, events, approvals, and outcomes. Keep large artifacts separate.", undefined, "Applied"),
  card("f04", "Backend", "Does a timeout mean an operation failed?", "No. The caller stopped waiting. The server may still finish or may already have committed. Record unknown outcomes and reconcile before repeating a consequential action."),
  card("f05", "Backend", "What does an idempotency key solve?", "It identifies retries of the same logical command. Store it with tenant, operation, input fingerprint, and result; reject different input under the same key.", "A double-click should resolve to one accepted run.", "Applied"),
  card("f06", "Backend", "Why is check-then-insert unsafe?", "Two requests can both see no record and both insert. Enforce uniqueness in the database and handle the conflict inside the transaction.", "UNIQUE(tenant_id, operation, idempotency_key)", "Applied"),
  card("f07", "Backend", "When should I retry?", "When the error is transient, another attempt is safe, and time/attempt budgets remain. Use capped backoff with jitter; do not retry every error."),
  card("f08", "Backend", "Why use a transactional outbox?", "It commits a domain change and a message record together, avoiding a database/queue dual-write gap. Publishing can repeat, so consumers still need deduplication.", undefined, "Applied"),
  card("f09", "System design", "Does durable orchestration mean exactly-once side effects?", "No. Recovery can repeat an external activity. Use idempotent actions or reconcile uncertain outcomes; distinguish orchestration durability from business-effect uniqueness.", undefined, "Applied"),
  card("f10", "System design", "What happens when a user cancels a run?", "Accept a cancellation request, stop scheduling new work, and cancel active work where supported. Reconcile already-issued actions and report the final state accurately.", "Cancel requested is not the same as cancelled.", "Applied"),
  card("f11", "Frontend", "When is SSE a good fit?", "For one-way progress updates from server to browser. Use normal HTTP requests for commands. A true persistent two-way interaction may justify WebSockets."),
  card("f12", "Frontend", "How does a progress UI recover after reconnect?", "Use event positions and an application replay contract. Ignore repeats; if history is missing, load an authoritative snapshot before continuing.", undefined, "Applied"),
  card("f13", "Frontend", "Why use a discriminated union for run state?", "A shared literal field lets TypeScript narrow each state to its valid data, reducing impossible combinations. Network input still needs runtime validation."),
  card("f14", "Frontend", "What should a disconnected UI say?", "Connection lost, reconnecting. Preserve the last known run status and timestamp; do not claim the job failed merely because the stream dropped."),
  card("f15", "Security", "Authentication versus authorization?", "Authentication establishes identity. Authorization decides whether that identity can perform this action on this resource in this context."),
  card("f16", "Security", "Where does the tenant ID come from?", "From validated identity and an authorized membership selection. Never treat a prompt, URL, or request body alone as proof of access.", "Also scope caches, events, search, and object storage."),
  card("f17", "Security", "What can bypass Postgres row security?", "Superusers and BYPASSRLS roles bypass it. Table owners normally do too unless forced under the policy. Verify behavior with the actual application role.", undefined, "Applied"),
  card("f18", "Security", "What is indirect prompt injection?", "Untrusted content, such as a retrieved document, tries to redirect the model. Treat it as data and enforce tool permissions outside the model."),
  card("f19", "Security", "What should an approval bind to?", "The specific action and arguments, relevant version, approver, scope, and expiry. Changed input needs a fresh decision; authorization is rechecked when executing.", undefined, "Applied"),
  card("f20", "Security", "Should a tool credential appear in model context?", "No. A trusted broker should hold the secret and execute a narrowly authorized operation. Redact sensitive inputs and outputs from traces."),
  card("f21", "AI engineering", "What is a useful agent evaluation?", "A repeatable task with clear success checks, versioned inputs/configuration, and recorded outcomes. Check the resulting action or state, not only the answer's wording."),
  card("f22", "AI engineering", "Why keep a held-out dataset?", "Repeated tuning can overfit known examples. A separate set helps assess generalization; once used repeatedly for decisions, it can also become contaminated."),
  card("f23", "AI engineering", "Can an LLM judge prove correctness?", "No. It is an imperfect measurement. Prefer exact checks where possible, calibrate against human review, and inspect disagreement and systematic errors."),
  card("f24", "AI engineering", "What should be versioned for an agent release?", "Application code, prompt, model/settings, tool schemas, retrieval configuration, and evaluation dataset. Keep enough provenance to compare and investigate behavior.", undefined, "Applied"),
  card("f25", "AI engineering", "What is the difference between RAG and fine-tuning?", "Retrieval adds selected external context at inference time. Fine-tuning changes model parameters. Choose based on whether the problem is access to knowledge, behavior, or something else; evaluate rather than assume."),
  card("f26", "Math", "600 requests/minute is how many per second?", "600 divided by 60 = 10 requests/second. Write the units so the conversion stays visible."),
  card("f27", "Math", "10 runs/second, 20 seconds average duration: concurrency?", "Roughly 200 runs in flight at steady state: arrival rate x average duration. Bursts and changing rates need additional analysis.", "10 runs/second x 20 seconds = 200 runs."),
  card("f28", "Math", "80% to 86%: how much improvement?", "6 percentage points. Relative improvement is 6/80 = 7.5%. On 50 tasks, it is only 3 additional successes; uncertainty still matters."),
  card("f29", "Algorithms", "What does O(n) mean in plain words?", "Work grows roughly in proportion to input size. Double the input and the main work roughly doubles, ignoring constants and fixed overhead."),
  card("f30", "Algorithms", "When should I reach for a map or set?", "A map for key-to-value lookup or counts; a set for membership or deduplication. They often avoid repeatedly scanning already-seen items.", "Count repeated tool names or track seen event IDs."),
  card("f31", "Algorithms", "How do I merge overlapping intervals?", "Sort by start. Keep the current merged interval. Extend its end for an overlap; otherwise emit it and begin the next. Clarify whether touching intervals merge.", "[1,3], [2,5], [8,9] -> [1,5], [8,9]."),
  card("f32", "Algorithms", "What invariant helps with a sliding window?", "State what is always true inside the current window, then move the left boundary until it is true again after adding the next item.", "For no repeated characters, every character in the window must be unique.", "Applied"),
  card("f33", "Live coding", "What should I do before optimizing?", "Make the straightforward approach correct, state its complexity, and identify repeated work. Test tiny cases before changing the algorithm."),
  card("f34", "Live coding", "Does async automatically make work parallel?", "No. Awaiting operations sequentially remains sequential. Concurrency requires scheduling overlapping tasks; CPU parallelism is a separate concern."),
  card("f35", "Live coding", "What makes a good failure test?", "It targets a promised behavior: duplicate input, timeout, invalid data, cross-tenant access, partial completion, or a race. Explain the expected outcome before running it."),
  card("f36", "Communication", "How do I give a strong senior-level answer?", "State the decision, why it fits the constraints, a concrete example, its tradeoff, and how you would verify it. Separate work you actually did from a proposed design."),
];

export const exercises: Exercise[] = [
  {
    id: "design-agent-run", title: "Design an enterprise agent workbench", kind: "System design", duration: 60,
    description: "Suggested practice, not a confirmed interview prompt. An operator asks an agent to investigate a support case, stream findings, and propose a CRM update that needs approval. Design the first production version.",
    requirements: ["Separate tenants and authorize every run, event stream, artifact, and approval.", "A run may last minutes and must survive browser disconnects and worker restarts.", "Prevent duplicate CRM updates after an uncertain timeout.", "Show useful progress, a clear approval action, and honest failure/recovery states.", "State workload assumptions and measure task success, latency, and cost."],
    phases: [{ minutes: 5, label: "Clarify actors, outcome, scope, and constraints" }, { minutes: 10, label: "Sketch one request and data model" }, { minutes: 20, label: "Deep dive into durability and tool authority" }, { minutes: 10, label: "Handle failures, reconnects, and scale" }, { minutes: 10, label: "Discuss evaluation and tradeoffs" }, { minutes: 5, label: "Self-review with evidence" }],
    hints: ["Follow a single operator request from the browser to its final business effect. Mark every place it can fail.", "Separate command acceptance, durable execution, and progress delivery. The stream is not the source of truth.", "The hardest case: CRM commits, the response is lost, then the worker restarts. Explain how you learn what happened before writing again."],
    rubric: ["Names assumptions and keeps the first release scoped.", "Defines an explicit run lifecycle and consistent API/data model.", "Explains a credible duplicate-write and crash-recovery strategy.", "Places authorization outside model behavior and preserves tenant boundaries.", "Explains one concrete evaluation and operational recovery path.", "Uses estimates with units and admits uncertain outcomes."],
    starter: "Actors and success:\nAssumptions and non-goals:\nAPI contracts:\nData and invariants:\nRequest path:\nFailure cases:\nSecurity boundaries:\nMeasurement and rollout:\nTradeoffs:",
    solution: "One defensible design, not the only answer:\n\n1. API authenticates the operator, resolves tenant membership, validates input, and creates a durable run with a tenant-scoped command key. Return 202 and a run ID.\n2. A workflow worker orchestrates model calls and read-only tools. External side effects run as separately recorded activities. Persist checkpoints, attempts, and events with monotonically increasing per-run sequence numbers.\n3. Tables: runs, steps, approvals, tool_attempts, events, artifacts. Include tenant IDs, actor IDs, timestamps, and versions. Use foreign keys and scoped uniqueness constraints.\n4. Tool gateway authorizes each call. A credential broker performs the allowed operation without exposing secrets to the model. Retrieved content has no authority to grant permissions.\n5. Before a CRM write, store an approval tied to the exact action and input digest. Recheck permission and current state at execution. Use a stable remote idempotency key when available. If a timeout leaves the result unknown, query/reconcile; if reconciliation is impossible, pause for explicit resolution instead of promising exactly once.\n6. UI reads an authoritative snapshot, then SSE events. Deduplicate sequence numbers; replay retained events or fetch a fresh snapshot if history is missing. Separate connection status from run status.\n7. Use durable workflow scheduling, or a database outbox plus a queue and explicit state machine. Explain the operational complexity of each. Cancellation prevents new work but cannot reverse completed external effects.\n8. Example assumption: 600 runs/minute = 10/second; 20 seconds average active duration implies about 200 active runs at steady state. Verify bursts, provider limits, and connection capacity.\n9. Measure authorized task completion, failure categories, queue age, latency percentiles, and cost per successful task. Test crashes, duplicates, policy changes, and malicious documents. Roll out a version gradually with a clear disable switch.\n\nSelf-check: Where is each guarantee enforced? What remains uncertain? Which component would you simplify first?",
  },
  {
    id: "code-events", title: "Streamed run events", kind: "Live coding", duration: 60,
    description: "Suggested Python or JavaScript exercise. Write a pure reducer for a run's text output. Events may repeat; gaps must trigger snapshot recovery. Event objects are assumed to have passed runtime schema validation.",
    requirements: ["Events carry an integer seq, starting at 1, and type delta, done, or failed.", "Ignore events at or below the last applied sequence.", "On a gap, preserve the current state and report needsSnapshot. The caller must resync before feeding more events.", "Append text deltas; done and failed are terminal.", "Reject a new event after a terminal state. Do not mutate the input state."],
    phases: [{ minutes: 5, label: "Clarify ordering and recovery contract" }, { minutes: 10, label: "Define types and examples" }, { minutes: 25, label: "Implement reducer" }, { minutes: 10, label: "Test duplicates, gaps, and terminal behavior" }, { minutes: 5, label: "Discuss streaming UI integration" }, { minutes: 5, label: "Self-review" }],
    hints: ["Handle duplicates and sequence gaps before interpreting the payload.", "Use a discriminated union for the event and a separate return field for recovery.", "Returning the same state on a gap is deliberate. The caller must fetch a snapshot; it must not quietly skip the missing event."],
    rubric: ["No repeated text after a duplicate delta.", "A gap cannot silently produce an apparently complete result.", "Terminal state is protected and input state stays unchanged.", "Explains runtime validation and snapshot/version integration.", "Tests behavior with concrete expected outputs."],
    starter: "type State = { seq: number; text: string; status: 'running' | 'done' | 'failed'; error?: string };\ntype Event =\n  | { seq: number; type: 'delta'; text: string }\n  | { seq: number; type: 'done' }\n  | { seq: number; type: 'failed'; error: string };\ntype Result = { state: State; needsSnapshot: boolean };\n\nfunction applyEvent(state: State, event: Event): Result {\n  throw new Error('Implement during practice');\n}",
    solution: "type State = { seq: number; text: string; status: 'running' | 'done' | 'failed'; error?: string };\ntype Event =\n  | { seq: number; type: 'delta'; text: string }\n  | { seq: number; type: 'done' }\n  | { seq: number; type: 'failed'; error: string };\ntype Result = { state: State; needsSnapshot: boolean };\n\nfunction applyEvent(state: State, event: Event): Result {\n  if (event.seq <= state.seq) return { state, needsSnapshot: false };\n  if (event.seq !== state.seq + 1) return { state, needsSnapshot: true };\n  if (state.status !== 'running') throw new Error('Event after terminal state');\n  switch (event.type) {\n    case 'delta':\n      return { state: { ...state, seq: event.seq, text: state.text + event.text }, needsSnapshot: false };\n    case 'done':\n      return { state: { ...state, seq: event.seq, status: 'done' }, needsSnapshot: false };\n    case 'failed':\n      return { state: { ...state, seq: event.seq, status: 'failed', error: event.error }, needsSnapshot: false };\n  }\n}\n\n// Cases to run yourself:\n// Initial seq 0 + delta(1, 'A') -> text A, seq 1.\n// Same delta again -> unchanged.\n// done(3) while seq 1 -> needsSnapshot, unchanged.\n// done(2) while running seq 1 -> terminal done.\n// delta(3) after done seq 2 -> error.\n// Duplicate done(2) -> unchanged.\n\n// String concatenation cost depends on accumulated text.\n// For large output, batch chunks and bound retained history.\n// This example is not a transport, persistence, or runtime validator.",
  },
  {
    id: "code-idempotency", title: "Idempotent run creation", kind: "Live coding", duration: 60,
    description: "Suggested Python or JavaScript exercise. Implement the command-acceptance core for starting runs in one process. Focus on a clear contract, then explain the database and distributed-systems boundary.",
    requirements: ["Input: trusted tenantId, request key, prompt. Reject blank values.", "The same tenant/key/prompt returns the same run ID.", "The same tenant/key with a different prompt throws a conflict.", "Different tenants may reuse the same key independently.", "No asynchronous work in this in-memory acceptance step. Explain why production needs durable uniqueness."],
    phases: [{ minutes: 5, label: "Clarify scope and identity assumptions" }, { minutes: 10, label: "Write examples and types" }, { minutes: 25, label: "Implement command acceptance" }, { minutes: 10, label: "Test collisions and tenant separation" }, { minutes: 5, label: "Explain production transaction and outbox" }, { minutes: 5, label: "Self-review" }],
    hints: ["Store the accepted input alongside the run ID, not just the key.", "Avoid concatenating unescaped tenant and key strings with a delimiter. A nested map makes the namespace explicit.", "Move to a unique database constraint and atomic transaction for multiple processes. This function does not make external actions exactly once."],
    rubric: ["Returns the original ID for an identical retry.", "Detects conflicting input and avoids tenant collisions.", "States the single-process synchronous limitation.", "Explains concurrent inserts, persistence, and scheduling failure.", "Does not mistake command deduplication for external effect deduplication."],
    starter: "type Run = { id: string; tenantId: string; prompt: string };\nclass RunStore {\n  accept(tenantId: string, key: string, prompt: string): Run {\n    throw new Error('Implement during practice');\n  }\n}",
    solution: "type Run = { id: string; tenantId: string; prompt: string };\nclass RunStore {\n  private tenants = new Map<string, Map<string, Run>>();\n  private nextId = 1;\n\n  accept(tenantId: string, key: string, prompt: string): Run {\n    if (![tenantId, key, prompt].every(v => v.trim().length > 0)) {\n      throw new Error('Blank input');\n    }\n    let runs = this.tenants.get(tenantId);\n    if (!runs) {\n      runs = new Map();\n      this.tenants.set(tenantId, runs);\n    }\n    const existing = runs.get(key);\n    if (existing) {\n      if (existing.prompt !== prompt) throw new Error('Idempotency conflict');\n      return { ...existing };\n    }\n    const run: Run = { id: String(this.nextId++), tenantId, prompt };\n    runs.set(key, run);\n    return { ...run };\n  }\n}\n\n// Cases to run: identical retry; changed prompt; two tenants;\n// whitespace-only prompt; mutation of a returned object.\n// IDs are local demonstration IDs, not durable production IDs.\n// Map storage grows with accepted commands; define retention.\n// Production: trusted auth context, runtime validation, a unique\n// (tenant, operation, key) constraint, durable input fingerprint,\n// and run plus outbox insert in one transaction.\n// On conflict, compare input and return the existing result.\n// An external write needs its own idempotency/reconciliation contract.",
  },
  {
    id: "code-workers", title: "Bounded async jobs", kind: "Live coding", duration: 60,
    description: "Suggested Python or JavaScript exercise. Build a small worker pool for read-only async jobs. Preserve input order in the results while limiting how many calls run at once.",
    requirements: ["Reject limits below one.", "Return results in input order, regardless of completion order.", "At most limit jobs execute concurrently.", "A job exception should fail the batch and cancel sibling workers.", "Handle an empty list. Assume jobs cooperate with cancellation; do not claim remote side effects are undone."],
    phases: [{ minutes: 5, label: "Clarify failure and cancellation contract" }, { minutes: 10, label: "Sketch workers and result slots" }, { minutes: 25, label: "Implement" }, { minutes: 10, label: "Test concurrency, ordering, and failure" }, { minutes: 5, label: "Discuss memory and timeouts" }, { minutes: 5, label: "Self-review" }],
    hints: ["Assign each input an index. A worker stores its result in that index's slot.", "In one asyncio event loop, taking the next iterator item without an await between selection and assignment avoids interleaving that selection.", "TaskGroup supervises a fixed set of workers and cancels siblings when a worker fails. The caller receives a grouped exception."],
    rubric: ["Actually bounds active jobs and avoids one task per input.", "Preserves input ordering.", "Does not silently discard exceptions or cancellation.", "Handles empty input and invalid limits.", "Explains per-call deadlines and O(n) result storage."],
    starter: "from collections.abc import Awaitable, Callable\n\nasync def run_limited(jobs: list[Callable[[], Awaitable[object]]], limit: int) -> list[object]:\n    raise NotImplementedError('Implement during practice')",
    solution: "import asyncio\nfrom collections.abc import Awaitable, Callable\n\nasync def run_limited(\n    jobs: list[Callable[[], Awaitable[object]]],\n    limit: int,\n) -> list[object]:\n    if limit < 1:\n        raise ValueError('limit must be positive')\n    results: list[object] = [None] * len(jobs)\n    indexed = iter(enumerate(jobs))\n\n    async def worker() -> None:\n        for index, job in indexed:\n            results[index] = await job()\n\n    async with asyncio.TaskGroup() as group:\n        for _ in range(min(limit, len(jobs))):\n            group.create_task(worker())\n    return results\n\n# Python 3.11+ example. Cases to run yourself:\n# Empty jobs -> []. Limit 0 -> ValueError.\n# Jobs completing in reverse order still return input order.\n# Instrument an active counter: maximum must not exceed limit.\n# A failing job -> TaskGroup raises an ExceptionGroup and\n# cancels sibling workers; completed external work remains done.\n# Fixed worker count uses O(limit) tasks and O(n) result memory.\n# This iterator assumption applies to one event loop, not threads.\n# Add deadlines around each job according to the caller contract.",
  },
  {
    id: "algo-intervals", title: "Merge time windows", kind: "Algorithms", duration: 60,
    description: "Suggested algorithm practice using interview scheduling. Merge integer minute ranges without mutating the input. Start with a drawn example, then code in your strongest language.",
    requirements: ["Each interval is [start, end] with start <= end. Reject invalid ranges.", "Intervals may be unsorted and duplicated.", "For this exercise, touching intervals merge: [1,3] and [3,5] become [1,5].", "Return sorted non-overlapping intervals. Empty input returns an empty list.", "Explain the invariant, time complexity, and extra space."],
    phases: [{ minutes: 5, label: "Clarify boundary behavior" }, { minutes: 10, label: "Draw examples and explain a simple approach" }, { minutes: 25, label: "Implement a sort and scan" }, { minutes: 10, label: "Test nesting, touching, duplicates, and empty input" }, { minutes: 5, label: "Explain complexity and mutation" }, { minutes: 5, label: "Self-review" }],
    hints: ["Sort by the starting minute. What can the next interval overlap after that?", "Keep the last merged interval. If the next start is no larger than its end, extend the end to the maximum.", "Invariant: the output already covers every processed interval and is sorted with no mergeable neighbors."],
    rubric: ["Handles contained intervals without shrinking an existing range.", "Implements the stated touching-boundary rule.", "Leaves the original input unchanged.", "Explains O(n log n) sorting plus O(n) scanning and O(n) extra storage.", "Works through a tiny example aloud before optimizing."],
    starter: "def merge_windows(windows: list[tuple[int, int]]) -> list[tuple[int, int]]:\n    raise NotImplementedError('Implement during practice')\n\n# [(8, 10), (1, 3), (2, 6), (10, 12)]\n# Expected: [(1, 6), (8, 12)]",
    solution: "def merge_windows(windows: list[tuple[int, int]]) -> list[tuple[int, int]]:\n    if any(start > end for start, end in windows):\n        raise ValueError('start must not exceed end')\n    merged: list[tuple[int, int]] = []\n    for start, end in sorted(windows):\n        if not merged or start > merged[-1][1]:\n            merged.append((start, end))\n        else:\n            left, right = merged[-1]\n            merged[-1] = (left, max(right, end))\n    return merged\n\n# Cases to run yourself:\n# [] -> []\n# [(1, 5), (2, 3)] -> [(1, 5)]\n# [(1, 3), (3, 5)] -> [(1, 5)]\n# [(2, 2), (2, 2)] -> [(2, 2)]\n# [(4, 1)] -> ValueError\n# Sorting makes the scan local: only the last merged range\n# can overlap the next range. O(n log n) time, O(n) space.\n# API callers must validate runtime types separately.",
  },
];

const languageExamples: Record<string, NonNullable<Exercise["languages"]>> = {
  "code-events": {
    python: {
      starter: `def apply_event(state: dict, event: dict) -> dict:
    """Return {state: ..., needsSnapshot: bool}. Inputs are validated."""
    raise NotImplementedError('Implement during practice')

# Initial state: {'seq': 0, 'text': '', 'status': 'running'}
# Event: {'seq': 1, 'type': 'delta', 'text': 'Hello'}`,
      solution: `def apply_event(state: dict, event: dict) -> dict:
    if event['seq'] <= state['seq']:
        return {'state': state, 'needsSnapshot': False}
    if event['seq'] != state['seq'] + 1:
        return {'state': state, 'needsSnapshot': True}
    if state['status'] != 'running':
        raise ValueError('Event after terminal state')

    updated = {**state, 'seq': event['seq']}
    kind = event['type']
    if kind == 'delta':
        updated['text'] = state['text'] + event['text']
    elif kind == 'done':
        updated['status'] = 'done'
    elif kind == 'failed':
        updated['status'] = 'failed'
        updated['error'] = event['error']
    else:
        raise ValueError('Unknown event type')
    return {'state': updated, 'needsSnapshot': False}

# Cases to run yourself:
# delta 1 ('A') -> text A; repeated delta 1 -> unchanged.
# done 3 after seq 1 -> needsSnapshot, unchanged state.
# done 2 after seq 1 -> terminal done.
# delta 3 after done 2 -> ValueError.
# The caller must resync after a gap before applying more events.
# Input state is not mutated. Returned unchanged state is shared;
# callers should treat all state as immutable.
# Repeated string copying can be costly for large output.
# Batch chunks and bound history in a production interface.`,
    },
    javascript: {
      starter: `function applyEvent(state, event) {
  // Return { state, needsSnapshot }. Inputs are validated.
  throw new Error('Implement during practice');
}

// Initial: { seq: 0, text: '', status: 'running' }
// Event: { seq: 1, type: 'delta', text: 'Hello' }`,
      solution: `function applyEvent(state, event) {
  if (event.seq <= state.seq) return { state, needsSnapshot: false };
  if (event.seq !== state.seq + 1) return { state, needsSnapshot: true };
  if (state.status !== 'running') throw new Error('Event after terminal state');
  const updated = { ...state, seq: event.seq };
  switch (event.type) {
    case 'delta':
      updated.text = state.text + event.text;
      break;
    case 'done':
      updated.status = 'done';
      break;
    case 'failed':
      updated.status = 'failed';
      updated.error = event.error;
      break;
    default:
      throw new Error('Unknown event type');
  }
  return { state: updated, needsSnapshot: false };
}

// Cases to run: duplicate delta, sequence gap, terminal event,
// duplicate terminal event, and a new event after completion.
// After a gap, the caller must resync before applying more events.
// Input state is not mutated. Treat returned state as immutable.
// String concatenation cost depends on accumulated output;
// batch chunks and bound retained history for large streams.
// This example assumes runtime validation at the network boundary.`,
    },
  },
  "code-idempotency": {
    python: {
      starter: `class RunStore:
    def accept(self, tenant_id: str, key: str, prompt: str) -> dict:
        raise NotImplementedError('Implement during practice')`,
      solution: `class RunStore:
    def __init__(self):
        self.runs: dict[tuple[str, str], dict] = {}
        self.next_id = 1

    def accept(self, tenant_id: str, key: str, prompt: str) -> dict:
        if not all(value.strip() for value in (tenant_id, key, prompt)):
            raise ValueError('Blank input')
        namespace = (tenant_id, key)
        existing = self.runs.get(namespace)
        if existing is not None:
            if existing['prompt'] != prompt:
                raise ValueError('Idempotency conflict')
            return dict(existing)
        run = {'id': str(self.next_id), 'tenantId': tenant_id, 'prompt': prompt}
        self.next_id += 1
        self.runs[namespace] = run
        return dict(run)

# Cases to run: identical retry, changed prompt, separate tenants,
# blank input, and mutation of a returned object.
# This is single-threaded synchronous acceptance, not a thread-safe
# or durable store. It does not execute the command.
# Production: trusted auth, runtime validation, unique database key
# over (tenant, operation, key), durable input fingerprint, and
# transactional creation of the run and scheduling/outbox record.
# External effects require their own reconciliation contract.
# Storage grows with retained commands; define key retention.`,
    },
    javascript: {
      starter: `class RunStore {
  accept(tenantId, key, prompt) {
    throw new Error('Implement during practice');
  }
}`,
      solution: `class RunStore {
  constructor() {
    this.tenants = new Map();
    this.nextId = 1;
  }
  accept(tenantId, key, prompt) {
    if (![tenantId, key, prompt].every(v => typeof v === 'string' && v.trim())) {
      throw new Error('Blank or invalid input');
    }
    let runs = this.tenants.get(tenantId);
    if (!runs) {
      runs = new Map();
      this.tenants.set(tenantId, runs);
    }
    const existing = runs.get(key);
    if (existing) {
      if (existing.prompt !== prompt) throw new Error('Idempotency conflict');
      return { ...existing };
    }
    const run = { id: String(this.nextId++), tenantId, prompt };
    runs.set(key, run);
    return { ...run };
  }
}

// Cases to run: identical retry, conflicting prompt, two tenants,
// blank input, and mutation of a returned object.
// Single-process synchronous example. No command execution here.
// Production: durable IDs, trusted auth, database uniqueness,
// an atomic run/outbox transaction, and a key retention policy.
// Do not add an await between checking and storing without
// rethinking concurrency. Multiple processes need database rules.
// Command deduplication does not deduplicate a remote side effect.`,
    },
  },
  "code-workers": {
    python: {
      starter: `from collections.abc import Awaitable, Callable

async def run_limited(jobs: list[Callable[[], Awaitable[object]]], limit: int) -> list[object]:
    raise NotImplementedError('Implement during practice')`,
      solution: `import asyncio
from collections.abc import Awaitable, Callable

async def run_limited(
    jobs: list[Callable[[], Awaitable[object]]],
    limit: int,
) -> list[object]:
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
        raise ValueError('limit must be a positive integer')
    results: list[object] = [None] * len(jobs)
    indexed = iter(enumerate(jobs))

    async def worker() -> None:
        for index, job in indexed:
            results[index] = await job()

    async with asyncio.TaskGroup() as group:
        for _ in range(min(limit, len(jobs))):
            group.create_task(worker())
    return results

# Python 3.11+. Test empty input, bad limit, out-of-order completion,
# active count <= limit, and one job failing.
# TaskGroup cancels sibling workers and raises an ExceptionGroup.
# Cancellation is cooperative; completed external effects remain.
# The shared iterator is consumed on one event loop, not threads.
# O(limit) tasks, O(n) result storage. Add per-job deadlines as needed.`,
    },
    javascript: {
      starter: `async function runLimited(jobs, limit) {
  // Each job is an async function accepting an AbortSignal.
  throw new Error('Implement during practice');
}`,
      solution: `async function runLimited(jobs, limit) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('limit must be a positive integer');
  }
  const results = new Array(jobs.length);
  const controller = new AbortController();
  let next = 0;
  let failed = false;
  let firstError;

  async function worker() {
    while (!controller.signal.aborted) {
      const index = next++;
      if (index >= jobs.length) return;
      try {
        results[index] = await jobs[index](controller.signal);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstError = error;
          controller.abort(error);
        }
        return;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, jobs.length) },
    () => worker(),
  );
  await Promise.allSettled(workers);
  if (failed) throw firstError;
  return results;
}

// Test empty input, invalid limit, out-of-order completion,
// active count <= limit, and a job failing.
// Jobs must honor the signal. Aborting does not force arbitrary
// promises to stop or undo remote effects. Await cleanup before return.
// If a job ignores cancellation and never settles, this can wait
// indefinitely. Production jobs need their own deadline contract.
// O(limit) workers and O(n) result storage.`,
    },
  },
  "algo-intervals": {
    python: {
      starter: `def merge_windows(windows: list[tuple[int, int]]) -> list[tuple[int, int]]:
    raise NotImplementedError('Implement during practice')

# [(8, 10), (1, 3), (2, 6), (10, 12)] -> [(1, 6), (8, 12)]`,
      solution: `def merge_windows(windows: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if any(start > end for start, end in windows):
        raise ValueError('start must not exceed end')
    merged: list[tuple[int, int]] = []
    for start, end in sorted(windows):
        if not merged or start > merged[-1][1]:
            merged.append((start, end))
        else:
            left, right = merged[-1]
            merged[-1] = (left, max(right, end))
    return merged

# Cases to run:
# [] -> []
# [(1, 5), (2, 3)] -> [(1, 5)]
# [(1, 3), (3, 5)] -> [(1, 5)]
# [(2, 2), (2, 2)] -> [(2, 2)]
# [(4, 1)] -> ValueError
# Invariant: processed ranges are covered, sorted, and merged.
# O(n log n) time, O(n) extra space; input is not mutated.
# API callers validate runtime types before this function.`,
    },
    javascript: {
      starter: `function mergeWindows(windows) {
  throw new Error('Implement during practice');
}

// [[8, 10], [1, 3], [2, 6], [10, 12]] -> [[1, 6], [8, 12]]`,
      solution: `function mergeWindows(windows) {
  if (windows.some(([start, end]) => start > end)) {
    throw new Error('start must not exceed end');
  }
  const sorted = windows.map(([start, end]) => [start, end]);
  sorted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) {
      merged.push([start, end]);
    } else {
      last[1] = Math.max(last[1], end);
    }
  }
  return merged;
}

// Test empty, nested, touching, duplicate, invalid, and unsorted ranges.
// Numeric comparator matters: default JS sort is not numeric.
// Input arrays remain unchanged because ranges were copied.
// With an O(n log n) comparison sort, overall time is O(n log n).
// Extra storage is O(n). API callers validate runtime types.`,
    },
  },
};

for (const exercise of exercises) {
  const languages = languageExamples[exercise.id];
  if (languages) {
    exercise.languages = languages;
    exercise.starter = languages.python.starter;
    exercise.solution = languages.python.solution;
  }
}

export const stories: Story[] = [];
