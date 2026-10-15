# Billing and entitlement specification

Payments are for Nexora owner subscriptions. Buyer checkout is out of scope.
Known-purchase hardening is implemented; live checkout remains blocked. See BILLING_ROLLOUT.md for exact delivered behavior, migration adoption, recovery and remaining recurring/refund launch gates. The lifecycle below is the complete target, not a claim that every provider event is automated.
Annual pricing from PRD.txt: Basic NGN 50,000; Premium NGN 120,000. Paystack amounts use kobo: 5,000,000 and 12,000,000 respectively. Snapshot expected prices server-side at purchase creation.

## Payment lifecycle (required)

1. Authenticated owner selects plan. Check business ownership, allowed plan and configured annual provider plan.
2. Persist immutable pending purchase reference, business/subscription, expected kobo amount, currency, plan and cycle. Use a collision-resistant reference.
3. Initialize hosted checkout with bounded timeout and an allowlisted callback URL. External-call failure is recoverable; avoid holding a DB transaction across the call.
4. Redirect returns only a “checking payment” state. The browser cannot grant a plan.
5. Webhook verifies HMAC-SHA512 of exact raw request bytes using Paystack secret key. Durably persist minimal event before acknowledging; invalid events rejected.
6. Verification compares provider success, reference, currency, amount, intended purchase and customer where applicable. Metadata is a cross-check, not the only tenant identity.
7. In a transaction, lock/claim the payment, assert unfulfilled, insert unique fulfilment and update entitlement once. Set fulfilledAt.
8. Duplicate delivery returns previous result. Concurrent redirect/webhook processing grants one term. An old event cannot overwrite a newer cancellation/suspension without policy reconciliation.

## Provider identifiers

authorization_code is a reusable payment authorization, not subscription_code. Store them separately with appropriate secrecy; prefer not storing authorizations unless actually needed.
Map subscription.create to the correct persisted purchase/customer. Process cancellation, renewal failure, refund/dispute and successful recurring charge through documented state transitions.
Don't suspend already-paid service immediately on cancel-renewal. Suspensions for abuse or payment reversal are separate.

## Entitlement decision

Published AND not deleted AND subscription exists AND:

- TRIAL with now < trialEndDate; or
- ACTIVE with currentPeriodEnd present and now < currentPeriodEnd.
  Use UTC server time. Any grace policy for PAST_DUE must be explicit; baseline denies public access.
  Expired/suspended/missing/invalid-date records deny public access. Dashboard access depends on identity, not paid entitlement.
  The daily expiry job is cleanup; it must not determine whether an expired site is publicly accessible.

## Recovery

Durable inbox stores receipt before 200. On DB receipt failure return retryable error. Acknowledge only after durable acceptance, not before.
Workers retry with backoff, dead-letter and alert. Reconciliation periodically queries known pending purchases and records discrepancies.
Refunds/disputes require an approved policy and audit. Never erase financial history to “undo” a payment.
No live keys or real charges in automated tests.

## Tests

Invalid signature/raw-body mutation; missing secret; mismatched amount/currency/reference; duplicate sequential/concurrent event; callback before webhook and reverse; expiry boundary; provider timeout; DB failure after receipt; unsupported plan; unauthorized tenant; out-of-order subscription event.
References: https://paystack.com/docs/payments/webhooks/ and https://paystack.com/docs/payments/verify-payments/
