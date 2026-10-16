# Recurring billing implementation

This continues the known-purchase safety work in BILLING_ROLLOUT.md. All automatic billing lifecycle processing currently requires provider test-domain evidence. Checkout and provider cancellation reject live keys. No live charges, refunds or production migrations were performed.

## Identity and renewal

Subscription-code mapping requires an exact fulfilled payment identity: a signed invoice's original reference, or the transaction ID on the subscription fetched from Paystack. Email/plan similarity is never sufficient. A create event arriving before initial fulfilment remains retryable. If the provider has no usable initial invoice evidence, mapping needs operator review and remains a launch blocker for that account. Do not guess, attach authorization codes as subscription IDs, or silently pick the most recent matching customer.

The immutable anchor payment supplies the price, currency, customer email, plan code and cycle. Provider subscription reads must agree with it, including customer code, annually interval and test domain. Invoice updates retain only allowlisted evidence, not card details, authorization codes, signatures or email tokens. Every paid renewal is independently verified through the transaction API. Metadata is optional for renewal; when supplied, tenant/plan must agree.

One transaction locks the subscription and writes renewal history plus entitlement. References, provider transaction IDs, invoice codes and subscription coverage-start timestamps are unique. Absolute invoice periods prevent replay from appending years. Older invoices cannot truncate newer paid access. Annual periods allow up to five minutes' boundary variation; inconsistent periods, prices, customer changes, plan changes and suspended accounts defer for review. Genuine provider fixtures still need staging validation before live billing.

Linked subscriptions enqueue a durable sync every 15 minutes. Sync verifies the latest paid invoice using provider invoice transaction identity and a separate transaction verification. This recovers the latest missed charge; it is not a full historical invoice export/backfill. Several missed cycles or unknown initial mapping require operator reconciliation. A continuously running API instance is required until a hosted worker is configured.

## Status and cancellation

Subscription lifecycle and invoice-failure events fetch the provider's current state. A monotonic provider updatedAt prevents an older fetched snapshot replacing newer renewal metadata. Renewal state is separate from entitlement status. Non-renewing, attention and cancelled states preserve paid time; shared public access still ends at the existing paid expiry. No grace period or automatic refund-related suspension is invented.

GET /subscriptions/:businessId/status exposes an owner-scoped projection. POST /subscriptions/:businessId/cancel-renewal stores an auditable durable cancellation intent and returns HTTP 202. Concurrent requests share the pending intent. The worker uses a freshly fetched email token only in memory, submits disable, then waits for a later read to confirm non-renewing/cancelled/completed state. Timeouts leave the intent recoverable; sending a request is not confirmation. Confirmed intent clears the active request flag while preserving the audit/inbox record. An externally re-enabled subscription can receive a new cancellation intent.

The billing UI displays real status, preserves verification retry, and includes a two-step stop-renewal action. It removes fabricated storage metrics, guaranteed renewal dates and claims that unreleased Premium features are active. Premium purchase is disabled in the UI. Opening another hosted checkout is rejected when a recurring subscription is already linked; provider plan switching/replacing agreements is not implemented.

## Migration and remaining gates

20261015020000_recurring_billing is additive: anchor FK, renewal metadata, invoice/coverage uniqueness and minimal inbox evidence. Old rows keep null evidence; they are never guessed into new mappings. Follow the existing baseline adoption instructions before applying migrations to an existing database. Test all migrations on a restored staging copy first.

Refunds/disputes remain REVIEW events pending the approved refund/access policy. There is no refund-issuance API or automatic financial reversal. Live activation also requires operator alerts, provider sandbox end-to-end exercise, policy approval and production scheduling/monitoring. Do not treat passing mocked provider tests as proof of provider payload behavior.

Primary contracts checked 15 October 2026: https://paystack.com/docs/payments/subscriptions/ and https://paystack.com/docs/api/subscription/
