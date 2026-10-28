# Role-linked practice evidence

Start an exercise from a role plan to keep the exact role and step. Existing browser drafts keep their original storage keys and work. If a draft has a different or unknown origin, explicitly choose whether to link it to the selected step. Direct practice can remain unlinked.

Save an immutable attempt with the prompt/rubric snapshot, code or diagram, notes, self-report, assistance, limitations and a next action. Static hints and solution views are separate from user-reported AI or other help. No submitted code is executed. No completion or skill score is inferred.

After saving, choose a requirement and explicitly attach the attempt. The requirement belongs to the originating role. You can change or remove the attachment later. These changes retain revision history and never change the role's stage, plan progress, readiness assessment or FSRS schedule. Return to the exact originating step or open the saved attempt from the Requirements tab.

## Contracts and preservation

- Shared input/output validation: `src/contracts/practice.ts`.
- `POST /api/practice` accepts `save` and `attach` commands with expected revision, producer and retry key.
- Identical retries return the original response. Changed input under a used key, reused session IDs and stale attachment edits return conflict errors.
- Saves commit the session, immutable attempt metadata and retry receipt together. Attachment edits commit current state, transition history and receipt together.
- The additive `practice-v5` migration creates companion attempt, attachment-history and receipt tables. It does not backfill old sessions or rewrite old migration checksums.
- Legacy sessions keep their fields and IDs. Missing old origin and assistance stay unknown.
- Workspace reads add `practiceAttempts`. Export version 7 includes snapshots, evidence revisions and receipts.
- Roll back application code without deleting the new tables. Back up and verify an isolated restore before schema deployment.

## Verification

Run `npm run typecheck`, `npm run check:contracts`, `npm test`, and a production build. The focused service verifier is `scripts/verify/practice-evidence.ts`; it refuses an unexpected database and writes only explicitly marked fixtures in its named disposable database. Restore a fresh isolated copy before using the verifier. Never point it at a personal or hosted database.

The headless browser verifier is `scripts/verify/practice-browser.mjs`. It checks failed-save retention, stable retry identity, persisted origin, old drafts, explicit requirement links, return navigation and unrelated review/session preservation. Its synthetic records belong only in a disposable candidate environment. Browser screenshots and detailed command receipts remain private.

Cognito sign-in is independent of practice persistence. Mocked login UI checks and synthetic JWT verification are not evidence of a successful live Cognito sign-in. See `docs/deployment.md` for required hosted acceptance.
