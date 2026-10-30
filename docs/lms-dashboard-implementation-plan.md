# Deems dashboard and navigation implementation

Owner approved implementation and deployment on October 28, 2026, following the Opus 5.5 review and expanded desktop reference collection. This is the active UI plan for this slice and supplements docs/lms-learning-plan.md.

## Reference lock

Keep the Deems wordmark-only header, cream character with minimal Presidio context, compact square company cards and visible company branding. The October 29 request adds Light, Dark and System appearance, with light as the default. The earlier light-only lock is superseded. Codecademy owns the separation of discovery, saved learning and ordered curriculum. Brilliant contributes the first-steps checklist, contextual resume with course selectors, ordered course tiles, and clear answer feedback with Why and Continue. GreatFrontEnd contributes distinct practice formats, company plans and contextual detail progress. Clearful contributes restrained empty states. Do not copy XP, leagues, certificates, marketing promotions or unsupported streaks.

The private evidence gallery is private/design-review-opus-20261028/expanded-references/index.html. It contains 2732px Brilliant originals and 3352px signed-in Safari GreatFrontEnd captures, with complete long-page images and source manifests. Premium gates remain evidence limits.

## Implementation order

1. Shared navigation and density: Home, My learning, Browse, Practice, Career as direct header destinations. Secondary navigation belongs within its hub. Keep existing editor routes, drafts and role-origin context. Share one 1200px content width and 24px gutters. Trim repeated footer navigation; retain real export and credits destinations only.
2. Learning: My learning contains saved/started courses and paths only, with in-progress, saved and completed filters. Empty means a short message and Browse action, not catalog cards presented as owned. Browse keeps search/type/topic discovery and gains explicit Guides and Reference access. Shared cards use consistent course/path identity, readable metadata, whole-card opening and contextual completion/next activity.
3. Home: distinguish new, active, finished, loading and unavailable states. New learners see a small first-steps checklist and real starter suggestions. Active learners see contextual resume with small course selectors, saved progress/coverage and earned milestones, followed by a compact in-progress shelf. Completed learners get review and a next catalog choice. Do not fill empty areas with zeroes, empty progress bars, duplicate links or locked trophies. Show review due only for previously reviewed cards that are now due. Career plans remain compact and separate from learning totals.
4. Career: preserve branded square company cards, fix contrast and missing logo fallback, show real plan-step completion only, and keep each company unique. Improve company detail orientation and progress using existing target data without mixing role stages. No schema changes or fabricated data.
5. Quiz: clear correct/incorrect feedback, optional Why explanation and Continue, with no XP. Preserve explicit submission, draft recovery and failed-save behavior.

## Verification and release

- No new unit-test suite or evaluation project. Run the existing typecheck, contract check, required existing tests and production build.
- Use the real local desktop page at 1440 by 1000 or 1440 by 900. Capture settled screenshots of Home new, active with multiple courses, completed, loading and failed states; My learning empty/saved/progress/completed; Browse and filters; Practice; Career and company detail; quiz feedback. Fixtures are browser-only and clearly labeled, not personal accomplishments.
- Verify navigation, direct reload, contextual resume/course switching, owned versus suggested content, saved selections surviving reload, and Why/Continue behavior. Prefer browser interception for state/failure fixtures. Any persistence check uses exact disposable setting keys, readback and cleanup. Preserve personal state and existing drafts.
- Check shared width, readable metadata, one primary first action, one mascot maximum, visible focus and working controls. Company text must have at least 4.5:1 contrast; logos need a deterministic fallback. Desktop only per the owner's latest instruction.
- Build and restart the local app, inspect real-page screenshots against the locked references, then commit the scoped source/docs and push to main/staging. Confirm both deployment workflows and public revision/assets. Keep authentication, signup controls, crawler exclusions and per-account isolation intact.

## Boundaries

No migrations, reseeding, authentication changes, new content claims, fake accomplishments, global framework replacement or generated replacement branding. Recommendations are fixed rules over existing saved records. New storage is unnecessary for this slice; earned milestone dates derive from saved module completion dates when available. Unknown history stays unknown.

## Status

Implemented: five direct header destinations and contextual hub navigation; a dedicated Practice overview; saved-only My learning with status filtering; state-aware Home and deterministic resume; consistent course/path cards and connected path tiles; branded unique company cards with image fallback; URL-preserving company navigation; and quiz Why/Continue feedback. Empty Career sections and the redundant General preparation link were removed. Legacy dark styles affecting quiz headings and the Career board were corrected.

