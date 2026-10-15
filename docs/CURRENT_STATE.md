# Current implementation audit

Source: Wizzyfrosh/Nexora, initial baseline commit ec9dff6. Inspected 15 October 2026.
Static code review and local builds/tests do not prove a deployed API or database works.

## Present in the code

- npm/Turborepo monorepo with Next.js 16.2.7, React 19.2.4, NestJS 11, Prisma 6.4.1 and shared types.
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

Account follow-up implements hashed action/session tokens, atomic claims/rotation, replay-family revocation, reset/logout access revocation, encrypted SMTP outbox and recovery/verification screens. See ACCOUNT_SECURITY.md for cutover requirements and exact limitations. Real inbox delivery and deployed cookie checks remain unverified; media is not included in this slice.

Recurring follow-up now implements transaction-linked provider mapping, verified invoice renewal, separate renewal metadata, durable owner cancellation and periodic latest-invoice sync. Billing UI uses real status and removes invented metrics/unreleased-feature claims. CI run 38791724375 passed 123 unit tests, 47 PostgreSQL integration tests, builds, three migrations and zero schema drift. Desktop/mobile browser fixture checks and targeted API/web lint passed locally. See RECURRING_BILLING.md for remaining live gates; provider mapping without an exact invoice/transaction remains review-only.

Payment follow-up: known-purchase verification, raw webhook signatures, durable recovery and atomic replay protection are implemented. CI run 38785191636 passed 102 unit tests and 35 PostgreSQL integration tests, including 17 billing scenarios; both migrations applied with no schema drift. This is a tested purchase-processing slice, not completion of all M2 launch gates.

| Priority | Area | Remaining work |
| --- | --- | --- |
| P0 | Billing launch | Initial and provably mapped recurring purchases have verified replay-safe fulfilment. Live checkout is blocked. Unproven mappings, refund/dispute policy, operator alerts and genuine sandbox checkout remain open; see RECURRING_BILLING.md. |
| P0 | Dependency audit | CI installation reports 27 findings including 3 critical across the installed dependency tree. Triage affected paths, production exposure and compatible fixes before launch; see VERIFICATION.md. |
| P1 | Public renderer | Canonical /@slug SSR page and complete publish-to-contact workflow. |
| P1 | Identity and uploads | Session rotation and atomic reset/verification are implemented. Real SMTP inbox validation, operational mail monitoring and verified media ownership remain open. |
| P1 | Runtime integration | Deployed cookie topology, email, provider accounts and production database remain unverified. |
| P1 | Analytics | Ingestion, aggregation, dashboard and privacy controls remain incomplete. |
| P2 | Domains/staff/admin | DNS verification, granular roles and audited operations remain later milestones. |

## Important distinction

The concept gallery is fictional design inspiration. It does not seed or release matching business themes. Existing theme presets remain separate.
Catalogue/settings/appearance pages keep their original backend integrations. New workspace counts are tested at the UI contract boundary; live database integration still requires the configured API.
Do not enable public publishing or live charging until the P0 items have regression tests and are resolved.
