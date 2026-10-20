# Nexora subscriptions and premium templates — implementation audit

Audit basis: GitHub `main` at `8732327793615f7fd4c5bedae38001999e493343`, October 20 2026. This branch only implements the changes below. It does not constitute a production launch certification.

## What is implemented in this PR

- Nine documented and actually rendered design families: Basic `DEFAULT`, `MODERN_WHITE`, `BUSINESS_GREEN`, `PORTFOLIO_LITE`; Premium `LUXURY_GOLD`, `FASHION_BLACK`, `RESTAURANT_RED`, `TECH_STARTUP`, `CREATIVE_STUDIO`.
- Gallery has mobile-responsive distinct visual samples, industry filters, selection and honest Premium locking.
- Premium selection requires `plan=PREMIUM`, `status=ACTIVE`, and `currentPeriodEnd > now`. Trial and Basic can use Basic designs. Unknown templates fail closed.
- The selection check executes INSIDE the same database transaction as the theme update, serialized using the subscription row. Frontend hiding is not trusted.
- Public site publication, public SSR reads, legacy public theme configuration and sitemap must also pass the current Premium entitlement check, including after downgrade/expiry. Owner preview may still render saved content, but no public Premium entitlement is granted.
- Added bounded (20 transactions) owner-only billing-history projection without raw metadata, API keys, card data or provider authorization tokens.
- Existing subscriptions can request cancellation even if new checkout is disabled; actual provider confirmation remains asynchronous, with an auditable event.
- Themes API descriptors now use the shared canonical catalogue, while seeded color/spacing metadata remains available where seeded.
- New theme families have differentiated nav typography, media geometry, editorial layout, cards and section styling. Owner Light/Dark preference remains independent of storefront design.
- Tests added for invalid premium write, downgrade public denial, trial/expired entitlement, history isolation and cancellation.

## Not yet a complete paid SaaS launch

1. Paystack live checkout remains intentionally blocked on `main`; PR #14's earlier live-code gate has NOT been merged. Do not force a live key into the current runtime.
2. No real Paystack sandbox end-to-end purchase/renewal/cancellation evidence, payout/tax/refund support policy approval or chargeback resolution workflow yet.
3. No official downloadable tax invoice / PDF receipt functionality; payment history is a ledger view, not legal invoicing.
4. Recurring recovery currently relies on an in-process timer. Production requires a persistent worker/cron, alerting and retry monitoring; free Render is unsuitable for reliably processing paid renewals.
5. Production Neon schema has not been migrated or backup-restore tested; do not connect the public frontend to that incomplete API.
6. Premium feature claims such as custom domains, staff roles and advanced analytics remain unreleased. Premium template purchase remains disabled in the UI pending production billing readiness.
7. Need real browser/device acceptance for nine storefront styles with customer content, WCAG contrast, responsive 320px–1920px layouts, image loading and accessible navigation.

## Next release conditions

- Bring forward and adapt the Paystack live-gate changes with Neon Object Storage configuration, not Cloudinary.
- Complete direct-provider Paystack tests: first purchase once, callback/webhook replay, renewal invoice, accidental duplicates, cancellation status, network failure, dispute/refund review. Verify exact NGN amount, plan code, currency and idempotent transaction records.
- Approve Basic/Premium commercial pricing, tax, refund terms and storage/traffic quotas before publishing an offer or accepting live payment.
- Implement and verify independent production jobs for reconciliation, overdue subscription updates and deletion/retention.
- Test subscription downgrade before and after a paid period ends: premium public views must cease without leaking data. Re-enable only when a verified Premium entitlement returns.
- Migrate a separate production Neon DB through reviewed Prisma migrations, exercise restore, verify Brevo and storage in production and use explicit domain promotion.

References: `docs/RECURRING_BILLING.md`, `docs/LIVE_ROLLOUT.md` (in PR #14), `docs/PUBLIC_WEBSITE.md`, `docs/PRODUCTION_SCHEMA_GATE.md` (PR #17).