Local validation: typecheck, OpenAPI contract validation and production build passed. Existing tests passed 20 checks; two database isolation checks remain skipped without their dedicated disposable database. No new test suite was added. Browser-only fixtures verified empty, active and completed Home, saved selections across reload, course switching, filtered empty results, loading and failure states, continued catalog access during a workspace failure, quiz retry/explanation/Continue and draft reload. Real local Career navigation verified unique company cards, company detail reload and return to overview. Home, My learning and Browse each measure 1200px content width at a 1440px desktop viewport. Screenshots and receipts remain under private/lms-ui-review.

The state and save-flow fixtures intercepted workspace requests and did not write personal database records. These checks do not claim a new hosted persistence or account-isolation audit. Desktop only was requested. Hosted release status is recorded in the private release receipt after main/staging deployment.


## October 29 desktop audit and appearance slice

The owner supplied LeetCode study-plan, topic collection and split-editor screenshots, requested both themes, and asked Claude to inspect every desktop page for shared components, layout, duplicated headings and verbosity. Refero SuperHi (style b98edb8d-43a6-47e2-9adf-71ac4d584f47) contributes strong subject colors and readable sans typography. The owner screenshots control catalog density and workbench layout. Deems keeps its wordmark, character, login scenes and orange actions. No borrowed artwork or course content is used.

Captured 20 desktop screens in both themes at 1600 by 1000, with full-page copies for long screens. Claude Opus 5.5 reported inspecting all 40 viewports and 20 long captures. The original review remains private/desktop-design-audit-20261029/claude-review.md. The review is evidence of that captured revision, not approval of later changes. Final captures are in the after subfolder, which adds company detail and revealed Review states.

Implemented changes:

- Light, Dark and System selection shared by login and the workspace, with a local saved preference, first-paint theme and OS/cross-tab updates. CodeMirror follows the same choice. No account or workspace data is moved.
- Shared neutral, action, selection, status and progress-track roles. Legacy reading panels, tables, search frames, buttons and input surfaces use those roles. Removed the competing automatic study-night stylesheet. Company colors stay independent and logo SVGs use a light internal scheme for stable contrast.
- Locally hosted Manrope with its weight range and OFL license. Colored covers use real Lucide subject icons. A compact variant of the same LearningCard serves catalog rows and empty My learning suggestions. No duplicate module count or generic footer action on unsaved cards.
- Shared PageFrame, accessible PageHeader and CompanyCard. Tab-named pages retain an accessible H1 without repeating the visible tab. Coding has a wider frame with its header aligned to that frame. Course, path, company and problem titles remain visible because they identify the selected record.
- Review has one aligned topic/count toolbar and one reading width. New cards are distinct from reviews that are due. Review, Practice and Upcoming use one latest-review/count helper. Existing review records and scheduling are preserved.
- Coding has side-by-side problem and editor panes, Description/Solution/Notes/Coach panels, language selection and existing runner/history/draft behavior. Optional exercise reflection fields are grouped without removing their stored data or provenance.
- Home puts topics before company tracks and reduces the company shelf. My learning keeps saved learning distinct from clearly labeled starter suggestions. Prep pages use the selected theme and no redundant navigation footer. Quiz setup starts with its selectors rather than stacked generic headlines.

Validation: existing typecheck, OpenAPI contract validation and tests pass (24 passed, two database isolation checks skipped without their dedicated database). The local production build and healthy restart pass. Browser checks verify theme reload, OS mode changes, editor preservation across theme/panel changes and reference-language switching. Captures use actual local data without saving progress, reviews or application records. Desktop only was requested. Hosted release receipts record the deployed SHA and live check separately.

Further recommendations from the audit are retained as optional follow-up, not claimed implemented: a drawer for the question index, a single shared split-reader abstraction across all legacy reading surfaces, and a broader subject catalog. These do not block the scoped theme, density and repetition corrections.

Hosted follow-through: production and staging deployment workflows passed for b41de8a. Live desktop captures confirm the new typography, theme roles, compact Review controls and catalog layouts. The hosted company shelf exposed an orange-on-orange Crunchyroll mark; its shared card now renders the existing silhouette in white. The private gallery includes a browser-readable Claude report and hosted captures. Release receipts keep this final contrast correction and its deployment evidence separate from the earlier audit.

