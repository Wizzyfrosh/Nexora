# Hosted preview — 18 October 2026

## Infrastructure

- Neon project `autumn-term-84572816`, database `nexora`, PostgreSQL 16, Frankfurt; Umanor Free organization.
- Render service `srv-dba0s3lg1s2s73abeiu0` (`nexora-api-preview`), Frankfurt, free instance, manual deployments.
- Vercel project `prj_E5eNofx9fdo6IlqQZ4agBkXlRoPK`; preview deployment only. GitHub auto-deployment is not connected.
- API source is main commit `92d2164e70896aed30fea3387df5e1c96c62657b`.

The API builds shared types, generates Prisma and builds NestJS. Startup runs `prisma migrate deploy` before starting the API. This is limited to the newly created, empty preview database; do not repoint it to an existing production database. All six migration records were verified as applied. No customer data was imported.

## Frontend connection

Set `NEXT_PUBLIC_API_URL=/api/v1` and server-side `API_UPSTREAM_URL=https://nexora-api-preview-udii.onrender.com/api/v1` in Vercel Preview. Next rewrites proxy browser API requests without changing Origin or widening cookie scope; API responses are explicitly no-store. Server-rendered storefront reads use the absolute upstream.

Render's `FRONTEND_URL` must match the exact chosen Vercel preview origin, without path, query or trailing slash. Each new preview hostname requires updating it and waiting for the API redeploy. Keep old preview links out of acceptance testing after this change. Production promotion needs its own origin/configuration review.

JWT secrets and database credentials are stored only in the hosting environment. No credentials belong in this document, source code, or NEXT_PUBLIC variables.

## Remaining gates

SMTP, Cloudinary and Paystack credentials are not configured. Email verification/reset delivery, uploads and billing are not released. Public publishing and analytics collection remain disabled. Free Render sleep and timer-based jobs are not an always-on worker guarantee. Confirm operating costs, backups/restores, monitoring and provider delivery before production rollout.

Hosted HTTP acceptance passed through the Vercel proxy: signup 201, two Secure/HttpOnly/SameSite=Lax cookies, authenticated profile 200, foreign-Origin refresh 403, refresh 200, logout 200, logged-out profile 401 and subsequent login 200. One labeled test account remains and is logged out. This does not verify email delivery, uploads or all dashboard CRUD flows.

Current preview: https://nexora-nkoekeger-umanor-wisdom-chizoba-s-projects.vercel.app (Vercel access protection applies; generate temporary share links in Vercel rather than committing bypass tokens).
