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
6. Configure and verify the Cognito account and workspace settings below.
7. Set DEEMS_HOSTED_READY=true only once authentication and storage are verified. Without this flag, every app/API request returns 503 before accessing data. This flag is a setup guard, not authentication.

## GitHub pipeline

Check Deems runs typecheck, OpenAPI validation, tests and a production build. Deploy Deems runs automatically for main and staging pushes and also supports manual environment selection. Production requires main. Both environments run checks before a pinned Vercel CLI build/deploy. Vercel Git builds run the same typecheck, contracts and tests before the build. Connect main as the deems production branch, and staging as the deems-staging production branch. The GitHub deployment workflow requires its environment credentials. Its project-scoped deployment tokens expire after 90 days and must be replaced before expiry.

Configure GitHub environments staging and production. Each needs VERCEL_ORG_ID and VERCEL_PROJECT_ID as environment variables and VERCEL_TOKEN as an environment secret. The staging environment points to deems-staging, whose production domain is deems.dev. The production environment points to deems, whose production domain is deems.app. This provides separate database and secret scopes without depending on a paid custom-environment feature.

## Local continuity

The directory and Compose project are named deems. The existing `interview_database` Docker volume and its database/user identifiers remain unchanged to preserve saved records. Existing migration IDs and browser draft keys also remain stable. The old interview.local address remains a Caddy alias; its existing Bonjour registration can continue during transition. The old workspace path may remain a symlink for active sessions.

For an existing installation: `python3 scripts/local.py domain-install`, then `docker compose up -d --wait --wait-timeout 90`. For a new installation, explicitly create the external `interview_database` volume first or override its name in Compose. Compose credentials are local development defaults only.

Back up with `python3 scripts/local.py backup`. Do not run down -v or replace the database as part of renaming. Local keys support the former INTERVIEW_LOCAL variables as a compatibility fallback.

## Hosting limits

The headless research worker needs a persistent container and is not deployed by Vercel. Keep research disabled operationally until a separately hosted worker is configured against the appropriate database. Local file-based resume access returns 404 on Vercel. Native apps and Apple App Store registrations are not included in this web pipeline.

References: [Vercel private production protection](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan), [custom domains](https://vercel.com/docs/domains/set-up-custom-domain).

## User accounts and workspaces

Production and staging use separate Deems Cognito user pools and app clients. `DEEMS_MULTIUSER=true` enables account registration, email confirmation and password recovery. Set the server-only `DEEMS_COGNITO_REGION`, `DEEMS_COGNITO_USER_POOL_ID`, `DEEMS_COGNITO_CLIENT_ID` and an independent random `DEEMS_AUTH_SECRET` in each environment. Use public clients without a client secret, with `ALLOW_USER_PASSWORD_AUTH`, email usernames, automatic email verification and user-existence error suppression. Passwords require at least 12 characters. Do not reuse or change another product's app client.

The app verifies ID token signature, issuer, audience, expiry, token use and verified email before allowing workspace access. Sessions use Secure, HttpOnly, SameSite=Lax, host-only cookies and last at most one hour. Registration and recovery actions accept bounded, same-origin, Zod-validated requests. Existing single-owner deployments can keep `DEEMS_MULTIUSER=false` and their `DEEMS_COGNITO_ALLOWED_SUBS` allowlist.

Each authenticated Cognito subject maps to a private PostgreSQL schema named from a fixed-length SHA-256 digest. The subject comes only from a verified session, never a submitted workspace ID. Every database query and transaction selects that schema. There is no public-schema fallback for authenticated requests. Each operation uses a transaction with a local search path, so PgBouncer cannot reassign its backend between workspace selection and the query. Unfinished transactions roll back before the connection returns to the pool. Each schema has its own migration ledger, record IDs, foreign keys, constraints, revisions and command receipts. Catalog inserts are batched and preserve existing rows. Schema isolation is enforced by the app's database connection layer; this does not create a separate PostgreSQL login or RLS policy for every account.

Browser drafts use the same workspace key. Local installations retain their original draft keys and public schema. A stale tab carries its original workspace key, so switching accounts cannot silently save its draft into the new account. Account changes refresh other tabs. Export reads only the authenticated schema. Local personal files and database contents are never imported into hosted accounts automatically.

For the first public release, keep Vercel Authentication on All Deployments while testing staging and production. After verifying two-account persistence/export isolation and authenticated API boundaries, change production to Standard Protection so other users can reach `/signup`; Deems authentication still protects all workspace pages and APIs. Keep staging on All Deployments. Do not change protection before these checks. `DEEMS_HOSTED_READY` is a setup guard, not authentication.

Run `npm run typecheck`, `npm run check:contracts`, `npm test` and `npm run build`. The PostgreSQL pool isolation test is skipped unless `DEEMS_ISOLATION_TEST_DATABASE_URL` explicitly points at a disposable hosted test database. It creates and drops only two generated test schemas. Live release verification should use separate disposable Cognito users and verify reads, writes, history, export, forged workspace headers, expired sessions and browser account switching. Do not treat mocked auth tests as provider or email-delivery evidence.

## Closed registration and crawler policy

Both environments expose the Deems login page without Vercel deployment protection. Workspace pages and APIs still require a verified Deems session. `DEEMS_SIGNUP_ENABLED=true` is required in addition to multi-user mode for signup, confirmation and resend. Default is closed. Password recovery remains available. Keep the Cognito pool self-registration setting consistent with this flag so callers cannot bypass the app through the public Cognito API.

Administrators belong to the Cognito `admin` group, checked from verified token claims rather than a submitted email. This does not grant cross-workspace data access.

All responses carry crawler exclusion headers and `/robots.txt` disallows every crawler. These are instructions for compliant crawlers; authentication protects private data from clients that ignore them.
