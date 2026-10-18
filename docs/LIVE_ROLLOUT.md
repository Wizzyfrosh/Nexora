# Nexora production launch: Paystack, publishing and catalogue media

Status: PREPARATION ONLY. Nothing here proves live operations or authorizes charging customers. Branch feat/live-release-gates introduces disabled-by-default support.

## 1. Current architecture and deployment separation

- Preview API: Render nexora-api-preview in Frankfurt, connected to preview Neon database. DO NOT use this preview database for production billing.
- Web: Vercel project nexora, with verified nexora.froshcodeorbit.site. The production-target deployment has older code; API_UPSTREAM_URL is presently configured only for Preview.
- Use a separate production Neon database with explicitly verified migrations, a separate always-on production API/worker and isolated production secrets.
- Live payment recovery, renewals, email outbox and media deletion cannot depend on a free service that may sleep. Add a durable scheduler, queue backlog alerts, and a restore-tested backup before taking payment.
- Keep PUBLIC_PUBLISHING_ENABLED=false, PAYSTACK_LIVE_ENABLED=false and ANALYTICS_ENABLED=false until each independently approved gate passes.

## 2. Storage account setup (Cloudinary)

1. Open https://console.cloudinary.com and create or select a dedicated Nexora product environment.
2. Open Console Settings > API Keys (the exact labels may change). Locate the Cloud name, API key and API secret; rotate if exposed.
3. In the production Render API service's private Environment page, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Never put the API secret into Vercel NEXT_PUBLIC_ values, browser code, source control or ChatGPT messages.
4. After an approved deployment, sign in as a verified test owner. Upload a small PNG or JPEG through the existing owner Media picker, then verify WebP output, the stored READY asset, CDN delivery, ownership attachment, and deletion of an unreferenced asset. Retry/provider-outage behavior and orphan-cleanup processing must be observed.
5. Images are PUBLIC CDN objects even for unpublished businesses. Do not upload identification documents, financial records or other private media. A storage credential shape check alone does not prove upload success.
6. Leave publishing disabled if credentials, CDN delivery, image cleanup monitoring, or tenant boundaries fail.

## 3. Live Paystack account and annual plans

1. Open https://dashboard.paystack.com and finish required business verification and settlement setup. Switch to Live Mode only after test checkout acceptance.
2. Under Plans, configure the approved annual NGN Basic plan at the confirmed commercial price, with interval annually. The proposal is NGN 50,000/year; do not charge until actual pricing, refund terms, taxes, support and fair use are approved. Premium is still unreleased and must remain unavailable.
3. Save the actual LIVE Paystack plan code against the Basic plan record in the dedicated production Neon database after verifying plan ownership, amount (5000000 kobo), NGN currency and interval. Do not copy a test-mode plan code to production.
4. Set PAYSTACK_SECRET_KEY only in the production API secret manager. Paystack webhook HMAC uses this same secret key; PAYSTACK_WEBHOOK_SECRET is not used by the current signature validator. Do not paste the secret in tickets, source or public env values.
5. Register a production HTTPS webhook pointing to the production API endpoint: https://YOUR_PRODUCTION_API_HOST/api/v1/subscriptions/webhook/paystack. It must reach the backend directly; do not route it through a protected Vercel preview. Verify Paystack signatures over the RAW body before acknowledging durable receipt.
6. Before enabling the feature, use Paystack test credentials and a separate test plan for a real sandbox purchase. Confirm a single paid entitlement from callback/webhook/reconciliation, renewal evidence mapping, cancel renewal, refund/dispute review handling, and provider-timeout/retry. Verify event backlog alerts and restoration after worker restart.
7. Only after the operator accepts the provider evidence and support/refund policy, set PAYSTACK_LIVE_ENABLED=true on the separate production API service with NODE_ENV=production, matching live secret key and FRONTEND_URL=https://nexora.froshcodeorbit.site. Do not set this flag on preview.
8. Initially restrict live charging to a tightly controlled internal owner. Check Paystack Dashboard transaction amounts and the database's purchased plan, provider reference, unique fulfilment, coverage dates and audit records. Require a verified reversible operational plan before opening registration and billing to the public.
9. The feature flag guards NEW checkout, not charges from existing recurring subscriptions. To stop recurring charges, process cancellation with provider confirmation; turning the flag off does not disable an existing Paystack agreement.

## 4. Public website publishing

1. In Vercel Production, set NEXT_PUBLIC_API_URL=/api/v1 and API_UPSTREAM_URL=https://YOUR_PRODUCTION_API_HOST/api/v1. Set SITE_URL=https://nexora.froshcodeorbit.site. Treat API_UPSTREAM_URL as server-only.
2. In the separate production Render API, set FRONTEND_URL exactly to https://nexora.froshcodeorbit.site, with dedicated production DATABASE_URL/JWT/email/storage secrets. Validate deployed login, Secure/HttpOnly cookie behavior and foreign-Origin rejection.
3. Verify Brevo OTP delivery and password reset using a real inbox. Confirm an approved owner can upload a Cloudinary asset, save catalogue entries, preview a site and read enquiries.
4. Review existing published legacy rows and their owner/email verification before cutover. PUBLIC_PUBLISHING_ENABLED only gates new publication, not already-published eligible reads.
5. After the acceptance checklist, set PUBLIC_PUBLISHING_ENABLED=true ONLY on the production API. New publish requests remain tenant-scoped and require a verified owner/current entitlement.
6. Test a complete owner and visitor journey: publish /@businessSlug; anonymous read; enquiry submission; CRM receipt; unpublish; expired/suspended/deleted owner denial. Confirm canonical metadata, sitemap, and no-cache rules.
7. Cloudinary public image URLs can remain accessible after unpublishing. Use only genuinely public catalogue/branding assets.

## 5. Required release checklist

- GitHub CI for the current release revision is green, including real isolated PostgreSQL tests; production/staging revisions are documented.
- Dedicated production Neon database, audited migrations, backup and restore exercise.
- Vercel production frontend and separate persistent API, exact origin, webhook availability, TLS and cookie checks.
- Cloudinary real upload, CDN read, ownership checks, and durable cleanup worker.
- Paystack sandbox end-to-end purchase and cancellation, live plan provenance, retry/replay tests and operator alerts.
- Brevo inbox OTP/reset test, privacy/support/refund/tax/fair-use rules, rollout and rollback contacts.
- Explicit final approval before flipping either paid-live or public publishing flag.

## Safe rollback

- Set PAYSTACK_LIVE_ENABLED=false to stop NEW live checkout; inspect any existing recurring agreements and actively confirm cancellations when necessary.
- Set PUBLIC_PUBLISHING_ENABLED=false to stop NEW publication, then unpublish existing public sites individually where needed.
- Do not reset production tables. Preserve the payment event inbox for reconciliation, restore compatible app builds, and address already-processed payments with an audited review.

References: docs/BILLING_ROLLOUT.md; docs/RECURRING_BILLING.md; docs/MEDIA_SECURITY.md; docs/PUBLIC_WEBSITE.md; docs/OPERATIONS.md.
