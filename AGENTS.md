# Deems

Career preparation and learning workspace. Production: https://deems.app. Hosted staging: https://deems.dev. Local: http://deems.local.

## Working rules

- Preserve data and unknown edits. Never commit private/, backups/, credentials, resumes, recruiter messages, or personal seed data.
- Use plain words. No em dashes.
- PostgreSQL is the durable store. Keep existing migration checksums and record IDs stable.
- Run typecheck, contract validation, meaningful tests and production build for code changes.
- After UI changes, inspect settled real-page desktop and mobile screenshots. Use real icon packs.
- No shell polling loops. Use bounded commands.
- Hosted workspace data requires verified account authentication. Both hosted environments use Deems login, without Vercel or shared-password protection. Signup defaults closed behind DEEMS_SIGNUP_ENABLED and Cognito AdminCreateUserOnly. Keep account isolation and crawler exclusions intact.
- Separate production and staging databases, keys and Vercel projects. Never copy the local personal database to either automatically.
- Research worker requires a persistent container; do not run its browser in a Vercel function.
- Native identifier is deems; intended Apple bundle ID is app.deems. No native app is implemented yet.

See docs/deployment.md for operations. Historical local instructions remain in private/legacy-source/AGENTS.md.

Brand direction: use the owner-supplied Deems archive assets and the reference lock in docs/deems-brand-integration.md. Provided mascot/wordmark SVGs are allowed; use Lucide for functional icons and do not draw replacement SVG art. Motion must honor reduced-motion preferences.

Current product direction: personal LMS with a light default. Home is the welcome learning dashboard; coding, AI, frameworks, team management and interview skills are peer areas. Career pipelines are secondary tools. This supersedes earlier dark-theme and interview-first requirements.
