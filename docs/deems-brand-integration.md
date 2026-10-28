# Deems brand integration

The owner supplied the Deems brand archive on October 28, 2026 and requested applying it to the interface. The approved-reference illustration board is the primary direction. The SVG redraws and sample screens are starter assets; mock integrations and learning scores are not product requirements.

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
