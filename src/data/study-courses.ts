import { studyCourseSchema, type StudyCourse } from "@/contracts/study";
import { cheatSheets } from "@/data/prep";

const checks = {
  durable: [
    {
      id: "remote-write-timeout",
      prompt: "A CRM write times out, and the worker cannot tell whether the CRM committed it. What should happen before another write?",
      options: [
        { id: "retry-now", text: "Retry immediately because the worker saw a timeout." },
        { id: "reconcile-first", text: "Reconcile the remote outcome, or retry with a supported stable idempotency key." },
        { id: "report-failure", text: "Mark it failed and tell the operator the write did not happen." },
        { id: "restart-workflow", text: "Restart orchestration and assume the write runs exactly once." },
      ],
      answerId: "reconcile-first",
      explanation: "A timeout only describes what the caller observed. The remote write may have committed. Reconcile its result or use an idempotency key supported by the remote system; durable orchestration alone does not make an external effect happen once.",
      sourceSectionTitle: "The failure you should volunteer",
    },
    {
      id: "approval-action-binding",
      prompt: "An operator approves a CRM update, but the proposed arguments change before execution resumes. What should the system do?",
      options: [
        { id: "reuse-approval", text: "Reuse the approval because the operator approved this CRM update already." },
        { id: "new-approval", text: "Require approval for the changed action and recheck authorization at execution." },
        { id: "model-decides", text: "Let the model decide whether the difference is important." },
        { id: "skip-check", text: "Execute the changed action, then record what happened." },
      ],
      answerId: "new-approval",
      explanation: "Approval is bound to the action, arguments, actor, and version. Changed input needs a fresh decision, and authorization is checked again when execution resumes.",
      sourceSectionTitle: "The failure you should volunteer",
    },
  ],
  api: [
    {
      id: "retry-policy",
      prompt: "A provider returns a transient error during a read-only request. What is a sound retry policy?",
      options: [
        { id: "retry-every-error", text: "Retry every error until one succeeds." },
        { id: "bounded-classified", text: "Retry a classified transient error within a deadline and attempt budget, using capped backoff with jitter." },
        { id: "retry-all-layers", text: "Retry independently at every layer to maximize the chance of success." },
        { id: "no-retries", text: "Never retry any request, even when it is safe and transient." },
      ],
      answerId: "bounded-classified",
      explanation: "Retry only classified transient failures when the operation is safe to repeat and time and attempt budgets remain. Capped backoff with jitter helps avoid synchronized retry load.",
      sourceSectionTitle: "Retry policy you can say aloud",
    },
    {
      id: "idempotency-boundary",
      prompt: "Two identical start requests arrive at nearly the same time. Which design prevents both from creating a run?",
      options: [
        { id: "client-check", text: "Ask the browser to check for an existing run before sending." },
        { id: "db-unique", text: "Enforce uniqueness for tenant, operation, and idempotency key in the database." },
        { id: "worker-check", text: "Let each worker check for a run before it starts processing." },
        { id: "long-timeout", text: "Increase the request timeout so the first request finishes." },
      ],
      answerId: "db-unique",
      explanation: "A check followed by an unguarded insert can race: both requests may see no row. A database uniqueness rule makes the invariant hold across concurrent requests.",
      sourceSectionTitle: "A request contract",
    },
  ],
  streaming: [
    {
      id: "stream-gap",
      prompt: "After reconnecting to a run's event stream, the browser sees a sequence gap. What should it do?",
      options: [
        { id: "skip-gap", text: "Skip the missing sequence and render later events as complete." },
        { id: "mark-failed", text: "Mark the run failed because the browser disconnected." },
        { id: "snapshot", text: "Fetch an authoritative snapshot or replay the missing history before continuing." },
        { id: "use-websocket", text: "Switch to WebSockets because they recover application state automatically." },
      ],
      answerId: "snapshot",
      explanation: "A reconnecting transport does not restore missed application state by itself. Use event positions with replay or fetch an authoritative snapshot when history is missing.",
      sourceSectionTitle: "Choose the channel",
    },
    {
      id: "cancelled-run-status",
      prompt: "The browser loses its SSE connection while a background run continues. What should the interface conclude?",
      options: [
        { id: "run-failed", text: "The run failed because its event connection closed." },
        { id: "run-cancelled", text: "The run was cancelled because the browser is gone." },
        { id: "separate-status", text: "Show the connection as lost while retaining the last known run status." },
        { id: "hide-status", text: "Clear the run status until a new event arrives." },
      ],
      answerId: "separate-status",
      explanation: "Connection status and run status are different facts. A disconnected browser does not mean the background run stopped; retain the last known status and recover through the app's event or snapshot contract.",
      sourceSectionTitle: "Choose the channel",
    },
  ],
  authority: [
    {
      id: "document-instruction-authority",
      prompt: "A retrieved document tells an agent to export every customer's records. What gives the agent permission to do that?",
      options: [
        { id: "document-authority", text: "The document, because it came from a customer system." },
        { id: "model-intent", text: "The model's judgment that the request is relevant." },
        { id: "trusted-policy", text: "A trusted authorization policy outside the model, with approval when required." },
        { id: "unguessable-id", text: "An unguessable run identifier." },
      ],
      answerId: "trusted-policy",
      explanation: "Retrieved content is data and cannot grant permission. Enforce tool allowlists, authorization, least privilege, and approval for consequential actions outside the model.",
      sourceSectionTitle: "A malicious document scenario",
    },
    {
      id: "verify-row-security-role",
      prompt: "Which database role should be used to verify row security as normal application requests experience it?",
      options: [
        { id: "superuser", text: "A superuser." },
        { id: "table-owner", text: "The table owner." },
        { id: "restricted-app-role", text: "The restricted application role used for requests." },
        { id: "bypass-rls", text: "A role with BYPASSRLS." },
      ],
      answerId: "restricted-app-role",
      explanation: "Superusers and BYPASSRLS roles bypass row policies, and table owners normally do unless row security is forced. Verify policies using the restricted application role.",
      sourceSectionTitle: "Defense in depth in Postgres",
    },
  ],
  evaluation: [
    {
      id: "small-eval-difference",
      prompt: "A candidate succeeds on 43 of 50 cases and a baseline on 40 of 50. What conclusion follows from these counts alone?",
      options: [
        { id: "proven-production", text: "The candidate is proven better in production." },
        { id: "six-points-three-cases", text: "That is six percentage points, or three more cases; the sample alone does not establish a reliable gain." },
        { id: "seven-five-points", text: "That is a 7.5 percentage point improvement." },
        { id: "baseline-wins", text: "The baseline is better because it has fewer successes." },
      ],
      answerId: "six-points-three-cases",
      explanation: "The rates are 80% and 86%, a six percentage point difference and three additional successes. The guide cautions that this small comparison alone does not establish a reliable gain.",
      sourceSectionTitle: "Tiny numbers, honest conclusion",
    },
    {
      id: "verify-business-outcome",
      prompt: "A fluent agent says it updated a support case. Which check most directly verifies the task outcome?",
      options: [
        { id: "fluent-answer", text: "Judge whether the explanation sounds fluent." },
        { id: "result-and-policy", text: "Check the resulting business state and whether the action was permitted." },
        { id: "token-count", text: "Count the generated tokens." },
        { id: "self-judge", text: "Ask the same model once whether it did the right thing." },
      ],
      answerId: "result-and-policy",
      explanation: "For a support workflow, success includes correct resolution, permitted tool behavior, and the right final business state. Fluent wording alone is not enough.",
      sourceSectionTitle: "Define success before running",
    },
  ],
  coding: [
    {
      id: "coding-task-first-step",
      prompt: "You receive an unfamiliar coding prompt with unclear ordering rules. What is a useful first move?",
      options: [
        { id: "start-coding", text: "Start implementing the most optimized solution immediately." },
        { id: "clarify-example", text: "Restate the task, work one input/output example, and clarify invalid data and ordering." },
        { id: "memorize-pattern", text: "Choose a familiar algorithm pattern before reading all constraints." },
        { id: "wait-for-hint", text: "Wait silently until the interviewer suggests an approach." },
      ],
      answerId: "clarify-example",
      explanation: "The guide recommends restating the task, giving an example, asking about invalid data and ordering, and proposing a minimal interface before implementation.",
      sourceSectionTitle: "The first five minutes",
    },
    {
      id: "merge-interval-approach",
      prompt: "You need to merge unsorted overlapping time ranges. Which approach matches the guide?",
      options: [
        { id: "pairwise-repeat", text: "Compare every pair repeatedly until no two ranges overlap." },
        { id: "sort-and-scan", text: "Sort by start, then scan and extend the last merged range when it overlaps." },
        { id: "set-ranges", text: "Put the ranges in a set and return the set." },
        { id: "always-stack", text: "Use a stack because all interval problems are nested matching." },
      ],
      answerId: "sort-and-scan",
      explanation: "Sorting by start lets one scan maintain the already-merged output. Compare each range with the last output range and extend its end when they overlap; clarify whether touching ranges merge.",
      sourceSectionTitle: "Pattern recognition",
    },
    {
      id: "test-promised-behavior",
      prompt: "A reducer promises to ignore duplicate events and request recovery after a sequence gap. Which test is most useful?",
      options: [
        { id: "happy-only", text: "Test only one event arriving in order." },
        { id: "duplicate-gap", text: "Send the same event twice, then send an event with a missing sequence and check the stated outcomes." },
        { id: "format-only", text: "Check that the function name follows the team's naming convention." },
        { id: "typecheck-only", text: "Run a type check and assume runtime behavior is correct." },
      ],
      answerId: "duplicate-gap",
      explanation: "The guide names duplicate events and gaps as concrete boundary cases for a run reducer. A useful test states the expected behavior for each promised case; a type check alone cannot prove it.",
      sourceSectionTitle: "Test useful boundaries",
    },
    {
      id: "linear-growth-meaning",
      prompt: "An algorithm makes one pass over n items. In plain language, what does O(n) describe?",
      options: [
        { id: "constant-time", text: "The work is independent of input size." },
        { id: "proportional-growth", text: "The main work grows roughly in proportion to the number of items." },
        { id: "quadratic-growth", text: "The work compares every item with every other item." },
        { id: "exact-seconds", text: "The algorithm always finishes in n seconds." },
      ],
      answerId: "proportional-growth",
      explanation: "The guide describes O(n) as work growing roughly with input size. It describes growth, not elapsed seconds, and ignores constants and fixed overhead.",
      sourceSectionTitle: "Say what doubles",
    },
  ],
} satisfies Record<string, StudyCourse["lessons"][number]["checks"]>;

