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
6. Configure and verify the Cognito settings below, including a private subject allowlist.
7. Set DEEMS_HOSTED_READY=true only once authentication and storage are verified. Without this flag, every app/API request returns 503 before accessing data. This flag is a setup guard, not authentication.

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

## Deems Cognito login

The app serves its own Deems-branded `/login` form. Credentials go only to the server and Cognito over HTTPS. The server verifies each session token's signature, issuer, client audience, token use, expiry and allowed subject before serving app or data routes. Cognito sign-in alone does not authorize every pool user to this private workspace.

Configure these server-only values independently in staging and production:

| Variable | Value |
| --- | --- |
| `DEEMS_COGNITO_REGION` | Region containing the user pool |
| `DEEMS_COGNITO_USER_POOL_ID` | The approved identity pool for this workspace |
| `DEEMS_COGNITO_CLIENT_ID` | A distinct Deems app client for this environment |
| `DEEMS_COGNITO_ALLOWED_SUBS` | Comma-separated Cognito subject IDs allowed to access this workspace |
| `DEEMS_AUTH_SECRET` | Random secret of at least 32 characters, different in each environment |

Use public app clients without a client secret and enable `ALLOW_USER_PASSWORD_AUTH`. Do not change ByteCrunch's existing client. If reusing its identity pool, create separate Deems clients and explicitly choose the permitted subjects. Otherwise provision a separate pool and accounts. Do not send account invitations automatically.

The app supports password login, authenticator/SMS MFA challenges and a required new password. It does not offer self-registration, password recovery, MFA enrollment or provider federation. Unsupported challenges show an error. Tokens live in secure HttpOnly, host-only cookies, never browser localStorage; staging and production cookies are separate. Sessions expire after at most one hour and require sign-in again. Records > Sign out clears this browser's session. It does not revoke a token already copied elsewhere before logout.

Keep Vercel Authentication on All Deployments as required above. This is an additional protection layer before the branded login. Do not enable `DEEMS_HOSTED_READY` with missing authentication or storage. Missing config fails closed. The setup flag never grants access by itself.

Before release, verify the anonymous custom-domain and deployment-domain boundaries, sign in as an explicitly allowed subject, read/write a disposable record in staging, verify denied subjects cannot read any API, then verify the production health/read path. Do not claim successful real Cognito login from mocked tests. Preserve live data before an additive migration.

Loopback development stays unauthenticated by default. `DEEMS_AUTH_ENABLED=true` enables the same auth boundary locally and requires HTTPS for secure browser cookies. Keep forwarded host/protocol headers controlled by the reverse proxy.
