# First-party analytics pilot

Implemented 16 October 2026. This closes a bounded M5 slice, not the operational launch gate.

## Visitor and owner behaviour

- `ANALYTICS_ENABLED` is API-only and defaults false. New SSR storefront DTOs expose that boolean. Disabled collection has no consent widget or browser event requests; the API independently rejects new events with 503. No deployed configuration was changed.
- When enabled, visitors explicitly allow optional page-view/WhatsApp-click counting. No request is sent before permission; decline/withdrawal and cross-tab preference changes stop future events. DNT=1 and Global Privacy Control override saved permission. Browser-only storage holds a versioned per-business allow/deny preference, not a visitor ID. A blocked storage API leaves the choice in memory for that page.
- Event IDs are random UUIDs per page/click, not persistent visitor/session identifiers. Page effect replay and request retries reuse the page event ID. No tracking cookies, fingerprint, referrer/URL, user agent, account identity, IP address or arbitrary metadata is stored by the new analytics pipeline. Hosting/access logs still need their own privacy review.
- Owner Analytics reports support 7/30/90 inclusive UTC calendar days, with the current day partial. They show processed opt-in page views/clicks, zero-filled daily series and an accessible exact-value table. Enquiries are counted directly from retained, undeleted CRM records in the same date window, including enquiries without visit-count permission. Deleted enquiries reduce that total. There is no unique-visitor, revenue, attribution or conversion-rate claim.
- Reports show actual tenant backlog/review counts and latest aggregation time in the selected window. Expired/unpublished businesses retain private owner reports. No public report/raw-event endpoint exists. Preview never mounts the collector.
- Counts are best-effort public observations: a bot can forge permission or random events. They must never determine billing, entitlements or fraud decisions. Browser blockers/navigation/network loss can undercount. Withdrawing stops future collection; previously aggregated totals remain.

## HTTP boundaries

| Route | Contract |
| --- | --- |
| `POST /api/v1/businesses/:id/analytics/events` | Public, no-store, exact boolean `consent:true`, UUIDv4 eventId and PAGE_VIEW/WHATSAPP_CLICK only. Unknown fields are rejected. Exact configured browser Origin and normal application throttles apply. Response is only `{accepted:true}`. |
| `GET /api/v1/businesses/:id/analytics/report?days=30` | Authenticated current owner/tenant, private no-store, windows 7/30/90 only, counts and processing state only. |
| `POST /api/v1/businesses/:id/crm/track/whatsapp` | Retired: eligible public callers receive 410. This route no longer stores an IP-derived session value. Migrate callers to explicit-consent events. |

Acceptance rechecks publication, current entitlement, owner verification/deletion, released website schema and owned READY section media inside the tenant-locked transaction. A canonical-unavailable business cannot accept events. Deduplication is `(businessId,eventId)`; duplicates are acknowledged before capacity checks and cannot change type or count. Each tenant is capped at 1,000 new events/rolling hour and 10,000 pending/review rows. These are pilot abuse controls, not plan entitlements. Process-local IP throttles are not a distributed bot defence.

The capacity lock does not mark the business profile as edited on visitor activity. Fresh signup now seeds released Hero/Contact field names so the initial saved layout can pass eligibility after verification/publication. Existing legacy saved content remains subject to explicit owner review rather than silent conversion.

## Durable queue and worker

New tables `analytics_observations` and `analytics_daily` are separate from legacy AnalyticsEvent rows. Ingestion only writes a durable minimal observation. A short PostgreSQL transaction locks one eligible event with FOR UPDATE SKIP LOCKED, upserts its UTC daily counter and marks it DONE together. A crash/failure rolls both writes back. Concurrent workers skip claimed rows; retries cannot double-increment a committed event.

Failed passes use compare-and-set attempts, bounded exponential delay and REVIEW after five failures. Logs contain a fixed failure message, not event contents. Retained REVIEW rows are visible in owner reports. There is no public retry/drain route. An operator must diagnose failures before a narrowly scoped retry; do not blindly reprocess DONE rows.

Run from a built checkout with the reviewed migration applied and a scoped PostgreSQL DATABASE_URL:

```sh
npm run analytics:drain --workspace api
```

The compiled entry point is `apps/api/dist/src/modules/analytics/analytics.worker-main.js`. It processes at most 50 events, prunes at most 1,000 old observations and 1,000 old daily rows, prints aggregate pass/backlog counts and exits. Nonzero means a pass failed, retained REVIEW work exists, or startup/database access failed. Exit zero is not proof the backlog is empty; monitor pending/oldest age and retention progress. The standalone worker needs no JWT, SMTP, Cloudinary or payment secrets. No external provider is contacted and no other application workers are started.

**No production schedule was installed.** The API does not start an analytics timer. Before enabling collection, schedule repeated worker invocations on an approved persistent/scheduled host, capture exit status, alert on REVIEW/oldest age, and test recovery after missed invocations. A once-per-minute pass is a starting pilot configuration, not a throughput guarantee; tune frequency/concurrency against measured backlog and database headroom. SKIP LOCKED permits concurrent invocations. No Redis/BullMQ infrastructure is provisioned or claimed.

## Retention and migration

Observations older than seven days are eligible for bounded removal, including unprocessed/review rows. Daily counts older than the last 90 UTC days are eligible for removal. Long outages can therefore lose old unprocessed activity; recovery is bounded by retention. Idempotency exists while the observation is retained, not forever. Pruning only happens when the worker runs: these are retention targets, not a guaranteed erasure SLA. Monitor backlog and cleanup; deployment/backup/log retention and broader account/CRM erasure policy remain launch work.

The sixth additive migration, `20261016050000_private_analytics`, adds both tables/indexes and a tenant/date index for CRM aggregation. Review index-build locking and apply only in an authorized rollout after the previous five migrations. Maintain UTC database/session timestamps, as required by existing CRM timestamps, and verify day boundaries on the actual host. New observations explicitly use the API server's UTC clock; clients cannot supply event dates.

Legacy AnalyticsEvent session/metadata rows are neither imported into counts nor automatically deleted by this migration/worker. Inventory existing historical records and approve their retention/erasure policy separately. No production database migration, data removal, provider call or deployment was performed.

## Remaining M5/launch gates

Actual scheduler installation, alert delivery, load/fairness/cost tests, backup restore and retention verification remain open. Sentry and PostHog are not installed or enabled; third-party telemetry needs a separate purpose, minimisation, masking, consent and retention review. Existing mail/media/billing timers are not replaced by this slice. Resolve prior P0 billing/dependency acceptance and real SMTP/Cloudinary/cookie staging gates before enabling public publishing or collection. See VERIFICATION.md for executed evidence.
