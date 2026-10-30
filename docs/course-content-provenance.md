# Course content provenance

Sources checked on 2026-10-29, with MDN Array.prototype.forEach() and the Python wiki Time complexity page added and checked on 2026-10-30. Every source URL below returned HTTP 200 on the date checked. Scenarios in the lessons (agent runs, an operations API at /agents/{name}/runs, a cursor-paginated runs API) are fictional.

## Python and JavaScript for coding interviews

ID `python-js-interview-essentials`. Coding, Foundations. Prerequisite: reading basic code in either Python or JavaScript. Written in plain words for a learner who has not yet internalized when to use each loop or collection; every lesson ends with a "Words to know" glossary, and the last lesson is a cheat sheet and terms review.

Outcomes: choose if, for, or while for a task and say why; choose a list, dict, set, or tuple by the operation you repeat; explain three Fibonacci versions and how their work grows; write a small class with a constructor, methods, and an error type; define the common interview terms in plain words.

| Lesson | Guide | Checks | Sources |
|---|---|---|---|
| `choose-if-for-while` | `pyjs-choose-control` | `pick-for-known-items`, `pick-while-unknown-count`, `foreach-stop-early`, `retry-loop-choice`, `term-off-by-one` | Python tutorial: More control flow tools; MDN: Loops and iteration; MDN: Array.prototype.forEach() |
| `loops-branches-exits` | `pyjs-control-flow` | `truthy-empty-array`, `break-vs-continue`, `for-else-meaning`, `fib-naive-cost`, `term-memoization` | Python tutorial: More control flow tools; MDN: Loops and iteration; Python: functools |
| `choose-list-dict-set` | `pyjs-choose-collection` | `seen-signups-set`, `lookup-by-id-dict`, `ordered-steps-list`, `tuple-key-hashable`, `term-o1-meaning` | Python tutorial: Data structures; Python wiki: Time complexity; MDN: Map and Set; Python: collections |
| `choose-collections` | `pyjs-collections` | `js-default-sort`, `map-vs-object-keys`, `grid-shared-rows`, `two-sum-check-first` | Python tutorial: Data structures; Python: collections; MDN: Map, Set, Array.prototype.sort(); Python: Sorting techniques |
| `classes-and-errors` | `pyjs-classes` | `term-instance`, `lru-structure`, `mutable-default-arg`, `custom-error-why`, `self-and-this` | Python tutorial: Classes and More control flow tools (default argument evaluation); MDN: Classes; Python: collections (OrderedDict) |
| `crash-course-review` | `pyjs-crash-review` | `review-collection-term`, `review-iterable`, `review-mutable`, `review-guard-clause`, `review-say-why` | Python tutorial: More control flow tools and Data structures; MDN: Loops and iteration; Python wiki: Time complexity |

Practice link: `algo-intervals`. Claims to note: forEach has no way to stop early other than throwing (MDN); dict and set lookups are O(1) on average and list membership is O(n) (Python wiki); a Python set does not preserve insertion order while dict and JavaScript Set do; the Python default recursion limit is 1000 (sys.getrecursionlimit); fib(78) = 8944394323791464 is the largest Fibonacci number below Number.MAX_SAFE_INTEGER; Array.prototype.sort without a comparator compares string values. The two cheat sheets in the review lesson are plain text tables, not code.

## Write full-stack interview code

ID `fullstack-interview-code`. Coding, Intermediate. Prerequisite: the course above, or equivalent comfort with classes and dictionaries in one language.

Each lesson ends with a "Words to know" glossary. Outcomes: structure an API client with an injected transport and a typed error; check HTTP status explicitly in Python, JavaScript, and Go; page through a cursor API and aggregate records; parse a server-sent event stream across chunk boundaries.

| Lesson | Guide | Checks | Sources |
|---|---|---|---|
| `api-client-shape` | `fullstack-api-client` | `inject-transport-reason`, `fetch-404-behavior`, `go-error-check`, `term-status-5xx` | Python: urllib.request; MDN: Response.ok and Using the Fetch API; Go: net/http and errors |
| `paginate-and-summarize` | `fullstack-paginate-aggregate` | `pagination-stop`, `separate-collect-aggregate`, `round-half-difference`, `term-cursor` | Python tutorial: Data structures; Python: collections; MDN: Loops and iteration and Map |
| `parse-stream-events` | `fullstack-stream-parsing` | `term-buffer`, `sse-chunk-split`, `sse-multiple-data`, `sse-incomplete-end` | HTML Standard: Server-sent events; MDN: Server-sent events and TextDecoderStream; FastAPI: Custom response classes |

Practice links: `code-events`, `code-workers`. The streaming lesson states the HTML Standard rules it relies on: a blank line dispatches, data lines join with a line feed, one leading space after the colon is removed, colon-prefixed lines are comments, an empty data buffer is not dispatched, and pending data is discarded at the end of the stream. The lesson parser handles only line-feed endings and the event and data fields, and says so.

## Paths

- `pyjs-interview-crash-course`: `python-js-interview-essentials`, `coding-reasoning`, `fullstack-interview-code`. Language mechanics first, then problem reasoning, then full-stack code shape.
- `agent-product-engineering`: `fullstack-interview-code`, `reliable-systems`, `trusted-agents`. Client and streaming code first, then the durable workflow and authority boundaries around it.

## Example verification

All runnable Python, JavaScript, and Go examples were executed with bounded timeouts (Python 3.10, Node 23, Go 1.26; 54 runnable segments) and their printed output matches the comments in the guides. The Go client ran against an httptest server, including the 404 and errors.As paths. Additional edge cases were run outside the guides: an empty page with a next cursor, an encoded cursor, tied error counts, an event split across chunks, a blank line split across chunks, and a trailing event without a blank line. The FastAPI endpoint and the browser fetch reader in "Reading the stream" are labeled static sketches and were not executed.
