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