The hosted QA account also revealed an empty-state surface that retained its legacy white paint in dark mode. Shared BrandState surfaces and copy now use the same theme roles as populated panels. Applications distinguish a first-use empty list from filtered no-results and pass the loading state through to the shared component. No learner records are created to disguise an empty state.

Experience now has explicit loading, failed-load with Retry, and empty states instead of a blank hosted page and an unavailable resume link. The empty state offers the existing interview-skills practice route. Role-library empty copy distinguishes an unused library from a filtered result. These are presentation and read-flow changes; personal history is not seeded or inferred.

## October 29 navigation density correction

The owner identified four competing horizontal bands on Review. This supersedes the always-visible Practice section tabs from the earlier navigation slice. Preserve Deems colors, Manrope, saved appearance choice, brand assets, and existing route/draft behavior.

Reference lock: existing Deems controls and the SuperHi style remain the visual foundation. Brilliant screen a0cecb98-bb00-4223-8bfc-3133c89d07d6 contributes one global navigation row; Preply screen 8706c3f5-892f-4832-92d3-50f2a4c84b13 contributes focused question content with minimal surrounding controls. The owner's screenshot controls the density correction, not a new palette or branding direction.

| Decision | Source | Purpose |
| --- | --- | --- |
| Practice destinations live in a header dropdown | Owner screenshot; Brilliant global navigation | Remove the second horizontal navigation band while retaining all destinations |
| Review title and topic/card-set controls share the panel header | Owner screenshot; focused Preply question structure | Attach controls to the content they affect |
| Appearance lives inside the account menu | Existing Deems ThemeControl | Reduce persistent header controls without changing theme behavior |
| Quizzes and preparation pages expose one local title | Existing accessible PageHeader | Retain orientation after removing Practice tabs |

Native disclosure navigation keeps keyboard, outside-click, Escape/focus restoration, current-page marking and mutual exclusion with the account menu. The change does not alter review scheduling, save semantics, curriculum or authentication. Desktop visual and navigation checks and release evidence live in private/navigation-review-20261029.

## October 30 interactive question workspace plan

Status: local interactive prototype built for owner review on October 30. The owner approved prototyping after reviewing this plan. Production integration remains pending. This is the active next UI slice. It supersedes the October 29 Review panel as the target for active question sessions. The simplified navigation remains appropriate for browsing; a question in progress needs its own session workspace.

### Problem and evidence

The current Review surface is a 960px bordered panel inside a 1600px page. Its plain prompt, small textarea and Reveal action read like an administrative form, and most of the remaining viewport does no teaching work. Reducing navigation did not address the question experience itself. The active lesson quiz is a separate implementation, and coding uses an editor fixed at 400px high. Making the existing box wider would leave those interaction and content limitations in place.

Read-only local baseline captures on October 30 are in `private/qa-experience-plan-20261030`. No personal answers, enrollment, progress or database state were changed for planning.

Reference lock:

| Reference | Adopt | Keep out |
| --- | --- | --- |
| Owner-supplied LeetCode problem/editor screenshot, clipboard-xfRD47.png | Viewport workspace, prompt/examples beside the editor, contextual hints, accessible test-result area | Rankings, premium gates, unrelated community controls |
| Brilliant interactive dice question, Refero 8a65f04b-d2ed-4026-a047-731b83394306 | Concept-specific visual stimulus, clear question progression, explicit Check action | Invented XP, lives or claims of mastery |
| Quizlet visual question/feedback, Refero 44e6fc8c-52ef-4755-beda-159c51c7d60c | Image support, large answer targets, selected/correct/incorrect distinctions | Its narrow floating-card composition |
| Duolingo feedback screen, Refero bf9869f0-d5b9-4215-9e87-ed0992f4221e | Anchored result/action area and clear next action | Hearts, penalties and forced gamification |
| SuperHi style b98edb8d-43a6-47e2-9adf-71ac4d584f47 and existing Deems | Confident subject color, purposeful graphic composition, clear type hierarchy | Imported fonts, CTA colors, decorative shapes without teaching value |

Refero did not return a reliable LeetCode screen for this search. The owner's actual LeetCode screenshot is the coding-layout reference. The other quiz references are generally centered; the proposed wider composition is an intentional adaptation to the owner's brief, not a claim that every reference uses it.

