# Deems learning workspace

Approved for implementation by the owner on October 28, 2026 after a live Safari review of Codecademy's Python catalog, machine-learning path, authenticated My learning, dashboard and enrolled-course syllabus.

## Reference lock

Primary: Codecademy's separation of discovery, enrolled learning, and ordered curriculum. Preserve the clear activity types, strong ink borders, colored type bands and contextual resume actions. Deems retains its wordmark-only header, original weather-aware illustrated scene, light canvas and orange action identity. Brilliant contributes compact course progression; Gumroad style ac783c6e-6c2b-4663-87b3-bcd12d463b0a contributes outlined graphic surfaces only.

| Decision | Source | Role |
| --- | --- | --- |
| Home, My learning, Browse | Authenticated Codecademy and owner approval | Saved learning and catalog discovery have separate destinations. |
| Path > Course > Module > Activity | Codecademy path and enrolled syllabus | Reuse course IDs within ordered paths. Existing lesson records become module groups containing reading and checks. |
| Square overview tiles; ordered detail rows | Owner preference and Codecademy syllabus | Tiles browse content. Rows explain sequence inside curriculum. |
| Bright type bands with ink outlines | Codecademy catalog; Gumroad outline treatment | Path and course identity have consistent roles; orange remains Deems action emphasis. |
| Contextual resume and real progress | Authenticated My learning | Roll up saved module checks and explicit saved selections. No invented enrollment, time estimate, readiness or certificate. |
| Practice deliverables | Existing Deems exercises | Link real saved practice tools and show actual sessions. Execution is not implied. |

## Data and behavior

Use existing course, guide, exercise and progress IDs. Path membership is a versioned, validated catalog association. Account-scoped learning selections use bounded, versioned settings keyed per item, not a shared list that could overwrite another selection. Removing a selection preserves completed work and drafts. Existing course progress remains visible unless the user explicitly removes that course from My learning. Starting a module records the selected course and current module after a successful save. No database schema migration or reseeding is needed.

Keep all navigation, filtering, completion rollups and resume selection deterministic. No model calls are required. Team management and interview skills remain peer topic destinations backed by existing material. Do not invent an empty course just to fill a category.

## Execution and acceptance

1. Shared catalog contracts, selection validation and progress/resume helpers.
2. Reusable learning cards, My learning, searchable Browse, path and course details.
3. Home, header/footer and stronger colors.
4. Production build and contract checks, real browser saves/reload/removal and failure recovery using exact disposable selections, settled desktop/mobile screenshots and reference comparison.
5. Deploy main/staging and read back successful release status and hosted account gates.

No new unit-test suite or evaluation project. Existing deployment checks stay enabled. Keep auth, signup controls, crawler policy, account separation and private records intact.
