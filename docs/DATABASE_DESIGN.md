# Database design and migration requirements

The executable schema remains apps/api/prisma/schema.prisma. This document describes requirements; it is not a migration.

## Existing entities

| Model                                       | Ownership / purpose             | Key invariant                                                   |
| ------------------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| User                                        | Global identity                 | Unique normalized email; passwordHash is private                |
| RefreshToken                                | User session                    | Revoked/expired tokens unusable; store hash in future migration |
| EmailVerificationToken / PasswordResetToken | Email flow                      | Hash, expiry, atomic single use                                 |
| Business                                    | Tenant root, ownerId            | Unique safe slug; deleted business inaccessible                 |
| Category                                    | businessId                      | Unique businessId + slug                                        |
| Product / Service                           | businessId; optional categoryId | Category belongs to same business; scoped slug                  |
| ProductImage                                | productId                       | Resolve product ownership before write                          |
| Website                                     | Unique businessId               | One config per business                                         |
| WebsiteSection                              | websiteId                       | Update/delete by ID AND websiteId                               |
| Theme                                       | Global preset                   | Only approved presets; Premium policy enforced                  |
| Lead                                        | businessId                      | Private visitor contact information                             |
| Plan                                        | Global price config             | Server-authoritative pricing and cycle                          |
| Subscription                                | Unique businessId               | One current entitlement record                                  |
| Payment                                     | subscriptionId                  | Unique paystackReference; no duplicate fulfilment               |
| Media                                       | businessId                      | Provider publicId and tenant ownership verified                 |
| AnalyticsEvent                              | businessId                      | Bounded append-only event payload                               |
| AuditLog                                    | Actor userId                    | No secrets; restrict modification/deletion                      |

Child records may inherit tenant ownership through a verified parent. ProductImage and WebsiteSection do not currently have a direct businessId; enforce the parent join. Do not claim that all models already have businessId.

## Required hardening migrations

1. Payment: immutable expected amount/currency/plan/cycle snapshot; provider transaction identity; fulfilledAt and immutable fulfilment record; safe lifecycle states.
2. Durable inbox/outbox: provider, deduplication key, event type, received/processed timestamps, retry count, safe error and minimal payload. Unique provider + event key.
3. Refresh/reset/verification token hashes and token-family metadata. Migrate active sessions deliberately or revoke with a user-visible sign-in requirement.
4. Website revision/public projection and domain ownership state when those features are implemented.
5. Explicit audit business scope and retention strategy. Do not cascade-delete operational financial/audit evidence blindly.

## Constraints and indexing

Enforce unique normalized email at the database layer (case normalization + backfill/collision audit before index change).
Keep existing tenant+slug unique constraints. Add/measure composite tenant + deletedAt + createdAt/ID list indexes for catalogue and leads; websiteId + order for ordered sections.
Use foreign keys and check constraints for nonnegative prices, valid currency and supported states. Cross-tenant category association needs explicit service validation or a compound foreign-key design.
Index referencing foreign keys and measured WHERE/JOIN predicates; avoid redundant indexes already covered by a unique constraint.
Use EXPLAIN ANALYZE on staging with representative data before claiming a speedup.

## Concurrency

Lock or conditionally update a pending payment inside a short transaction, insert its unique fulfilment, then update entitlement together.
Enforce item quotas or upload budgets atomically if introduced. Handle slug uniqueness collisions from concurrent signup; a prior existence check is insufficient.

## Migration procedure

Inspect deployed schema/migration history → take/verify backup → prepare additive migration → test on an isolated database → deploy compatible API → backfill → verify counts and constraints → remove obsolete fields in a later release.
No prisma db push/reset as a production deployment strategy. Preserve existing records and define rollback limits before schema changes.