Preserve Deems Manrope, wordmark, existing subject colors, orange primary actions, saved appearance behavior and approved brand assets. The owner removed the theme chooser; do not show one in the prototype. Existing saved Light/Dark/System handling remains compatible. Color will distinguish subject and interaction state, with icons and labels alongside it. Do not turn ordinary unanswered questions into warning banners.

### Recommended experience

Create a dedicated practice workspace that fills the browser viewport. It does not require the browser Fullscreen API. Offer browser fullscreen later only if useful; do not force it.

While a session is active, replace the global app header with one compact session header. It has Back/Exit, a short course or practice title, position and saved progress for a multi-question queue, and an overflow control for session options. A single-question preview has no progress bar or repeated 1 of 1 counter. Do not put an appearance chooser in this header. Restore the normal app header on exit. Do not stack global navigation, Practice tabs, breadcrumbs, a page heading and session controls above the question.

Move topic, Due/New/All and batch-size choices to the session entry/setup view. They are session configuration, not persistent controls above every question. Changing topic inside a session should require an explicit session change rather than silently replacing an unfinished answer. Preserve existing entry URLs and the route to the originating course or practice area.

Use a 60 to 64px session header, a content area that grows with the remaining viewport, and a 72 to 88px action/feedback area. At desktop widths, use about 24px outer gutters and a 16 to 24px pane gap. Keep prose around 60 to 75 characters per line even when the workspace is wide. The outer workspace fills the screen; text itself does not need to stretch across 1500px.

Default structure:

```text
Back   Course / topic            Question 3 of 10 + progress     Options
---------------------------------------------------------------------
Question and context             Answer workspace
Scenario / code / diagram        Choices, recall response, or editor
Examples and constraints         Local interaction and result states
Contextual hints on request      Test cases when applicable
---------------------------------------------------------------------
Feedback or saved status                          Check / Reveal / Next
```

The shared frame has three content-driven arrangements:

1. Knowledge checks: roughly 55% prompt/visual context and 45% answer area. Large answer tiles with letter/number cues, clear selection, and an explicit Check answer action. Short choices may use a two-column grid; long choices remain a vertical list.
2. Coding challenges: roughly 40% problem and 60% editor, with an adjustable split and sensible minimum pane widths. Prompt examples and constraints scroll independently from the editor. The editor fills available height. Tests/output open in a dock below it. The question index is a drawer rather than a permanent third column.
3. Recall review: the same full workspace with a concept/scenario stage and an optional response area. Reveal opens the explanation and worked example in context, followed by Again/Got it. Recall remains self-rated and is not presented as an automatically graded quiz. If a short question has no supporting material, use a spacious full-stage composition without an empty second pane or a large bordered error-like box.

### Rich content and hints

Extend question presentation beyond plain strings. Existing StudyCheck has a plain prompt/explanation, and Flashcard has plain question/answer/example strings. Neither currently supplies structured media or a hint ladder. Styling alone cannot provide those features honestly.

Add a bounded, Zod-validated shared presentation schema for optional context blocks: paragraphs, syntax-highlighted code, input/output examples, tables, images with alt text/captions, and small authored traces or diagrams. Add optional authored hints and explanation blocks to the relevant question definitions. Keep a text fallback so existing questions continue to work. Keep current question/check IDs and saved progress compatible; do not change answer meaning as a cosmetic enrichment.

Use a reusable QuestionBody renderer and targeted interaction components. Do not create a generic form builder or a new CMS. Course content remains checked-in and deterministic. Initial enrichment does not require a new database table or migration.

Media must help solve or understand the task. Coding can show indexed arrays, sample payloads, state transitions or an annotated code excerpt. AI questions can show a request/tool boundary or an output example. Management questions can use a clearly fictional conversation or decision scenario. Do not fill every screen with the same mascot, the login scenery, stock art or an unrelated background photograph.

Use semantic HTML/CSS for simple tables, arrays and traces, existing libraries where appropriate, and approved/generated assets for actual illustration. Use Lucide for functional icons. Do not hand-draw replacement SVG art. Public teaching media must not contain private career records or personal documents. Avoid arbitrary HTML and unapproved remote embeds. No autoplay media.

