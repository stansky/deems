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
