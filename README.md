# Deems

A private career preparation and learning workspace with company research, role plans, interview records, quizzes and spaced review.

- Production: https://deems.app
- Hosted staging: https://deems.dev
- Local development: http://deems.local
- Repository: https://github.com/stansky/deems
- Native product identifier: `deems`; intended iOS/macOS bundle ID: `app.deems`

Next.js, TypeScript, Zod, OpenAPI, PostgreSQL, Drizzle and shadcn components. Native clients are not implemented yet.

## Develop

```sh
npm ci
npm run typecheck
npm run check:contracts
npm test
npm run build
```

`npm run dev` listens on 127.0.0.1:3041 and needs DATABASE_URL. Local Docker preserves the existing PostgreSQL volume; see docs/deployment.md before starting a fresh installation. Personal records and private files are excluded from the repository and cloud builds.

## Deploy

GitHub Actions checks pushes and pull requests. The Deploy Deems workflow deploys an explicitly chosen revision to staging or production after checks. Each environment has its own Vercel project and secrets. Hosted installs fail closed until provider authentication and a database are configured. See [deployment setup](docs/deployment.md).
