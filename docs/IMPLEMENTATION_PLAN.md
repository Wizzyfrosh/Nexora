# Build sequence and remaining milestones

No blanket time estimate: each gate must be verified before the next release.

## M0 — Baseline and visual upgrade (this branch)

Audit source, replace homepage/account/workspace shell, remove fake overview metrics, add documents, build/test and review desktop/mobile.
Exit: changed UI compiles; links resolve; real counts/error states work at contract boundary; docs match actual implementation.
The public renderer and P0 security fixes are not silently counted as finished.

## M1 — Tenant and public-access safety (next)

- Transactional section replacement scoped to website; validate all IDs before deletion; tests prove no foreign writes.
- Cross-tenant category/media/product/lead checks, explicit public projections and safe URL validators.
- One current-time entitlement gate reused by all public routes; missing subscription denies.
- Fail-closed production config, deployment cookie/CSRF review.
  Exit: negative integration tests with owners A/B on isolated PostgreSQL, no partial writes, no draft/expired access.

## M2 — Trustworthy billing

Durable pending purchases/inbox/fulfilment, raw signature verification, correct provider IDs, amount/currency/reference checks, transactional replay guard, reconciliation and event ordering.
Exit: concurrent webhook/callback tests pass; provider test-mode payment grants exactly once; retry recovers without double grant. Live charging remains off until pricing/refund/support policy is confirmed.

## M3 — Identity completion and media

Deliver verification/reset emails, build token screens, hash/rotate tokens safely and validate cross-origin deployment.
Implement signed Cloudinary uploads, ownership/size/type limits, cleanup and optional moderation.
Exit: fresh owner verifies/resets and uploads an image without exposing secrets; negative upload/auth tests pass.

## M4 — Public website delivery

Canonical /@slug route, explicit public DTO, eligible SSR renderer, released section/theme allowlist, authenticated preview and publication action.
Add contact form, safe WhatsApp contact link, metadata and sitemap. Avoid arbitrary HTML.
Exit: owner registers → saves real content → previews → publishes → visitor contacts → owner reads enquiry; unpublish/expiry removes public access.

## M5 — Analytics and operational readiness

Implement bounded event ingestion, durable queue/worker, tenant aggregates, honest chart states, Sentry and privacy-reviewed PostHog.
Replace timers with reliable scheduled cleanup without relying on them for authorization.
Exit: events produce correct counts after worker retry; costs bounded; alerts and backup restore validated.

## M6 — Pilot and launch

Five-business usability pilot; resolve blockers; verify mobile/performance/accessibility; approve terms/privacy/refunds and support process.
Exit: staging release checklist complete, authorized production rollout, rollback plan ready.

## Later Premium milestones

Verified custom domains and certificate lifecycle; granular team membership/roles; operational admin panel; advanced analytics.
Do not ship a domain text field or STAFF enum as a completed paid feature.

## Agent handoff for every milestone

Read AGENTS.md → inspect current status → choose a bounded slice → implement → negative tests → build → update audit/results → review diff → commit.
