# Coding practice

Deems uses the existing CodeMirror editor and a separate authenticated Judge0 service. The app never executes submitted code in its Next.js process. Normal runs and comparisons make no model calls.

## Coverage and behavior

Fourteen function problems have JavaScript and Python starters, two visible examples and six fixed tests each. Runnable only filters the existing question bank. Other questions and Go/PHP reference solutions remain readable, with a clear message when execution is unavailable. Tests are original deterministic fixtures, not a claim to reproduce LeetCode's complete judge.

Run examples checks the two examples. Submit tests checks all six cases. A result records the exact code, problem ID, suite hash, language/runtime, run mode, per-case input/expected/actual/error, measured time/memory, and timestamps. Passing means this suite passed. It does not change skill assessments, course completion or role readiness.

JavaScript and Python drafts are separate and scoped to the signed-in browser workspace. They remain in this tab's session storage. Saved runs are append-only in that account's PostgreSQL schema. Load code retains an Undo action. Editing after a run marks its results as belonging to earlier code. A completed run whose save failed is explicitly unsaved.

## Contracts and storage

GET /api/coding?questionId=<id> returns the function contract, examples, configured state and the latest 20 attempts for that question. POST /api/coding takes an attempt UUID, questionId, language, mode and code. An identical UUID/input returns the prior attempt; different input with that UUID is rejected. One recent active run and ten new runs per minute are permitted per account. Source is limited to 32,000 characters with no NUL, and request bodies are stream-limited to 100 KB.

src/contracts/coding.ts owns shared Zod/TypeScript/OpenAPI schemas. The generated API document describes both operations. src/domains/coding/suites.ts owns complete tests on the server; src/data/coding-problems.ts contains public function signatures and starters. Results are compared outside the submitted process, including order-independent Two Sum indices. Missing, duplicate or malformed result records cannot pass.

The checksum-checked coding-v6 migration adds one table. It has a question foreign key, bounded language/mode/status/source/hash/result columns, queue/history indexes and consistent completion timestamps. Existing migrations and records are retained. The existing private export endpoint includes coding attempts in version 8; no export controls are restored to the interface.

## Runner

The existing OVH host runs a dedicated KVM guest. The host's cgroups v2 and existing app containers remain in place. Only the Ubuntu 22.04 guest uses cgroups v1 for Judge0. The VM has 2 vCPUs, 2 GB RAM, a 2800 MB host memory cap and a 28 GB thin disk. QEMU blocks guest outbound connections. Guest SSH and Judge0 are forwarded only to host loopback ports. The existing host Caddy process terminates HTTPS. See infra/judge0 for the unit, route, configuration, pinned upstream image and modern runtime build inputs.

Judge0 program networking is also disabled. Limits are 2 CPU seconds, 5 wall seconds, 128,000 KB memory, 64 KB file output and 32 processes/threads. The app imposes a separate 25-second provider deadline and bounds response bodies. Callbacks, additional files and custom compiler/CLI options are disabled. Secrets remain server-side. Judge0 startup logging is disabled because its upstream script prints the environment. Finished runner jobs are transient; app attempts remain durable.

DEEMS_JUDGE0_URL and DEEMS_JUDGE0_TOKEN must be set separately in each hosted Vercel project. The manual Configure Deems coding runner workflow updates these values through the existing deployment credential. The local ignored .env provides the same settings for Compose. Without configuration the editor remains usable and execution is explicitly unavailable.

## Verification

Desktop only, as requested. Evidence stays under private/coding-verification. Local PostgreSQL was dumped and restored to a separate database before migration verification. The migration was applied twice, original table counts were preserved, and invalid storage values were rejected. A separate staging dump and a production demo-account export were captured. A complete production dump could not be retrieved from the provider's protected connection values. No destructive migration or personal state reset is used.

Release verification covers actual remote JS/Python runs, incorrect results, syntax/runtime errors, timeouts, network rejection, API validation, saved history, idempotency, code drafts, language switches and settled real-page screenshots. Individual receipts distinguish trusted local reference execution, live Judge0 execution, intercepted visual fixtures and hosted checks.
