# Deems dashboard and navigation implementation

Owner approved implementation and deployment on October 28, 2026, following the Opus 5.5 review and expanded desktop reference collection. This is the active UI plan for this slice and supplements docs/lms-learning-plan.md.

## Reference lock

Keep the light Deems canvas, wordmark-only header, cream character with minimal Presidio context, compact square overview cards and visible company branding. Codecademy owns the separation of discovery, saved learning and ordered curriculum. Brilliant contributes the first-steps checklist, contextual resume with course selectors, ordered course tiles, and clear answer feedback with Why and Continue. GreatFrontEnd contributes distinct practice formats, company plans and contextual detail progress. Clearful contributes restrained empty states. Do not copy XP, leagues, certificates, marketing promotions or unsupported streaks.

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
