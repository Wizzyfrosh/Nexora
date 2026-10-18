# Nexora Phase 13 — Staging acceptance

GitHub OTP PR #12 is merged and CI passed. Render preview reports the merged revision live. Vercel production still lists an older revision. A verified domain does not prove live email delivery.

## Read-only routing probe

From the repository root, run:

`NEXORA_TEST_ORIGIN=https://YOUR-STAGING-HOST node scripts/preview-pages.mjs`

This checks login, register and the expected six-digit verification screen. It does not create accounts or prove API connectivity, cookie behavior or inbox delivery.

## Manual release gate

Use a controlled staging mailbox to test signup, duplicate-email rejection, verification, expiry, resend, login/logout and password recovery in a real browser. Record only sanitized results.

Keep publishing, analytics and live checkout disabled until their independent release gates pass.
