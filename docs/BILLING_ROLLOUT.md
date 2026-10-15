# Payment hardening rollout and recovery

## Delivered slice

Known initial annual purchases use a server-generated reference and immutable price/customer/plan/cycle snapshot. Purchase creation enqueues reconciliation in the same transaction, before the external call. Provider calls have an eight-second timeout; timeout does not delete the purchase. Owner-only verification checks provider success, amount in kobo, currency, reference, customer email/code, metadata cross-check and paid timestamp. Historical rows without snapshots cannot auto-grant service.

Fulfilment locks the subscription, rereads the payment and writes the unique provider transaction ID, fulfilled timestamp and entitlement in one short transaction. Duplicate deliveries do not change dates. Separate same-plan purchases extend serially; active plan changes and suspended subscriptions require review. Terms start at provider paid time or the existing paid end, whichever is later. Cleanup checks expiry within the write so it cannot overwrite a renewed term.

Exact raw-body HMAC-SHA512 and constant-time comparison protect webhook receipt. Signed deliveries persist a minimal deduplicated inbox row before HTTP 200; receipt failure remains retryable. No card authorization or full provider payload is retained. Recovery polls every 15 seconds, claims up to ten due rows with a two-minute lease, retries up to eight times with bounded exponential backoff, then moves unresolved rows to REVIEW. A process restart leaves work durable. Multiple instances can claim work; fulfilment remains idempotent even on lease redelivery. Keep a running API instance for recovery; the timer is not a hosted scheduler.

## Closed launch gates

Checkout rejects all keys except sk_test_ credentials. No live checkout has been enabled or exercised. Genuine Paystack sandbox checkout still requires the owner's test account, matching annual provider plan code/price and a reachable webhook. Automated integration tests mock provider transport, not PostgreSQL or authentication.

Recurring renewals with unknown references, subscription lifecycle, refunds and disputes are retained for review; they cannot grant access or prematurely suspend already-paid time. The inbox records provider object IDs when available for operator lookup. authorization_code is never saved as paystackSubscriptionId. Automatic subscription-code mapping and lifecycle processing remain a later billing slice. A REVIEW row is not a completed refund/cancellation. Do not remove the live guard before these policies, monitoring, staging exercise and launch approval exist.

## Migrations

The repository previously had no migration history. 20261015000000_baseline represents the exact pre-billing schema; 20261015010000_payment_safety adds nullable purchase snapshots, fulfilment/provider-transaction uniqueness and the inbox. Existing payment records are preserved and require manual review rather than guessed snapshots.

For an **empty development/test database**, prisma migrate deploy applies both migrations. CI applies them to disposable PostgreSQL 16 and checks schema drift.

For an **existing database**, take a backup and compare its schema to the baseline. Do not blindly run the baseline or use reset/db push to fix drift. After review confirms a matching baseline, an authorized operator can adopt history with `prisma migrate resolve --applied 20261015000000_baseline` and apply the additive migration with `prisma migrate deploy`. Run from apps/api using an explicitly selected database. Resolve schema differences before adoption; deployments with different history need a reviewed plan. No production migration was run.

## Operator recovery

Monitor payment_events for overdue PENDING rows, REVIEW rows and increasing attempts; alert on generic billing-recovery warnings. Alert wiring/admin UI remain open. Inspect provider object/reference in Paystack and compare the purchase snapshot. Never log provider payloads or secret keys. Restore provider/database availability to resume pending work. For a reviewed known purchase, resetting its inbox row to PENDING with attempts zero and nextAttemptAt now safely re-verifies it. Fulfilled purchases never extend again. Do not edit snapshot prices/tenants or backfill legacy rows without audited financial reconciliation.

References checked 15 October 2026: https://paystack.com/docs/payments/webhooks/ and https://paystack.com/docs/payments/verify-payments/