Hints are optional and progressively disclosed: a concept nudge, an approach, then an edge-case prompt. Do not expose the final solution or coding hidden cases through the hint system. Show hint use honestly, but do not invent penalties or mastery adjustments. Hint text is authored once and reused. No LLM request is needed to render a question, open a hint, grade fixed-choice checks or calculate progress.

### Feedback, progress and recovery

- Unanswered: one clear primary action; Check answer stays disabled until an answer is selected. Optional recall input is visibly optional.
- Incorrect: show a specific local explanation, preserve the answer, and offer Retry or Reveal as appropriate. Avoid replacing the whole workspace with red error styling.
- Correct: show confirmation, a useful explanation and a clear Continue action. Do not advance automatically.
- Revealed: distinguish an explanation that was opened from an answer solved correctly. Preserve current completion semantics.
- Coding: preserve examples versus full-suite runs, actual runner status, stale results after edits/language changes, timeout/unavailable states and saved run history.
- Save failure: keep the question, answer/code and current result visible. Retry the existing idempotent save operation. Advance only after a required save is confirmed.
- Session end: show actual reviewed/correct/revealed counts and a useful next step, without invented XP, trophies, streaks or skill scores.
- Loading and media failure: reserve stable layout, show a small loader or usable text fallback, and retain an exit path. A missing image must not block answering.

Define session position separately from completion. Recall should use a finite queue selected at entry, for example ten new cards or the due batch, instead of wrapping endlessly while displaying a misleading completion bar. An inspected or skipped question is not a completed question. Empty Due sessions should offer new cards or another practice mode from setup.

Keep FSRS scheduling unchanged. Preserve the existing distinction between review saves, quiz draft/Continue and explicit lesson-completion saves. Use account-scoped, versioned drafts for any new session-resume state; do not write incomplete attempts into completion records or reschedule when merely reopening an answer. Leaving and reloading must retain the current response where supported, and the implementation should add the missing recall-draft recovery without replacing existing course/editor draft keys.

Keyboard behavior: normal form navigation first; optional number keys can choose an answer when focus is not in an input/editor. Enter checks or continues only when valid and focus context permits. Do not hijack editor or textarea keys. Use visible focus, readable feedback announcements and reduced-motion support.

### Shared implementation boundaries

Proposed reusable pieces:

- PracticeSessionLayout: owns the viewport, session header, pane sizing and bottom action region.
- SessionProgress: shows position and genuinely completed work without duplicating labels.
- QuestionBody: renders validated text, code and teaching media.
- AnswerChoices and RecallResponse: distinct response interactions.
- HintPanel and ExplanationPanel: contextual support inside the session, not another app-wide navigation strip.
- SessionActionBar: consistent primary action and feedback region.
- Existing CodeEditor/CodingWorkbench: retained runner and history logic, adapted to flex with the session height instead of a fixed 400px editor.

Integration sites are `workspace-chrome.tsx`, `page.tsx`, `study-workspace.tsx`, `algorithm-lab.tsx`, `coding-workbench.tsx` and `code-editor.tsx`. Content work belongs in study/learning contracts, the Flashcard type and the existing question/course data. Keep grading and persistence in the existing mode-specific handlers. Do not add a universal scoring engine or duplicate the same content in a separate presentation registry without a clear need.

### Implementation order and review gates

1. Produce a browser-viewable desktop prototype of the session layout using real representative content: a code/example knowledge check, a recall question with contextual help, and Two Sum in the existing editor. Show light and dark. This prototype is the first design review checkpoint; do not roll it out across every screen before inspecting it.
2. Build the shared session frame and optional content schema. Integrate Review first, preserving existing IDs, scheduling, failed-save handling and drafts. Enrich a small representative set of questions rather than pretending every legacy item already has rich media.
3. Apply the same structure to lesson knowledge checks and their feedback/finish states. Keep reading lessons and the course catalog coherent without turning them into coding-editor screens.
4. Adapt coding to the same session header/progress language, resizable workspace and height-aware editor. Reuse the existing JavaScript/Python runner and saved-run APIs. Add no new infrastructure for this UI work.
5. Capture and compare desktop screenshots, fix the visual and interaction issues, then deploy the approved implementation to staging and production and verify the actual release separately.

### Acceptance and verification

