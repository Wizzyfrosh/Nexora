# Account security and recovery rollout

## Delivered

Email addresses normalize before lookup and creation. Session, verification and reset tokens are 256-bit random, purpose-prefixed values. The database stores only SHA-256 digests of bearer tokens. Reset and verification consumption lock the user and claim the token atomically; expired, superseded, wrong-purpose and reused links fail. Password reset changes the hash, invalidates other reset links and revokes all refresh families in one transaction.

Access JWTs include a session-family ID. Every authenticated request checks a current, unrevoked, unexpired family against PostgreSQL. Logout revokes that family; reset revokes every family. Refresh rotation creates a distinct token atomically with an absolute family expiry (default seven days, configurable maximum 30 days). Reuse of a consumed refresh token revokes its whole family, including the newest access token. Legacy JWTs without a family are rejected. Access lifetime is bounded to 15 minutes and remaining family time; cookie durations follow those actual limits.

Concurrent refresh deliberately follows strict reuse detection: one may return success, but the detected replay revokes the family and forces sign-in. The browser client single-flights refresh, uses Web Locks for cross-tab serialization when available, and retries a rejected private request only once. Older browsers without Web Locks can require sign-in after simultaneous cross-tab refresh. No automatic retry of failed business writes except a 401 rejected before authorization.

## Email delivery

Signup queues verification when configured; signed-in owners can resend to their own stored address. Recovery always returns a generic response, whether the account exists, cooldown applies or email is unconfigured. SMTP is not called in the request path. A per-user, per-purpose 60-second database cooldown prevents repeated issuance across instances. Recovery is not proof that an address is registered or that an email reached an inbox.

Issuance and an encrypted outbox row commit together. Raw link tokens are AES-256-GCM encrypted with an independent key and identity/purpose/hash-associated data; they are never logged or returned by the API. Mail links use URL fragments so tokens are not sent in page URLs or Referer headers. Link pages require explicit submission, not GET consumption, and clear the fragment after successful use. Untrusted request Host headers never determine links.

A running API worker polls every 15 seconds and claims up to five jobs with a two-minute lease. SMTP requires TLS and bounded timeouts. Delivery retries with exponential backoff, then REVIEW after five failures. Superseded/expired jobs are cancelled; ciphertext is erased on sent/cancelled/review outcomes. SMTP acceptance is not inbox delivery. A crash after provider acceptance can duplicate an email; tokens remain single-use. A hosted worker, monitoring and retention cleanup remain operational follow-ups.

## Configure privately

For hosts that block SMTP, optional `EMAIL_PROVIDER=brevo` uses Brevo's HTTPS API. See BREVO_SETUP.md for required API key, sender, encryption key and acceptance checks. SMTP remains the default when EMAIL_PROVIDER is unset. Provider acceptance is never proof of inbox delivery.

Set the API environment: SMTP_HOST, SMTP_PORT (normally 587 STARTTLS or 465 TLS), SMTP_USER, SMTP_PASS, EMAIL_FROM (an authorized sender), EMAIL_TOKEN_KEY, and the exact FRONTEND_URL. No specific paid provider is required; use a provider that supports authenticated TLS SMTP. Never use an email inbox password when the provider requires an SMTP/app credential.

Generate EMAIL_TOKEN_KEY locally with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the result private, independent of JWT keys, in the API secret manager; do not paste it into chat or commit it. Preserve the key while pending messages exist. Changing it makes those messages unreadable; invalidate pending jobs and request new links under an approved rotation procedure. SMTP configured in production requires a valid 64-hex key, sender and credentials at startup. Missing SMTP leaves signup/login usable, but recovery delivery remains unavailable and a launch blocker. The signed-in resend screen reports unavailability honestly.

Verify in staging with a controlled recipient: signup → SMTP queue drains → inbox link → explicit verification → login → forgot password → inbox reset link → reset → old password/session fails → new login succeeds. Test spam/bounce handling and deployed browser cookies across the actual frontend/API domains. No actual SMTP message was sent by this task; automated tests substitute the transport.

## Migration cutover

20261016000000_account_security adds the mail outbox and session-family index. It intentionally invalidates and removes the raw value of every legacy refresh/verification/reset token. Accounts, passwords, business data and payment history remain intact. Existing owners must sign in again and request fresh links. Schedule an announced maintenance cutover: backup, stop old API writers, review/apply migrations, deploy new API/web together, then smoke-test. Do not run old and new session implementations against the same database during cutover. Existing-database baseline adoption remains in BILLING_ROLLOUT.md. No production migration was performed here.

## Remaining gates

Real SMTP delivery, sender/domain authorization, alerting/retention and deployed cookie topology need validation. Media upload ownership remains the other M3 slice. Verification gating for public publishing belongs in the public-renderer milestone; this change does not claim that an unverified account cannot access every feature. Distributed abuse controls, MFA and session-management UI are later work.

Primary references checked 16 October 2026: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html and https://nodemailer.com/smtp
