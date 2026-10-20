# Nexora production schema release gate

As of 20 October 2026 the dedicated Neon production project `purple-night-06010146` has an empty `nexora` PostgreSQL database. The Render production API reports missing `subscriptions` and `account_mails` tables.

## Required path

1. Review all committed Prisma migrations in `apps/api/prisma/migrations` in order, including the token-expiration and account-mail data cleanup in `20261018000000_verification_codes`.
2. Test `prisma migrate deploy --schema apps/api/prisma/schema.prisma` using a **direct** connection against a disposable branch of the production Neon project. Do not use the preview project as a substitute.
3. Confirm all migrations succeed; verify the new `_prisma_migrations` ledger and all expected tables. Reconcile the released Prisma client with the schema.
4. Create a documented backup/restore point and get production rollout approval.
5. Run the same reviewed Prisma migration command with a direct production connection from a trusted, ephemeral job; do not put DB passwords into the repository, terminal transcript, tickets or `NEXT_PUBLIC_` variables.
6. Confirm the production Render API has the production database URL, dedicated secrets, and no missing-table log errors. Test login, OTP, media and billing read-only checks before connecting Vercel Production.
7. Keep `PAYSTACK_LIVE_ENABLED=false` and `PUBLIC_PUBLISHING_ENABLED=false` until separate provider acceptance.

This UI PR does not run production migrations or deploy the unfinished production API.
