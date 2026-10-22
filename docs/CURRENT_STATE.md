# Current implementation audit

## Timestamp-free provider reads — 22 October 2026

The real Paystack response supplies neither updatedAt nor updated_at. The
controlled attempt reached REVIEW at attempt 8 with PROVIDER_TIMESTAMP_MISSING;
one fulfilled Basic payment and its paid expiry remain unchanged. Alias parsing
alone was insufficient and is not presented as a successful provider fix.

Timestamp-free linking now requires a fresh provider read bound to a short-lived
PostgreSQL row-version token. A conditional write rejects any intervening local
subscription update; the network request remains outside the transaction. Only
transient snapshot conflicts receive up to three fresh-read attempts before
durable deferral; permanent policy failures are not retried within that pass. The
initial link uses a second provider read after exact transaction identity is
established. Subsequent linked reads need one provider fetch. Provided timestamps
still undergo format/future/conflict checks and stale snapshot rejection. Missing
timestamps are not replaced with local time. No database migration is needed.

After CI and preview deployment, a reviewed operator may requeue only the known
REVIEW event once, retain attempts, and append the defect/fix reference to its
billingData. This is not automatic REVIEW retry or a bulk inbox reset.

## Provider timestamp compatibility — 22 October 2026

A controlled retry of the single preview PENDING event reported
SUBSCRIPTION_LINK/PROVIDER_TIMESTAMP. Prior identity, plan, amount, currency
and customer checks passed; the original paid entitlement remains unchanged.
The shared provider timestamp parser now accepts updatedAt or updated_at,
requires an explicit timezone, rejects missing/invalid/future/conflicting values,
and supplies the same validated instant to policy and monotonic persistence.
Real provider acceptance remains pending the next controlled retry.

## Recurring-link investigation — 22 October 2026

The owner screenshot confirms NEXORA_MIGRATE_APPROVED=false; the migration
approval item is closed based on that evidence. No browser reset is required.

Preview recovery reaches SUBSCRIPTION_LINK, so provider fetch and an exact paid
anchor lookup complete before the failure. The event remains PENDING at attempt 6.
Policy failures now identify a fixed reason without returning or logging raw
provider values. All existing identity, environment, amount, currency, plan,
customer, timestamp and transaction checks remain enforced. This is diagnostic
evidence, not proof that renewal or cancellation works. A controlled retry can
advance a PENDING event due time without resetting attempts or touching REVIEW.

## Operational acceptance follow-up — 22 October 2026

Preview outbox evidence records two VERIFY emails as SENT on their first attempt.
Production has no account-mail attempts, so production delivery/inbox acceptance
remains open. The preview billing inbox still has one subscription.create retry
(attempt 5); two initial charge events are DONE. No renewal link is inferred.
Recovery failures now report only a static processing stage, allowing operators
to distinguish provider reads, payment anchors, link policy, cancellation and
invoice reconciliation without exposing provider messages or payment data.

GitHub environment-variable administration is unavailable through the connector.
The browser is signed out, so the migration-approval reset requires secure GitHub
sign-in. No environment value has been changed or claimed reset. Paid cron/
always-on hosting is still unapproved, and no paid service was created.

## Production integration — 22 October 2026

The owner explicitly authorized merging and deploying the remaining reviewed work.
PR #24 is merged. OTP onboarding is integrated from PR #13, with the initial
profile read using asynchronous completion callbacks and unmount protection.
The older PR #14 is superseded by current rollout guards and Neon media storage;
its Cloudinary configuration must not replace the current implementation.

The production API returned `data.status=ready` over HTTPS after waking from
free-tier sleep. Its seven migrations are applied; it has no sandbox accounts,
payments or plans. Vercel production now has its own API_UPSTREAM_URL pointing
to the production Render API and SITE_URL set to the custom domain. Production
Vercel deployment `dpl_GNGFBn1AAf1pdnDaasDTqgsk8UA5` is READY at merge `214cdac0`
and serves the custom domain. Its proxied readiness returns HTTP 200, anonymous
profile requests return HTTP 401, and storefront sitemap reads return HTTP 200.
Preview remains separate.

Live charging, public publishing and analytics remain disabled. Inbox delivery,
production media operations, recurring-provider linkage and reliable scheduler/
alert hosting still need acceptance. A production deployment does not close them.
Earlier status entries below are historical snapshots.

## Appearance deployment correction — 22 October 2026

A successful Basic sandbox payment had granted annual access, but the custom
domain still served frontend commit `24c81b23` from 18 October, which lacked the
new template gallery. The domain `nexora.froshcodeorbit.site` now points to READY
Nexora deployment `dpl_WUoWcKhcgAqoqMCAwAB2MsNdtN2g`, commit `93d056e7`, using
the existing preview API. This was an alias correction to a previously built and
reviewed frontend, with no schema, plan, payment or publication flag changes.

