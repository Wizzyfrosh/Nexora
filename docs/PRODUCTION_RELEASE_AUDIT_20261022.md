# Nexora production release readiness audit — 22 October 2026

## Subsequent release update

The numbered audit below is historical. Production migration run `39697159486`
attempt 2 subsequently passed apply, ledger and zero-diff checks. All seven
migrations are now applied. Production HTTPS readiness passes, and Vercel
production deployment `dpl_GNGFBn1AAf1pdnDaasDTqgsk8UA5` serves `214cdac0` through
the canonical domain using the separate production API upstream. See CURRENT_STATE.md
and VERIFICATION.md for the current evidence and remaining provider/hosting gates.
The one-time migration approval variable still needs operator reset; connected
GitHub tools do not expose environment-variable administration.

## Verified with connected systems (earlier snapshot)

1. GitHub Actions `39517889418`, `Neon rehearsal: apply` — completed successfully. All seven unmodified Prisma migrations applied through Prisma CLI; post-apply Prisma status and diff checks passed.
2. Neon project `purple-night-06010146`, branch `br-shy-breeze-bah4byat` — `_prisma_migrations` contains seven finished, non-rolled-back rows. Rehearsal database has 23 application tables, 249 columns, 93 indexes, 20 foreign keys and 8 enum types.
3. GitHub Actions `39693834834`, `Neon production: status` — completed status check, verified exact production direct Neon host, **7 migrations pending**. The action uses `status`, not `apply`; workflow success does not mean production schema is migrated.
4. Production Neon project `purple-night-06010146`, branch `br-lucky-credit-ba9ullga` — zero application tables as of this audit. Production schema has NOT been changed.
5. A pre-production recovery branch `br-steep-sea-ba5syw2y` was created from the empty production branch before any schema application. It has no compute endpoint.
6. Render production `srv-dbbr11jrjlhs73eug6n0`: web service `Free`, automatic deployment disabled. Start command is `npm run start:prod --workspace api` (no migration in web startup). Production secrets remain managed by Render; `PAYSTACK_LIVE_ENABLED=false`, `PUBLIC_PUBLISHING_ENABLED=false`, `ANALYTICS_ENABLED=false`, and `BILLING_WORKER_MODE=in-process` are explicitly set.
7. Preview Render service still contains migrations in its startup command; it is separate from the production API. Keep a one-time migration job out of web startup.
8. Vercel production environment has no `API_UPSTREAM_URL`; production frontend must NOT switch to the empty production backend until the production schema and API readiness pass.

## Next approved operator action (actual schema release)

Open [GitHub Actions](https://github.com/Wizzyfrosh/Nexora/actions/workflows/manual-neon-schema-release.yml) and choose `main`, `target=production`, `operation=apply`, confirmation `APPLY_NEXORA_PRODUCTION_SCHEMA`, **only after** reviewing this audit, verifying required environment protections, and intentionally setting `NEXORA_MIGRATE_APPROVED=true` in `nexora-production-db`. This is a state-changing production migration, not a repeat of the rehearsal.

Record the new run ID and confirm:
- Guard check says *production*, not rehearsal;
- `prisma migrate deploy` reports all 7 migrations;
- `prisma migrate status` says up to date;
- `prisma migrate diff` returns no differences;
- Neon production `_prisma_migrations` reports 7 finished rows, with 23 application tables.

After the migration, set the approval variable back to `false` or delete it.

## API readiness

`GET /api/v1/ready` returns HTTP 200 with a minimal `ready` status only when the expected application tables and all seven completed migration records exist. Missing tables, incomplete history and provider/DB errors produce HTTP 503 with a generic message, without revealing environment details. Do not mark a deployment production-ready by checking only `GET /api/v1` or whether Render says `live`.

After the production migration, deploy the same reviewed main commit to Render production. Verify `GET /api/v1/ready` and core auth/OTP, media, subscription read-only and storefront preview flows. Keep both payment and public publishing feature flags disabled.

## Remaining release blockers

- Move production Render from Free to suitable always-on capacity **after cost approval**; separately configure a billing cron with a monitored failure/retry policy. Until then the in-process fallback remains enabled.
- Paystack sandbox purchase/renewal/cancellation/replay tests, refunds/disputes operations and approved prices, terms and invoices are not complete. Live checkout remains disabled.
- Public publishing gate requires real Neon image upload/read/delete, anti-bypass, expiry and browser/mobile accessibility verification. Publishing remains disabled.
- Configure `API_UPSTREAM_URL` for Vercel Production only after a healthy production API and approved domain cutover.

Never put passwords, database connection strings, customer data or Paystack keys into GitHub source or issue comments.
