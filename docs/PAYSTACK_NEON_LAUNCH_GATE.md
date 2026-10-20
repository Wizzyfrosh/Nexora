# Nexora — safeguarded Paystack launch integration

Status: Code preparation only. This does not approve public charges or switch payment providers to live credentials.

## Source of truth

This branch targets the merged nine-template storefront and corrected light/dark UI on `main`. It supersedes the stale Cloudinary-specific launch branch (#14) but does NOT merge it.

- `PAYSTACK_LIVE_ENABLED` is **false by default**.
- Test credentials (`sk_test_...`) still permit non-real sandbox checkout.
- Live credentials (`sk_live_...`) permit NEW checkout only when the explicit switch is on, NODE_ENV is production and FRONTEND_URL matches `https://nexora.froshcodeorbit.site`.
- Unreleased Premium checkout is rejected on the NestJS backend, not only visually hidden in the billing UI.
- Paystack recurring subscription evidence must match the API's test/live credential domain. Matching email or amount alone does not authorize a subscription.
- Existing subscription cancellation, verification, webhook receipt and provider recovery remain accessible after new checkout is paused, subject to their own authenticated/verified checks.
- Publishing still requires **Neon Object Storage**, not Cloudinary, when PUBLIC_PUBLISHING_ENABLED is true.
- Paystack secret keys are never placed in browser env vars, GitHub commits or API responses.

## Provider and operations blockers

1. Separate production Neon DB must pass reviewed Prisma migrations, backup and restore; production currently lacks schema.
2. Production Render API requires isolated secrets, paid always-on capacity and a tested durable recurring reconciliation job, with alerts for REVIEW/retries and backlog.
3. Controlled Paystack sandbox must exercise first purchase, duplicate callback/webhook, invoice renewal, provider timeout, mismatch rejection, cancellation and cancellation confirmation.
4. Confirm approved Basic annual price and plan code in live Paystack; Premium annual price and terms remain unreleased.
5. Verify Brevo OTP/reset, secure cookie/CORS behavior, Neon image upload/download/delete, Vercel production API upstream, website expiry/unpublish and owner access.
6. Approve refund/chargeback support policy, merchant verification, Nigerian tax/invoice approach, monitoring, alerts, rate limits, privacy and business onboarding terms.
7. Flip PAYSTACK_LIVE_ENABLED only through the production secret manager after approval. Start with an internal account, verify settlement and recovery before wide rollout.
8. Rollback flag stops NEW checkout only. Existing recurring agreements may still charge: provide verified cancellation and support; don't claim turning a flag off terminates provider subscriptions.

## Required environment (production server only)
```dotenv
PAYSTACK_LIVE_ENABLED=false
PUBLIC_PUBLISHING_ENABLED=false
FRONTEND_URL=https://nexora.froshcodeorbit.site
PAYSTACK_SECRET_KEY=SET_IN_PRIVATE_RENDER_SETTINGS
NEON_STORAGE_BUCKET=nexora-public
AWS_ENDPOINT_URL_S3=SET_TO_PRODUCTION_NEON_ENDPOINT
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=SET_IN_PRIVATE_RENDER_SETTINGS
AWS_SECRET_ACCESS_KEY=SET_IN_PRIVATE_RENDER_SETTINGS
```

Do not deploy live flags, production database migrations or Paystack live secrets automatically with this PR.
