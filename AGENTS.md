# Deems

Career preparation and learning workspace. Production: https://deems.app. Hosted staging: https://deems.dev. Local: http://deems.local.

## Working rules

- Preserve data and unknown edits. Never commit private/, backups/, credentials, resumes, recruiter messages, or personal seed data.
- Use plain words. No em dashes.
- PostgreSQL is the durable store. Keep existing migration checksums and record IDs stable.
- Run typecheck, contract validation, meaningful tests and production build for code changes.
- After UI changes, inspect settled real-page desktop and mobile screenshots. Use real icon packs.
- No shell polling loops. Use bounded commands.
- Hosted access remains private. Enable Vercel Authentication for All Deployments before setting DEEMS_HOSTED_READY=true.
- Separate production and staging databases, keys and Vercel projects. Never copy the local personal database to either automatically.
- Research worker requires a persistent container; do not run its browser in a Vercel function.
- Native identifier is deems; intended Apple bundle ID is app.deems. No native app is implemented yet.

See docs/deployment.md for operations. Historical local instructions remain in private/legacy-source/AGENTS.md.