The active question should feel like the main workspace at 1440 × 900, 1600 × 1000 and 1920 × 1080. There should be no small alert-like card floating in a mostly empty application page, no return to multiple navigation bands, no decorative media placeholder, and no question or primary action hidden behind the footer. Long prompts, long choices and code must scroll without horizontal page overflow. Large monitors get more useful workspace, not arbitrarily stretched lines of prose.

Capture light and dark versions of: media-rich question, text-only fallback, selected choice, hint opened, incorrect retry, correct explanation, revealed recall, coded example/test result, save failure, loading, session completion and empty Due setup. Compare against the locked references and the selected prototype. Desktop remains the owner's current testing focus.

Functionally verify answer selection and explicit submission, progressive hints, no premature explanation, retry, contextual return/exit, draft restore after navigation/reload, no duplicate save, real completion counts, coding draft/result/history preservation and appearance persistence. Use browser-only failure fixtures and disposable QA workspaces for real persistence; never seed personal success to make a screenshot richer.

Run the existing typecheck, contract validation, appropriate existing tests and production build when code changes. Do not create a new unit-test suite or LLM evaluation project for this design pass. No code tests or deployment are needed merely to review this plan.

### Prototype checkpoint

Source: `prototypes/practice`, served by `node scripts/preview/practice.mjs` at http://127.0.0.1:3046. Direct modes use `?mode=quiz`, `?mode=recall` and `?mode=coding`. This is a separate local React preview, outside application routes. It reuses the real Deems font, theme provider/tokens, Lucide and CodeMirror. No application APIs, credentials or database are connected. Coding results and failed saves are explicitly labeled fixtures. JavaScript and Python have separate temporary editor buffers.

The prototype includes input-array/code questions, large answer choices, specific incorrect/correct feedback, progressive hints, scenario recall, revealed explanations and notes, a resizable coding split, a problem drawer, a sample result dock and a one-question completion view. The active workspace has one header and one action region. Existing browsing navigation has not changed.

Desktop evidence and the screenshot gallery are in `private/practice-prototype-20261030`. Captures cover 1440 × 900, 1600 × 1000 and 1920 × 1080, both themes, plus interaction states. This checkpoint is for visual review before connecting the existing persistence and runner handlers. It is not deployed to staging or production.


### Approved Claude question-first revision

The owner approved direction A from the October 30 Claude design review. This supersedes the earlier entry-page experiments and their opened-format progress bars.

Implemented locally: one dark Two Sum stage with the approved laptop mascot and indexed array; two smaller question covers containing the actual code and research scenario; a compact header search that does nothing when empty; subject blue/green carried through into the active sessions; no theme chooser, concept panel, duplicate entry controls, generic format cards or opened counters. Static arrays and panels are flat. Only pressable controls get elevation, and keyboard focus has a separate high-contrast ring without movement. The entry has no explanatory footer or breadcrumb.

Quiz completion reports actual attempts and hints. Recall records Got it or Revisit, while coding reports an edited draft as Not run. These are temporary activity facts, not saved learning progress. One-question previews have no progress bars. The featured Two Sum item is fixed in this limited prototype; selecting real due or unfinished work remains an integration task once the existing scheduling and saved-attempt handlers are connected.

Validation covers settled desktop views at 1440 × 900, 1600 × 1000 and 1920 × 1080, Light and Dark, plus hover, keyboard focus, reduced motion, empty/nonempty search, incorrect retry, real activity facts, recall notes/Revisit and per-language editor buffers. Production integration and deployment remain pending owner review of this local prototype.

### Owner correction: clear practice choices and a study scene

The owner rejected the rendered question-first entry above. Code excerpts inside large cover buttons were hard to distinguish from answer choices, and the cream mascot shelf looked like an isolated icon. This correction supersedes that entry layout. It does not undo the full viewport sessions or their existing interaction semantics.

The local entry now uses one compact welcome area with new illustrated Presidio study artwork. The character sits at a real study table with a notebook and laptop. The reference is the actual login artwork, the supplied library scene and approved rounded character, with a new composition instead of the same login image. The wordmark remains mascotless.

Below it, three aligned cards explicitly distinguish Write code, Answer a quiz and Explain a concept. Each contains a short exercise summary, response format and its own Start button. Cards, code and answer options are no longer mixed together. No code appears on the entry. The quiz labels its left code sample Read only and asks for one selected answer in the response pane.