The domain's Appearance route and API readiness both return HTTP 200. Its served
JavaScript contains the gallery, all four Basic design names and the Save this
design control. Basic covers Nexora Signature, Atelier Minimal, Botanical Studio
and The Editorial; five Premium designs retain their plan restrictions. Forty
targeted template/storefront tests passed. Saving from the owner's authenticated
browser still requires acceptance; no owner session was impersonated.

Sandbox initial purchase and annual entitlement are recorded. Recurring linkage
remains UNLINKED with a pending subscription.create event, so renewal/cancellation
acceptance is still open. Live charging and public publication remain disabled.

## Launch follow-up (22 October 2026)

Production schema release is no longer pending: Actions run `39697159486`, job
`Neon production: apply`, succeeded on retry, including the post-apply migration
ledger and schema-diff checks. Render production deployment `dep-dbcld0qvcj2c73f1vk70`
is live at reviewed commit `93d056e7`. The direct HTTP readiness probe timed out;
deployment status alone does not close API acceptance. Earlier entries below are
historical and do not override these results.

Scheduled billing recovery now checks for unresolved REVIEW events from earlier
runs before reporting success. It continues processing the bounded due batch and
does not automatically retry quarantined records. Unit and PostgreSQL regression
coverage is recorded in VERIFICATION.md. Hosting and failure-notification delivery
still require acceptance; no scheduled Render service exists yet.

Vercel's custom domain still resolves to Nexora deployment `dpl_JCgREekm9SW9d1kwvYs6sV3cugv4`
(commit `24c81b23`). Two later failed attempts referenced MeChat source, which lacks
Nexora's `apps/web` directory. Do not change Nexora's root directory to accommodate
another repository. A fresh Nexora preview is pinned explicitly to `93d056e7`.
No production frontend cutover, paid hosting purchase, live payment enablement or
public publishing enablement is part of this follow-up.

The separate preview API was then deployed to `93d056e7` (Render deployment
`dep-dbcreqivcj2c73fkh8ag`, live). The fresh Vercel preview's proxied
`GET /api/v1/ready` now returns HTTP 200 with `data.status=ready`. This closes the
preview routing/schema readiness check; production HTTP readiness remains open.

Remaining launch gates: disable the one-time migration approval variable, verify
production readiness over HTTP, approve reliable hosting/scheduler costs, configure
and test scheduler alerts, complete genuine Paystack sandbox and inbox/media/
storefront acceptance, then perform the reviewed frontend production cutover.


## Hosted preview follow-up (18 October 2026)

Verification-code follow-up replaces email verification links with authenticated six-digit codes, keyed account-bound digests, a ten-minute expiry, five durable attempts, and branded HTML/plain-text email. The new screen supports paste/autofill, resend cooldown and success/errors. Migration retires pending verification links only; password resets retain their existing flow. Hosted inbox acceptance remains required.

Account email now also supports optional Brevo HTTPS delivery, preserving the encrypted outbox and SMTP fallback configuration. Provider credentials and real inbox verification remain pending; see BREVO_SETUP.md. This does not enable public publishing.

Created the dedicated Neon database and Render preview API. All six Prisma migrations are applied in Neon. Vercel preview uses a same-origin API rewrite and a separate server-side upstream for storefront rendering. Provider email, media, billing and production launch gates remain open; see HOSTED_PREVIEW.md.

Source: Wizzyfrosh/Nexora, initial baseline commit ec9dff6. Inspected 15 October 2026.
Static code review and local builds/tests do not prove a deployed API or database works.

## Present in the code

- npm/Turborepo monorepo with Next.js 16.4.2, React 19.2.4, NestJS 11, Prisma 6.4.1 and shared types.
- Auth services/controllers, Argon2 hashing, JWT cookies, refresh flow and initial business/trial creation.
- Business profile routes; products, categories, services and CRM repositories/services/controllers.
- Theme/config/section persistence, seeded theme definitions and appearance/settings screens.
- Paystack initialization/verification/webhook scaffolding.
- PostgreSQL models for subscriptions, payments, media, analytics and audit records.

## Delivered in this upgrade

- Expanded responsive homepage combining the three supplied design references.
- Server-rendered marketing content, interactive concept filters, mobile navigation and native accessible FAQ controls.
- Reference-led registration/login screens, password visibility controls and API errors.
- Branded responsive dashboard shell; API-derived product/service/enquiry counts with loading/error/retry.
- Removed fabricated dashboard metrics and sample “top products”; fixed subscription status comparisons to uppercase API enums.
- Replaced dead website navigation with an honest website setup screen; removed dead analytics navigation.
- Product metadata and an implementation-aligned documentation pack.

## Tenant-safety follow-up (15 October 2026)

Code changes now enforce transactional parent-scoped section replacement, scoped enquiry/product/service writes, same-business category validation, a shared current-time public-access policy, public field projections, bounded content DTOs/pagination, production configuration checks and cookie-origin protection. Public website reads cannot create missing records. Existing deleted catalogue rows are excluded.

Local API build/type checks and 79 unit tests pass. The disposable PostgreSQL 16 CI job passed all 18 HTTP/rollback/concurrency regression tests (run 38783059278, source commit 6a7a234f9e744c3c15ac789ab1ff793988cd491a). Media upload ownership/verification and full session lifecycle remain later milestones.

