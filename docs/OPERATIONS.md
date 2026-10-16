# Operations and incident response

## Signals

Capture structured request ID, route, actor/tenant identifier where appropriate, status, duration and sanitized error category. Never log cookies, passwords, reset tokens, secret keys, payment authorization codes or full lead messages.
Track API p95/5xx, login/refresh failures, public gate denials, upload failures, payment inbox age/retries, reconciliation mismatches, queue backlog and database connections.
Sentry/PostHog are planned instrumentation, not working merely because environment names exist. Product analytics must never receive visitor enquiry text or credentials.

## Proposed alerts

5xx >2% for 5 minutes; queue oldest payment event >60s; any unexplained fulfilment mismatch; database pool >80%; backup failure.
Tune after baseline to avoid noise. Route alerts to a real owner before claiming monitoring is operational.

## Incident

Assign incident owner → preserve sanitized evidence → assess tenants/data/payments affected → contain specific route/provider action → apply reviewed fix → replay only idempotent events → verify and document impact.
Suspected tenant leak: disable vulnerable route/public projection, audit access, rotate affected credentials if exposed, determine actual affected records and communication obligations with appropriate expertise.
Billing outage: stop fulfilment if correctness uncertain, retain inbox/pending records, reconcile provider transactions; never bulk-grant from browser reports.

## Recovery targets

Proposed RPO ≤24h / RTO ≤4h require selected provider backup capability and a timed restore exercise.
Back up PostgreSQL and media references. Verify media retention/availability independently; a DB restore does not restore deleted Cloudinary assets.
Restore into isolated environment, verify tenant counts, foreign keys, catalogue samples and payment references; reconcile post-backup provider events before reopening billing.

## Scheduled work

Subscription expiry cleanup, payment reconciliation, token cleanup, dead-letter review, orphan media cleanup and retention purge.
Use durable scheduling with overlap protection. Current setTimeout/setInterval cleanup is not a reliable multi-replica job.
Record job last success and error; public authorization checks server time independently of job freshness.

## Support

Define owner/contact channel, severity expectations, abuse handling, account recovery and data export/deletion procedure before public launch.
