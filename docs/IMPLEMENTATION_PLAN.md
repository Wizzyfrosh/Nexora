# Build sequence and remaining milestones

No blanket time estimate: each gate must be verified before the next release.

## M0 — Baseline and visual upgrade (this branch)

Audit source, replace homepage/account/workspace shell, remove fake overview metrics, add documents, build/test and review desktop/mobile.
Exit: changed UI compiles; links resolve; real counts/error states work at contract boundary; docs match actual implementation.
The public renderer and P0 security fixes are not silently counted as finished.

## M1 — Tenant and public-access safety (tenant regression gate passed; deployment/media follow-up open)

- Transactional section replacement scoped to website; validate all IDs before deletion; tests prove no foreign writes.
- Cross-tenant category/media/product/lead checks, explicit public projections and safe URL validators.
- One current-time entitlement gate reused by all public routes; missing subscription denies.
- Fail-closed production config, deployment cookie/CSRF review.
  Exit: negative integration tests with owners A/B on isolated PostgreSQL, no partial writes, no draft/expired access.

Implemented first slice: tenant-scoped transaction writes, category checks, public policy/projections, runtime input/pagination validation, production configuration checks and OriginGuard. CI passed all 18 real PostgreSQL regression tests in run 38783059278. Media-provider ownership integration and final deployed cookie validation still require follow-up; do not claim those complete.

## M2 — Trustworthy billing (known-purchase slice implemented; live gate closed)

Durable pending purchases/inbox/fulfilment, raw signature verification, correct provider IDs, amount/currency/reference checks, transactional replay guard, reconciliation and event ordering.
Exit: concurrent webhook/callback tests pass; provider test-mode payment grants exactly once; retry recovers without double grant. Live charging remains off until pricing/refund/support policy is confirmed.

Implemented raw signatures, durable snapshot/inbox/reconciliation, owner-only verification, exact purchase matching and transactional fulfilment. See BILLING_ROLLOUT.md for migrations, recovery and remaining recurring lifecycle/refund/operator gates. Actual provider sandbox checkout still requires an owner's test account; automated tests substitute provider transport only. Live checkout is blocked in code.

## M3 — Identity completion and media

Before live M2 activation, finish the remaining policy/provider/operator checks in RECURRING_BILLING.md. Recurring invoice processing and owner cancellation are now implemented in the test-gated follow-up; this does not enable live billing.

Deliver verification/reset emails, build token screens, hash/rotate tokens safely and validate cross-origin deployment.
Account implementation is now present behind configured SMTP delivery; see ACCOUNT_SECURITY.md. Token/session cutover logs owners out by design. Real inbox delivery and deployed cookie validation remain required before this exit gate is met.
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
