# Scalability and performance plan

Start with a modular monolith, not microservices. The largest early risks are unsafe shared data access, unbounded queries and provider costs, not insufficient service count.

## Proposed launch envelope

Design test (not a measured capacity promise): 100 active businesses, 10,000 total catalogue items, 20 concurrent private users and 50 public requests/second for a 15-minute staged load test. Build a representative mix, not one repeated cached page.
Targets: CRUD p95 <500ms excluding third parties; error rate <1%; public mobile LCP <2.5s; no tenant starvation. Measure baseline first and revise with hosting limits/cost.

## Database

Use one pooled application connection strategy and a direct/admin connection only for migrations when required by the provider.
Budget connections: API replicas × per-process pool + workers + migrations + monitoring must remain below database limits with headroom.
Select explicit fields, paginate lists, index measured tenant filters, avoid N+1, batch writes and keep transactions short.
Inspect slow queries and EXPLAIN before adding replicas or indexes. Scale compute/pool constraints before adding a service boundary.

## Public delivery

Begin with current-policy dynamic public reads until unpublish/expiry correctness is proven.
M4 implements no-store repeatable-read storefront snapshots, 50-item catalogue paging, a 100-file tenant media budget and a first-100-eligible-business pilot sitemap. Contact writes serialize the 100/tenant/hour cap in PostgreSQL. These are technical guardrails, not measured capacity or commercial plan limits. Segment the sitemap and add shared IP/bot controls before expanding beyond the pilot; see PUBLIC_WEBSITE.md. No long-term public cache or load-test performance claim is introduced.
Later cache public projections using tenant ID + published revision and a TTL bounded by entitlement expiry. Purge on publish/unpublish/suspend/delete/slug change; never mix owner preview with public cache.
Optimise image dimensions/formats, lazy-load below-the-fold assets and avoid blocking external fonts/scripts. Gallery imagery can fail independently of the core UI.

## Queue/worker requirements

BullMQ requires a compatible Redis TCP/TLS endpoint and worker host; an HTTP REST endpoint is not a connection substitute.
Verify selected Redis provider's command, blocking-connection and eviction behaviour before deployment.
Separate producer connections that fail promptly from persistent workers; test reconnect and graceful shutdown.
Bound concurrency and retries; exponential backoff, attempt limits, dead-letter visibility and idempotent consumers. Durable payment inbox must survive queue outage.
Do not put an always-running BullMQ worker into a request-only lifecycle.

## Analytics and fairness

Batch writes; bounded payloads; per-tenant event quotas/sampling; daily aggregates; retention cleanup.
Analytics loss must not block profile/catalogue edits. Never give unknown events unbounded metadata.
Rate limit by actor and tenant as well as IP; handle distributed rate-limit state when adding replicas.

## Scaling triggers

Sustained CPU >70%, database connections >70% of configured capacity, p95 latency over target, queue age >60s or error budget burn trigger investigation.
Find slow query/provider/caching causes first. Add API replicas only when session/rate-limit/job state is safely shared.
Move analytics storage separately only when measured volume justifies operational complexity.

## Cost controls

Set budgets/alerts for API compute, database storage/egress, image transformations/bandwidth, Redis commands/connections, email and observability.
Do not promise all services are free. Record current provider plan limits before choosing a production topology.
Bound image sizes, transformation variants, log retention, analytics events, retries and preview environment lifetime.
References: https://docs.bullmq.io/guide/connections and https://docs.bullmq.io/guide/going-to-production