Only controls have hover and pressed movement. Keyboard focus is visible, reduced motion removes movement, and no visit creates a progress claim. Saved appearance behavior remains without a chooser. Desktop visual checks compare the new entry to the owner-supplied welcome/shortcut structure and login scene treatment. This remains a local prototype awaiting owner review, not a hosted deployment.

### Owner correction: distinct café artwork and a useful next step

The owner rejected the home-study artwork as too similar to login and requested a genuinely different SF setting. The current prototype uses a new café scene generated from the approved reading-pose reference alone. It shows Deems reading at a café table with an espresso bar, booth seating and foggy SF street. The old study scene is retained as rejected evidence and is no longer used on the page.

Start controls now use the Deems orange action surface, dark 18px text and 56px height. They are visually distinct from the colored heading bands. The hero uses actual catalog content instead of Time to practice. It shows a deterministic suggested course when there is no temporary activity, Continue for an unfinished course or the last unfinished practice, and the next lesson plus actual completed-lesson progress after an explicit successful check. A small course preview reuses authored course/guide/check data so the actions and resume states can be reviewed interactively.

This is still local prototype state for the current visit. It does not restore hosted account history. Integration should reuse LearningHome's existing current-route, active-course and next-lesson selectors, the account-scoped draft store and existing completion handlers. Do not create another durable course-progress system from prototype state. Desktop screenshots cover first visit, resume, real check completion and next suggestion in both saved appearances. Hosted deployment is unchanged.

## Approved integration into latest main

Base: origin/main at 7a2aa11, including the new Python/JavaScript crash-course content. The owner approved integrating the café/next-step prototype into main. Work is isolated in codex/lms-workspace-integration so the earlier prototype and unknown edits remain intact.

1. Share the approved café next-learning hero and contrasting practice controls across the real home and practice entry. Use existing account-scoped learning selections, validated completion records and draft routes. Keep course, career-path and company learning sections.
2. Add a shared full-viewport session frame. Integrate existing lesson checks and recall handlers into it, preserving save/retry behavior, IDs and FSRS scheduling. Add bounded account-scoped recall drafts and finite review batches. Remove the visible appearance chooser while preserving saved theme resolution.
3. Adapt the real coding workbench to the viewport frame, retaining its server runner, saved runs, per-language drafts and stale-result detection. No fixture results or preview state enter the production flow.
4. Verify in a separate candidate app/database, inspect settled desktop screenshots against the approved prototype, run typecheck, contracts, existing tests and Node 24 production build. Preserve the owner's pause on mobile review. Re-fetch main before a normal fast-forward merge/push; never force-push or copy personal data. Verify the deployment triggered by the main push separately from local verification.

Affected modules: learning-home, practice-hub, workspace-chrome, algorithm-lab, code-editor, coding-workbench, study-workspace; new reusable learning-entry and question-session components. No database migrations or authentication changes are planned.

### Integration implementation and evidence

Implemented against main through aff75c3, preserving its public interview-notes companion and all new course content. Home uses the shared café hero and real next-learning selectors. Home and Practice reuse the same readable action cards. Existing course reading/checks, recall and coding now share a full-viewport session frame. Recall has finite 5/10/20-card batches, validated workspace-scoped browser drafts, explicit rating saves and retained answers after failure. The actual coding runner/history APIs, per-language draft keys, grading, completion records and FSRS handlers remain in use. The appearance chooser is removed while saved theme behavior remains.

Local verification uses a separate PostgreSQL container and candidate builds on loopback. Course grading, failed-save retry, durable lesson completion and next-lesson selection were exercised through the real APIs. Recall was checked across exit/reload, save failure and completion of a five-card batch. JavaScript/Python buffers were checked across language changes, exit/reentry and reload. No personal database was copied. The isolated runner was intentionally unconfigured; no simulated passing result was promoted to the application.

Settled production-build screenshots cover Home, course checks, recall and coding at 1440 × 900, 1600 × 1000 and 1920 × 1080, in both saved appearances. Capture waits include fonts, image decoding, finite animations and compositor frames after resizing. This avoids stale fixed-header tiles in headless Chromium. Mobile checks remain paused by the owner. Evidence is private/integration-20261030 in the isolated integration checkout. Typecheck, OpenAPI validation, the existing tests including disposable-database isolation and the Node 24 production build pass. GitHub deployment and authenticated production observations are recorded separately from these local results.
