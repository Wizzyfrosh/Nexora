# Nexora — database migration and billing recovery release

## 22 October release follow-up

The production migration completed in Actions run `39697159486` (including ledger
and schema-diff checks). Earlier statements below about an empty production schema
are historical. Render production reports commit `93d056e7` live; independent HTTP
readiness remains unverified after a timed-out probe.

The scheduled command now exits nonzero while any durable REVIEW event remains,
including events quarantined by a previous invocation. A successful run therefore
cannot clear an alert simply because REVIEW events are excluded from the due batch.
Operators must inspect the protected inbox, establish provider evidence, and use a
reviewed resolution process; do not bulk-mark incidents DONE to silence monitoring.

No cron has been purchased or deployed. The prepared configuration is: Frankfurt,
reviewed Nexora release branch, `*/5 * * * *` UTC, build command
`npm ci --include=dev && npm run build --workspace @nexora/shared-types && npm exec --workspace api -- prisma generate --schema prisma/schema.prisma && npm run build --workspace api`,
start command `npm run billing:recover --workspace api`, `BILLING_WORKER_MODE=scheduled`,
and private matching Neon/Paystack configuration. Require an actual failed-run
notification acceptance before switching the web API away from in-process recovery.
Paid hosting approval and genuine provider acceptance remain prerequisites.

## Verified incident (20 October 2026)

Preview API deployment at commit `8254c821` built successfully but failed to start. Logs show `Prisma P1002` waiting to acquire PostgreSQL migration advisory lock through a `-pooler` Neon hostname. Preview's seven migrations are already recorded as finished; the production Neon database is still empty. The previous working preview API continued serving an older revision.

## Database connection separation

`DATABASE_URL` is for normal Prisma application queries (Neon pooled host). `DIRECT_URL` is for migration commands (Neon direct host). Prisma `schema.prisma` declares `directUrl = env("DIRECT_URL")`. Preview Render has both connection values configured with matching database and role; secrets were installed privately.

- Production: create a separate direct endpoint URL from **production Neon**, never from preview. Keep a matching pooled URL for the web API.
- Neither URL belongs in Vercel NEXT_PUBLIC vars, GitHub source, tickets, or screenshots.
- Build/CI uses an isolated dummy DIRECT_URL; PostgreSQL CI uses a dedicated disposable test database.
- Do not disable Prisma advisory locking to work around a pooler timeout.
- Avoid migrations on every app restart in the long term: run a reviewed one-shot release migration over direct Neon, then start the server. Existing Render start command still combines migration+web server and needs an operational migration-job refactor before live launch.

## Production schema rollout (not authorized by this code change)

1. Confirm that the production project `purple-night-06010146` and database `nexora` contain no customer tables and are backed up.
2. Create a disposable Neon branch from the production project, apply every **reviewed** Prisma migration there with the direct branch connection, and check the `_prisma_migrations` ledger.
3. Review migration effects and schema diff; validate representative read/write flows. Do not use a copy of preview customer data without an approved privacy/migration plan.
4. Securely install production Neon pooled `DATABASE_URL` and matching direct `DIRECT_URL` on the dedicated production Render service.
5. After independent approval, apply the same migrations to production using a controlled job, confirm all expected tables, bootstrap only required plan metadata, and verify API startup.
6. Do not enable `PAYSTACK_LIVE_ENABLED` or `PUBLIC_PUBLISHING_ENABLED` until real provider/storage and security acceptance.

## Billing worker (code implemented; NOT deployed)

`npm run billing:recover --workspace api` runs one bounded reconciliation pass with `BILLING_WORKER_MODE=scheduled` and proper PostgreSQL/Paystack credentials. It uses the durable payment event inbox, provider verification, exponential retry and REVIEW handling; a deferred or quarantined event causes nonzero worker exit and needs attention.

**Deployment steps once provider/sandbox are accepted:**

- Create a dedicated Render Cron Job in Frankfurt from the reviewed release revision, with independent *least-privilege* configuration pointing to the correct database and the same Paystack test/live environment.
- Build shared-types, Prisma client and Nest API. Start with `npm run billing:recover --workspace api` after the build.
- Schedule at a deliberate cadence (for example, every 5 minutes), set alerts on a failed invocation and on queued `REVIEW` events.
- Run controlled sandbox cancellation/renewal and replay tests and prove a restart does not lose events. One cron pass processes a bounded batch; monitor backlog and throughput.
- Only **after** the cron job is healthy set `BILLING_WORKER_MODE=scheduled` on the web service and redeploy; this disables the web service's in-process recurring timer.
- Leave email and media cleanup work separately monitored; this billing worker does not drain those queues.

**Rollback:** restore `BILLING_WORKER_MODE=in-process` on the running web API and redeploy if the new scheduler fails, but do not create overlapping independent jobs in the same environment. Investigate partially claimed events before re-running; payment fulfilment must remain idempotent.

**Limits:** This work does not certify Paystack live charges, tax receipts, refunds/disputes, settlement matching, secure merchant support or reliable production hosting. The production API remains blocked until database migrations are applied.
