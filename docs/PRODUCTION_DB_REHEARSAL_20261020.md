# Nexora — production migration release gate (20 October 2026)

## Verified results

- Production Neon project: `purple-night-06010146`, database `nexora`, main branch `br-lucky-credit-ba9ullga`. No application tables have been created on production.
- Schema-only rehearsal branch `br-jolly-violet-bazhf2bv` (from the *production project*, not preview): **all 93 baseline DDL statements** and remaining DDL statements from the six subsequent Prisma migration files applied successfully. Five data-changing token retirement statements were intentionally skipped.
- Rehearsal schema matches the existing preview application's **23 tables, 249 columns, 93 indexes, 20 foreign keys, 8 enum types**. Hashes of table/column definitions, index definitions, FK names and enum labels also match.
- **This is not yet an end-to-end Prisma migration run.** The schema-only rehearsal branch lacks the `_prisma_migrations` history ledger. Do not run Prisma migration deploy on this branch.
- A fresh branch `br-broad-sunset-baxoz6z6` (`prisma-full-rehearsal-20261020`) was created from the same empty production main. **All seven migration SQL files have since been applied in order on this branch, with their complete UPDATE/DELETE token cleanup statements intact.** The application schema fingerprints precisely match preview: 23 application tables, 249 columns, 93 indexes, 20 foreign keys and eight enum types. This is a **SQL rehearsal only**, not a Prisma CLI rehearsal. Prisma's `_prisma_migrations` ledger is not created on this branch and must never be manufactured manually. To run the true Prisma rehearsal from scratch, use newly created untouched branch `br-shy-breeze-bah4byat` (`prisma-cli-rehearsal-clean-20261020`), for which the reviewed guard allowlist has been updated to the exact direct Neon endpoint `ep-lively-rice-bawbyzik.c-8.eu-central-1.aws.neon.tech`, before triggering `prisma migrate deploy`.

## Controlled GitHub Actions workflow

`.github/workflows/manual-neon-schema-release.yml` is **workflow_dispatch only**, accepts `target=rehearsal|production` and `operation=status|apply`, and checks the **current main branch**.

It has no schedule, push trigger, automatic payment, production deployment, or customer-data copying.

1. In GitHub **Settings → Environments**, explicitly create `nexora-migration-rehearsal` and `nexora-production-db`. Set deployment branch policy to **main only**. Configure **required reviewers** for the production environment. Do not treat a workflow's environment name as proof that reviewers are configured: GitHub may auto-create an unprotected environment.
2. Configure **environment secrets** (not repository plaintext or public variables) in each:
   - `DATABASE_URL` — Neon pooled PostgreSQL URL for that environment's branch
   - `DIRECT_URL` — matching direct, non-pooled Neon URL for that same branch and DB role.
3. Set environment variable `NEXORA_MIGRATE_APPROVED=true` **only for the migration window after review**. Absence or any other value blocks `operation=apply`. For `status`, the variable is not required.
4. Confirm the exact allowlisted branch hosts in `scripts/guard-db-release.mjs`. Do not replace the allowlist with a wildcard: `production` is only `ep-wild-dew-baff7imw.c-8.eu-central-1.aws.neon.tech`; `rehearsal` is only `ep-lively-rice-bawbyzik.c-8.eu-central-1.aws.neon.tech`.
5. On GitHub **Actions → Nexora Manual Neon Schema Release → Run workflow**, choose **main**, `target=rehearsal`, `operation=status`. Pending migrations may cause a nonzero Prisma status code; review the output.
6. **Do not apply Prisma migrations to `br-broad-sunset-baxoz6z6`:** its tables were created through the direct SQL rehearsal but its Prisma migration ledger is absent. Instead, use clean production-project child branch `br-shy-breeze-bah4byat`, whose direct hostname is already allowlisted, and set its matching GitHub environment connection strings. Then choose `target=rehearsal`, `operation=apply`, type `APPLY_NEXORA_REHEARSAL_SCHEMA`, ensure review and approval settings are active, and run. Confirm **seven completed ledger rows** and no diff. Verify retired-token cleanup. Remove `NEXORA_MIGRATE_APPROVED` afterward.
7. Only after the full rehearsal passes, review recovery/backup and maintenance procedures. For actual production migration, use `target=production`, `operation=status` first, get explicit launch approval, and then independently run `apply` with confirmation `APPLY_NEXORA_PRODUCTION_SCHEMA`. This action will change production tables, so it is deliberately not being executed from this conversation.
8. After production migration: verify DB schema + ledger, authentication/OTP, media and billing read-only checks. Keep `PAYSTACK_LIVE_ENABLED=false` and `PUBLIC_PUBLISHING_ENABLED=false` until their separate provider acceptance.

## Release-process changes that must accompany production

- The production Render web service should start with `npm run start:prod --workspace api` only. It must **not** run `prisma migrate deploy` in the web service start command. Free-tier web services lack Render's paid-plan pre-deploy support. Use the separate reviewed GitHub workflow for one-shot migrations.
- Render API production is currently on a **Free** instance. Use a plan appropriate for paying customers, with monitored health, uptime, and recovery. Changing instance plans may incur charges and must be approved separately.
- The billing recovery runner is implemented and passed CI against disposable PostgreSQL; a paid, isolated **Render Cron Job** is still needed. Do not disable the web API's in-process recovery loop until that Cron Job is healthy and provider cancellation/renewal workflows pass sandbox acceptance.
- Neither automatic migration, production launch, live Paystack billing, storefront publishing, nor creating billable cron compute is performed by this database release gate.

## Known residual risk

An empty production database is a good initial state, but DDL matching alone does not prove real account-data migration, stable Paystack billing, refund operations, or storefront mobile accessibility. A full Prisma run, backup/restore exercise and provider testing are required before launch.

The manual workflow uses environment-specific secrets. Never paste those URLs or provider tokens into pull requests, chat messages, UI screenshots, GitHub code, or `NEXT_PUBLIC_` settings.

## Execution report — direct SQL rehearsal

On the isolated `br-broad-sunset-baxoz6z6` branch, seven complete migration files ran in order. No customer rows existed, so the token-invalidating data operations changed zero records. Schema fingerprint checks matched preview byte-for-byte at the metadata level. The production main branch remains empty. **No actual `prisma migrate deploy` command has run on the rehearsal or production Neon branch.**

The connected GitHub integration is repository-content scoped and cannot create GitHub environment secrets, approve deployments, or dispatch workflow runs. This is why protected environment configuration remains an account-owner action. Neon and Render resources can be managed separately through their own connected integrations, but using them to bypass GitHub's migration approval gate or directly forge Prisma migration ledger entries is not an acceptable shortcut.

## Dedicated untouched Prisma CLI test branch

`br-shy-breeze-bah4byat` (`prisma-cli-rehearsal-clean-20261020`) was created as a fresh child of empty production main. The protected workflow's exact rehearsal-host allowlist now points to that branch. No schema changes or migration-ledger entries have been applied to this branch. Use it exclusively for the manual, complete `prisma migrate deploy` rehearsal, after the GitHub environment is configured. The previously tested SQL branch `br-broad-sunset-baxoz6z6` must **not** be reused for Prisma CLI migration deploy.