const courses: StudyCourse[] = [
  {
    id: "reliable-systems", version: 1, title: "Design reliable agent systems",
    description: "Design a useful workflow, protect writes from retries, and keep streaming state honest.",
    theme: "blue", illustration: 0,
    lessons: [
      { id: "durable-agent-runs", guideId: "agent-design", title: "Design a durable agent run", description: "Trace one customer workflow through durable execution, approvals, and recovery.", checks: checks.durable },
      { id: "reliable-api-boundaries", guideId: "api-reliability", title: "Build reliable API boundaries", description: "Use idempotency and bounded retries to make command behavior predictable.", checks: checks.api },
      { id: "streaming-state", guideId: "streaming-ui", title: "Keep streaming state honest", description: "Separate connection, run, and partial output state; recover missed events explicitly.", checks: checks.streaming },
    ],
  },
  {
    id: "trusted-agents", version: 1, title: "Protect tenant data and agent authority",
    description: "Follow identity and tenant boundaries, then constrain what tools can do.",
    theme: "purple", illustration: 1,
    lessons: [
      { id: "tenant-authority", guideId: "tenant-security", title: "Keep authority outside the model", description: "Treat retrieved content as untrusted input and verify controls under the right database role.", checks: checks.authority },
    ],
  },
  {
    id: "ai-evaluation", version: 1, title: "Evaluate AI changes with evidence",
    description: "Define task success, inspect direct outcomes, and report small comparisons carefully.",
    theme: "green", illustration: 2,
    lessons: [
      { id: "release-evidence", guideId: "evals", title: "Measure release evidence", description: "Combine deterministic checks, human review, and careful interpretation of results.", checks: checks.evaluation },
    ],
  },
  {
    id: "coding-reasoning", version: 1, title: "Reason through coding problems",
    description: "Clarify behavior first, choose a simple pattern, and explain its limits.",
    theme: "gold", illustration: 3,
    lessons: [
      { id: "collaborative-coding", guideId: "coding-collab", title: "Collaborate through a coding problem", description: "Clarify the contract, test useful boundaries, and close with a concrete review.", checks: checks.coding.filter(check => check.id === "coding-task-first-step" || check.id === "test-promised-behavior") },
      { id: "algorithm-reasoning", guideId: "math-patterns", title: "Choose and explain an algorithm", description: "Use concrete examples and recognize a sort-and-scan approach for overlapping ranges.", checks: checks.coding.filter(check => check.id === "merge-interval-approach" || check.id === "linear-growth-meaning") },
    ],
  },
];

export const studyCourses: StudyCourse[] = studyCourseSchema.array().parse(courses);

// Keep course references anchored to the guide catalog. A missing guide is a content error.
for (const course of studyCourses) {
  for (const lesson of course.lessons) {
    const guide = cheatSheets.find(item => item.id === lesson.guideId);
    if (!guide || lesson.checks.some(check => !guide.sections.some(section => section.title === check.sourceSectionTitle))) {
      throw new Error(`Study lesson ${lesson.id} references a missing guide section`);
    }
  }
}