## Still incomplete / launch blockers

Secure media follow-up implements API-mediated signed Cloudinary image upload, bounded decode/re-encode, tenant quota reservations, verified ownership on catalogue/branding/section writes, image picker integration and durable safe deletion. See MEDIA_SECURITY.md: these are public catalogue assets, not private documents. Provider/staging delivery, CDN invalidation and operational cleanup monitoring remain unverified. Legacy URLs require inventory/re-upload; no production migration was performed.

Account follow-up implements hashed action/session tokens, atomic claims/rotation, replay-family revocation, reset/logout access revocation, encrypted SMTP outbox and recovery/verification screens. See ACCOUNT_SECURITY.md for cutover requirements and exact limitations. Real inbox delivery and deployed cookie checks remain unverified; media is not included in this slice.

Recurring follow-up now implements transaction-linked provider mapping, verified invoice renewal, separate renewal metadata, durable owner cancellation and periodic latest-invoice sync. Billing UI uses real status and removes invented metrics/unreleased-feature claims. CI run 38791724375 passed 123 unit tests, 47 PostgreSQL integration tests, builds, three migrations and zero schema drift. Desktop/mobile browser fixture checks and targeted API/web lint passed locally. See RECURRING_BILLING.md for remaining live gates; provider mapping without an exact invoice/transaction remains review-only.

Payment follow-up: known-purchase verification, raw webhook signatures, durable recovery and atomic replay protection are implemented. CI run 38785191636 passed 102 unit tests and 35 PostgreSQL integration tests, including 17 billing scenarios; both migrations applied with no schema drift. This is a tested purchase-processing slice, not completion of all M2 launch gates.

| Priority | Area | Remaining work |
| --- | --- | --- |
| P0 | Billing launch | Initial and provably mapped recurring purchases have verified replay-safe fulfilment. Live checkout is blocked. Unproven mappings, refund/dispute policy, operator alerts and genuine sandbox checkout remain open; see RECURRING_BILLING.md. |
| P0 | Dependency release review | Compatible updates remove all reported production findings and critical findings. Two unpatched development-tooling roots still produce 25 affected entries (5 high, 20 moderate); upstream remediation or an explicit release risk decision remains required. See DEPENDENCIES.md and VERIFICATION.md. |
| P1 | Public renderer rollout | Canonical /@slug SSR, owner editor/preview, validated publication and enquiry workflow are implemented; publishing defaults off. Real-provider staging journey, account/content cutover and operator launch approval remain open. See PUBLIC_WEBSITE.md. |
| P1 | Identity and uploads | Session rotation, atomic reset/verification and registered media ownership are implemented. Real SMTP/Cloudinary staging checks, deployed cookies, legacy media inventory and operational queue monitoring remain open. |
| P1 | Runtime integration | Deployed cookie topology, email, provider accounts and production database remain unverified. |
| P1 | Analytics operations | First-party opt-in events, durable PostgreSQL processing, tenant/day reports, owner dashboard and bounded retention are implemented; collection defaults off. Production scheduling, alert delivery, load tests, backup restore and third-party telemetry review remain open. See ANALYTICS.md. |
| P2 | Domains/staff/admin | DNS verification, granular roles and audited operations remain later milestones. |

## Important distinction

First-party analytics follow-up implements explicit opt-in page/click events, no new stored visitor/IP/session metadata, durable PostgreSQL aggregation, private UTC reports, retained CRM enquiry totals and a bounded standalone worker/retention command. CI run 38853598771 passes 200 unit tests, 122 PostgreSQL tests, six migrations with zero drift, all builds, audit/import gates and the compiled worker on disposable PostgreSQL. Browser permission/withdrawal/privacy-signal and dashboard checks pass. Collection remains default-off; actual scheduling, alerts, backup restore, load/cost tests and third-party telemetry review remain open. Fresh signup layouts now use released section fields; existing owner content is preserved. See ANALYTICS.md and VERIFICATION.md.

Public-website follow-up implements five released sections and four bounded style presets, strict public DTOs, paginated catalogues, no-store SSR/metadata/sitemap, private noindex preview and dedicated audited publication. General profile writes no longer toggle publication. Verified/nondeleted owners are now required at public read boundaries; previously published unverified accounts need an explicit cutover. Contact forms save to the real CRM with a shared tenant/hour cap; no email notification is claimed. CI run 38828937058 passes 170 unit and 101 PostgreSQL integration tests, all three builds, all five preceding migrations, zero drift and audit/runtime smoke gates. Local targeted lint and controlled-browser checks pass; see VERIFICATION.md for evidence and remaining launch gates.

The concept gallery is fictional design inspiration. It does not seed or release matching business themes. Existing theme presets remain separate.
Catalogue/settings/appearance pages keep their original backend integrations. New workspace counts are tested at the UI contract boundary; live database integration still requires the configured API.
Do not enable public publishing or live charging until the P0 items have regression tests and are resolved.
