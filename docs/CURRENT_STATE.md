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

## Still incomplete / launch blockers

| Priority | Area                      | Evidence and impact                                                                                                                                                                                                                                                   |
| -------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Nested section writes     | WebsiteRepository.upsertSection updates by section ID alone. A foreign section ID can bypass parent ownership even if TenantGuard passes. Save deletes/upserts separately and is not atomic.                                                                          |
| P0       | Public entitlement policy | BusinessService.getPublicProfileBySlug checks limited status strings; no strict missing-subscription denial or current timestamp check. The daily timer is insufficient. Audit all public catalogue/config endpoints.                                                 |
| P0       | Payments                  | Signature hashes JSON.stringify(payload) instead of preserved raw bytes; string comparison; no atomic fulfilment or amount/currency match; replay can change the paid period. Webhook errors are swallowed. authorization_code is assigned to paystackSubscriptionId. |
| P0       | Environment safety        | JWT configuration falls back to known default strings. Add startup validation before production deployment.                                                                                                                                                           |
| P1       | Public renderer           | No public /@slug page exists. Previous dashboard /sites/slug link had no renderer. Theme/config APIs are not a published website.                                                                                                                                     |
| P1       | Email                     | Password reset delivery is a TODO; verification creates a token without a complete delivery/UI flow. The redesign does not claim recovery is working.                                                                                                                 |
| P1       | Uploads                   | Cloudinary config/schema exist; complete signed upload processing and attachment validation are missing.                                                                                                                                                              |
| P1       | Analytics                 | Schema/dependencies exist; no completed event-ingestion/aggregation/dashboard pipeline.                                                                                                                                                                               |
| P1       | Runtime integration       | Production database, email, Redis, Paystack credentials and deployment have not been verified in this task.                                                                                                                                                           |
| P2       | Domains/staff/admin       | Domain saving is not DNS verification; STAFF enum is not permissions; full admin operations are not implemented.                                                                                                                                                      |

## Important distinction

The concept gallery is fictional design inspiration. It does not seed or release matching business themes. Existing theme presets remain separate.
Catalogue/settings/appearance pages keep their original backend integrations. New workspace counts are tested at the UI contract boundary; live database integration still requires the configured API.
Do not enable public publishing or live charging until the P0 items have regression tests and are resolved.
