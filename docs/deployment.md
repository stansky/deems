# Deems deployment

## Environments

| Environment | Host | Vercel project | Data |
| --- | --- | --- | --- |
| Production | deems.app | deems | Separate managed PostgreSQL |
| Staging | deems.dev | deems-staging | Separate managed PostgreSQL |
| Local | deems.local | Docker Compose deems | Existing local PostgreSQL volume |

Use Cloudflare for authoritative DNS if the domains are on Cloudflare. Add the records Vercel requests, DNS-only, without changing unrelated records. Vercel provides HTTPS. No domain purchase or paid plan upgrade is automatic.

## Private hosted setup

1. Create or link each Vercel project to stansky/deems, with Next.js and Node 24.
2. Enable Vercel Authentication with All Deployments for each project. Verify an unauthenticated request is denied, including custom domains.
3. Attach a fresh PostgreSQL database per environment. Set DATABASE_URL in the corresponding project. Never upload a local backup or personal seed files.
4. Add server-only DEEMS_OPENAI_KEY and OPENAI_PROJECT_ID when coaching is needed. Keys must belong to the chosen project. Basic reading/saves do not require AI credentials.
5. Add the custom domain and verify DNS and HTTPS.
6. Set DEEMS_HOSTED_READY=true only once authentication and storage are verified. Without this flag, every app/API request returns 503 before accessing data. This flag is a setup guard, not authentication.

## GitHub pipeline

Check Deems runs typecheck, OpenAPI validation, tests and a production build. Deploy Deems is a manual workflow with staging/production selection. Production requires main. Both environments run checks before a pinned Vercel CLI build/deploy. Vercel Git builds run the same typecheck, contracts and tests before the build. Connect main as the deems production branch, and staging as the deems-staging production branch. The manual workflow is an optional CLI deployment path requiring its environment credentials.

Configure GitHub environments staging and production. Each needs VERCEL_ORG_ID and VERCEL_PROJECT_ID as environment variables and VERCEL_TOKEN as an environment secret. The staging environment points to deems-staging, whose production domain is deems.dev. The production environment points to deems, whose production domain is deems.app. This provides separate database and secret scopes without depending on a paid custom-environment feature.

## Local continuity

The directory and Compose project are named deems. The existing `interview_database` Docker volume and its database/user identifiers remain unchanged to preserve saved records. Existing migration IDs and browser draft keys also remain stable. The old interview.local address remains a Caddy alias; its existing Bonjour registration can continue during transition. The old workspace path may remain a symlink for active sessions.

For an existing installation: `python3 scripts/local.py domain-install`, then `docker compose up -d --wait --wait-timeout 90`. For a new installation, explicitly create the external `interview_database` volume first or override its name in Compose. Compose credentials are local development defaults only.

Back up with `python3 scripts/local.py backup`. Do not run down -v or replace the database as part of renaming. Local keys support the former INTERVIEW_LOCAL variables as a compatibility fallback.

## Hosting limits

The headless research worker needs a persistent container and is not deployed by Vercel. Keep research disabled operationally until a separately hosted worker is configured against the appropriate database. Local file-based resume access returns 404 on Vercel. Native apps and Apple App Store registrations are not included in this web pipeline.

References: [Vercel private production protection](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [custom domains](https://vercel.com/docs/domains/set-up-custom-domain).
