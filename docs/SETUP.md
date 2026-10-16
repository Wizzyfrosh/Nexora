# Local setup walkthrough

Works from Windows PowerShell or a standard terminal. Existing repository:
https://github.com/Wizzyfrosh/Nexora

## 1. Prerequisites and install

Install a supported Node LTS version compatible with the lockfile and Next/Nest, Git and access to a development PostgreSQL database. Confirm node --version and npm --version first.
Clone/open the repository, then:

```sh
npm ci
npm run build --workspace @nexora/shared-types
npm exec --workspace api -- prisma generate --schema prisma/schema.prisma
```

If a workspace dependency fails to resolve, build shared-types first; do not bypass package resolution with copied files.

## 2. Environment files

Copy config/api.env.example to apps/api/.env and config/web.env.example to apps/web/.env.local.
Fill values locally or in a secret manager. Do not paste credentials into chat, commits or screenshots.
Use a new development DB and provider test credentials. Do not reuse any Redis credential previously disclosed in conversation.
Actual API configuration currently consumes REDIS_HOST/PORT/PASSWORD. A REDIS_URL copied from a provider is not automatically read by the current implementation; add a tested TLS/URL adapter in the worker milestone if using that form.
PostHog/Sentry/Cloudinary variables currently do not mean their integrations are complete.

Generate independent random access/refresh secrets locally:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run twice. Keep output private.

## 3. Database

Inspect existing migration history and target database before changing it. This repo currently has a schema, not a verified production migration rollout.
For an empty local development database only:

```sh
npm exec --workspace api -- prisma migrate dev --schema prisma/schema.prisma --name initial
```

Review generated migration SQL. Never use this command against production.
Review apps/api/prisma/seed-themes.ts before seeding; do not assume themes/plans already exist in your database.

## 4. Run

In one terminal:

```sh
npm run dev --workspace @nexora/shared-types
```

In a second:

```sh
npm run dev --workspace api
```

In a third:

```sh
npm run dev --workspace web
```

Web: http://localhost:3000. API: http://localhost:4000/api/v1.
FRONTEND_URL must match web origin. NEXT_PUBLIC_API_URL must include the prefix.

## 5. Smoke check

Homepage loads without API, menu/gallery/FAQ work. Register using a development account; verify database record persistence and /auth/me cookie response. Create one product/service and read it back.
If API is unavailable, forms must show an error. Do not treat the static homepage as evidence of successful registration or database setup.
Public websites, verified email/reset delivery, uploads and analytics require remaining milestones.
