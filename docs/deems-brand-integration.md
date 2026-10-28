# Deems brand integration

The owner supplied the Deems brand archive on October 28, 2026 and requested applying it to the interface. The approved-reference illustration board is the primary direction. The SVG redraws and sample screens are starter assets; mock integrations and learning scores are not product requirements.

## Current learning direction

The owner reviewed Codecademy's live [Python catalog](https://www.codecademy.com/catalog/language/python), [machine-learning path](https://www.codecademy.com/learn/paths/machine-learning-engineer), authenticated [My learning](https://www.codecademy.com/learn?page=learning), dashboard and enrolled-course syllabus, then approved applying the whole review. [Learning implementation plan](lms-learning-plan.md) records the reference lock and data boundaries.

Home, My learning and Browse now have separate jobs. My learning contains explicitly saved courses/paths and existing completed-module work, with an explicit removal state that preserves history. Browse uses reusable square tiles, type bands, search and filters. Two ordered paths reuse the four existing courses; each existing lesson record groups reading and knowledge checks as a module, with real practice projects linked from the course syllabus. Resume is stored per course. Counts and completion rollups come from saved records and do not require model calls.

The visual direction keeps the light Deems canvas and original illustrated scene, while using stronger ink borders, blue path bands, lime course bands, brighter topic fills and orange actions. Shared shadcn learning variants and light tokens prevent the former dark controls from appearing on light pages. Curriculum appears before supporting outcomes on mobile, and changing course/path moves focus and scroll to its heading. The header is wordmark-only; career tools remain secondary.

Learning selections use the existing account-scoped PostgreSQL settings store, a versioned Zod/TypeScript contract and an OpenAPI model. Keys are per item, and server validation checks catalog membership and resume details. No schema migration, reseeding, proficiency scoring or fabricated enrollment is involved. Existing progress, FSRS records, drafts, authentication, signup controls and crawler exclusions remain intact.

## Current login and logo direction

The owner rejected a mascot in the logo alongside a separate mascot illustration. Shared headers now use only the supplied outlined wordmark. The character belongs in a relevant scene or state, not in the header lockup. The workspace remains a light personal LMS.

The latest owner-supplied Base44 screenshot locks the login composition: a wordmark in the upper-left corner, a centered form in the left half, and a large rounded image occupying the right half. The stronger color and depth belong in the image. Earlier dark-shell and boxed-pose directions below are historical and do not govern this login surface.

