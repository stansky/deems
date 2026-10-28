# Deems brand integration

The owner supplied the Deems brand archive on October 28, 2026 and requested applying it to the interface. The approved-reference illustration board is the primary direction. The SVG redraws and sample screens are starter assets; mock integrations and learning scores are not product requirements.

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

## Reference lock

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

Clearful supplies the calm card and activity hierarchy, Brilliant supplies course progression and quiz interaction, and the owner-supplied Base44 reference supplies the desktop split-auth composition. Deems keeps its dark navy canvas, orange action and supplied mascot. Course tiles use topic colors and Lucide icons. Company cards retain original brand fills and single-click navigation.

The catalog removes stacked introductory panels, course details use short lesson rows, and quiz answer states remain deterministic. Completion requires an explicit successful save; a failed save retains its draft. Successful completion clears both course and quiz drafts for that lesson so an old mode cannot override the saved result. Workspace loading uses an idle mascot with a short reveal delay and a bounded session request.

Validation includes typecheck, OpenAPI, existing tests, a Node24 Docker production build, settled desktop/mobile screenshots, answer selection and feedback, same-tab reload, and a browser-injected 503 proving failed-save recovery without writing personal progress. Detailed screenshots and agent evidence remain private.
