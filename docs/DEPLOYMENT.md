# Deployment and release runbook

Status: deployment specification. This task does not deploy or mutate production data.

## Topology

Web on Vercel is the intended frontend. A persistent Node host for NestJS and future BullMQ workers must be selected/confirmed. PostgreSQL provider and region must be confirmed from configured deployment, not inferred from project history.
Keep API/DB/worker near each other. A separate request-only web deployment must not accidentally run infinite worker loops.

## Environments

Local: developer database, provider test keys, local ports 3000/4000.
Preview/staging: isolated database, no customer PII by default, Paystack test keys, test email sink/allowlist.
Production: approved plan limits, production secrets, verified sending domain, correct origins and cookie topology.
Never point preview migrations or destructive tests at production.

## Build

Install from root with npm ci. Use npm run build (Turbo) to respect shared-package dependency order.
API requires Prisma generation: npm exec --workspace api -- prisma generate --schema prisma/schema.prisma.
For a web-only host, build shared-types from root before building apps/web. Do not downgrade Next to match an old PRD.
Runtime API start is npm run start:prod --workspace api; inspect produced dist path before configuring the host.

## Release

1. Resolve P0 findings; pass release tests.
2. Inventory environment variable names without printing values.
3. Backup and restore-test; deploy reviewed additive migrations through a controlled migration job.
4. Deploy API compatible with old/new web.
5. Deploy web preview and test cookie/auth/API errors.
6. Verify real staging owner/visitor/payment flow.
7. Review release diff and obtain applicable production authorization.
8. Promote; monitor 5xx, latency, auth failures, webhook backlog and subscription anomalies.

## CORS and cookies

FRONTEND_URL must be exact allowed origin. NEXT_PUBLIC_API_URL includes /api/v1 and must use HTTPS for production.
Current HttpOnly SameSite=Lax cookies are not sufficient for arbitrary cross-site host combinations. Prefer a deliberately shared-site API subdomain/proxy; design CSRF checks and test target browsers. Do not enable wildcard credentialed CORS.
Use distinct secure secrets per environment. Keep migrations and production DB admin access out of web builds.

## Rollback

Record previous web/API revisions and migration compatibility. Revert application deployment before rolling back schema; keep additive migrations when safe.
Do not reset the database to hide a bad deployment. Data restoration requires a reviewed recovery plan and reconciliation of payments processed after backup time.
Unpublish/suspend gates must remain effective during cache/deployment rollback.