| Decision | Reference | Role |
| --- | --- | --- |
| Two equal columns, centered form, large inset image | Owner Base44 screenshot | Primary layout target |
| Full illustrated environment in the image panel | [Refero Playbook](https://refero.design/pages/86e068a5-d83b-4e81-872c-af135556d0df) | Media scale and framing, not its colors or social login |
| Contrast and depth within the scene | [Refero SAVEE](https://refero.design/pages/de6f39d3-68f8-4848-b874-937c4df1a244), Tracky style ccf22ee4-0891-4773-9420-5d2a29f7ae8e | Rich image shadows and legible ink form text |
| Wordmark without mascot | Owner correction and archive wordmark | Header identity only |
| Cream character in a complete learning studio | Archive character and owner request for relevant scenes | Generated decorative art, not product evidence |

`public/brand/presidio-study-illustrated.webp` is an original generated scene based on the supplied Deems character. At the owner's request, it replaces the elaborate studio with a modest San Francisco apartment: a simple desk, ordinary rectangular window, books and a radiator, with an illustrated Presidio and Golden Gate Bridge view. It contains no logo, baked-in text, or sample UI. The image is 1024 by 1536. The owner requested an animated illustration style: outlined shapes, flat color blocks, simplified furniture and graphic foliage replace realistic textures and lighting. Live copy stays in HTML. Mobile uses a compact scene above the form, with the wordmark over the image. Authentication, signup flags, account separation, and crawler exclusions are unchanged.

## Dashboard and workspace chrome

The dashboard extends the approved login art direction rather than introducing another mascot or logo. The shared `SceneArt` component supplies the same saved weather/time artwork to the login and a compact welcome panel. The header keeps the wordmark only. No new image generation is needed for the dashboard.

| Decision | Reference | Application |
| --- | --- | --- |
| Clear route back into learning | [Brilliant dashboard](https://refero.design/pages/cf3d5290-97eb-4584-b4c5-3fbba946e16d) | Real course cards, saved lesson resume, completion bars only for actual saved progress. No invented streaks or readiness. |
| Topic cards and compact supporting panels | Owner Clearful library screenshot and [Clearful welcome](https://refero.design/screens/5f9d0b52-17bb-410d-a6a8-9948be9ded38) | Five peer learning areas, quiet activity and practice panels. Preserve Deems colors rather than the reference blue or dark canvas. |
| Warm work surface and illustration role | Refero PostHog style 13bc10c0-3cf9-4feb-8bf8-bfdd123931fc and approved Deems login | Warm light canvas, teal text and actions, original illustration in one welcome panel; functional Lucide icons elsewhere. |

The header separates learning navigation from account actions. Account and library menus close on outside click and Escape. The footer links to existing courses, practice, reference and export actions. It adds no placeholder support, legal, status or social destinations. Focused lessons hide the workspace header/footer.

Course buttons open the exact selected course, and the welcome action resumes a valid saved lesson. Explicit catalog navigation clears only the current course route, preserving lesson and quiz drafts and saved progress. An in-memory launch also works when browser storage is unavailable. Activity shows saved lessons and practice only. Loading and unavailable states never appear as a new empty learning history.

## Weather and time scenes

The login artwork has 12 saved variants in `public/brand/scenes/`: dawn, day, dusk and night, each with clear, cloudy/foggy and rainy conditions. The approved daytime illustration is the clear-day anchor; 11 matching variants preserve the room, character and camera. All are 1024 by 1536 WebP images, roughly 115 to 155 KB each. The complete set is about 1.66 MB, but a visit loads only the initial and selected scene.

`SceneArt` selects assets with deterministic rules, with no LLM calls. It uses San Francisco weather and Pacific time, regardless of the visitor's location. It never requests browser geolocation. Current weather model data, sunrise and sunset come from [Open-Meteo](https://open-meteo.com/en/docs), via the public, fixed-location, read-only `/api/scene-weather` endpoint. Other account and workspace routes remain gated. The response has shared Zod/TypeScript and OpenAPI contracts.

The upstream fetch is cached for 15 minutes and has a 3.5-second timeout. The client refreshes weather every 15 minutes while visible and checks the clock each minute. Dawn spans 45 minutes before sunrise to 75 minutes after; dusk spans 75 minutes before sunset to 45 minutes after. Cloudy and fog codes share the cloudy scene, and precipitation codes use the rain scene. The visible condition label retains the provider's actual condition, including uncommon snow or thunderstorms. Weather data older than 90 minutes or for a different local day is not used. Without weather, Pacific clock hours select a clear time-of-day illustration and no weather condition is claimed.

Scene changes preload the new image and crossfade briefly. Reduced-motion preferences disable the fade. An image load failure keeps the previous valid image. A small caption identifies San Francisco, the time period and available weather, with an Open-Meteo attribution link. The illustration is representative, not a live camera or exact solar-position simulation.

Review a specific variant with `/login?scene=night-rain`, substituting any combination of `dawn`, `day`, `dusk`, `night` and `clear`, `cloudy`, `rain`. Preview labels are explicit and previews do not fetch weather. The default login always selects automatically.

## Earlier reference lock

| Decision | Source | Application |
| --- | --- | --- |
| Ink navy, cream mascot, orange accents | Archive approved-reference and tokens | Navy shell, orange actions with ink text, cream illustration. Company brand colors remain independent. |
| Mascot and outlined wordmark | Archive brand and mascot assets | Use supplied vetted files, no new icon drawings. Lucide remains the functional icon pack. |
| Contained illustration with functional UI | Refero PostHog style 13bc10c0-3cf9-4feb-8bf8-bfdd123931fc | Mascot for distinct states; retain compact task controls and readable content. Do not import its colors or font. |
| Clear navy hierarchy and restrained elevation | Refero Tracky style ccf22ee4-0891-4773-9420-5d2a29f7ae8e | Border and surface hierarchy, not its hero, font or CTA palette. |
| Centered labeled loading | Refero Duolingo screen 4658f2f2-413f-436d-b15e-8c0e1156d49b | One mascot and accurate loading label; no fake progress or streaks. |
| Calm short motion | Archive ANIMATION-SPECS and Refero motion craft | Animate only pending states and direct interactions, static reduced-motion fallback. |

## Boundaries

Preserve account gates, closed signup, crawler exclusions, workspace separation and saved records. No schema changes. No sample integrations or fictitious readiness scores. Reuse shared states for loading, error, empty and confirmed success. Do not put animated mascots throughout reading screens.

## Verification

Run typecheck, contracts, meaningful existing tests and production build. Inspect settled desktop and 390px mobile screenshots of real pages; inspect forced pending/error and reduced-motion states separately from normal successful runtime. Keep personal screenshots local.

## Combined workspace and learning implementation

Clearful supplies the calm card and activity hierarchy, Brilliant supplies course progression and quiz interaction, and the owner-supplied Base44 reference supplies the desktop split-auth composition. The current light canvas and illustrated scene replace the earlier dark workspace direction. Course tiles use topic colors and Lucide icons. Company cards retain original brand fills and single-click navigation.

The catalog removes stacked introductory panels, course details use short lesson rows, and quiz answer states remain deterministic. Completion requires an explicit successful save; a failed save retains its draft. Successful completion clears both course and quiz drafts for that lesson so an old mode cannot override the saved result. Workspace loading uses an idle mascot with a short reveal delay and a bounded session request.

Validation includes typecheck, OpenAPI, existing tests, a Node24 Docker production build, settled desktop/mobile screenshots, answer selection and feedback, same-tab reload, and a browser-injected 503 proving failed-save recovery without writing personal progress. Detailed screenshots and agent evidence remain private.
