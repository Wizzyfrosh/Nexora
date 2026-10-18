# Account email over HTTPS

Status: optional Brevo transport implemented; no provider credentials configured or real email sent. Existing SMTP remains the default for compatible hosts. Existing account authentication and encrypted outbox are retained.

## Configure Nexora's API

1. In Brevo, verify the sender address/domain you want Nexora to use. Use an address you control.
2. Create a transactional API key in Brevo's SMTP & API settings. This must be an **API key**, not an SMTP key.
3. Open the Render service `nexora-api-preview`, Environment, and add the following privately:

| Variable | Value |
| --- | --- |
| EMAIL_PROVIDER | brevo |
| BREVO_API_KEY | Your private Brevo API key |
| EMAIL_FROM | The verified plain sender email, without display-name brackets |
| EMAIL_TOKEN_KEY | Independent 32-byte random key, encoded as 64 hex characters |
| FRONTEND_URL | Exact chosen frontend HTTPS origin; no path or trailing slash |

Generate the encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store it only in Render, never in GitHub source or chat. Keep it stable while encrypted jobs are pending. Do not reuse JWT secrets.

These variables belong on Render, not in NEXT_PUBLIC variables or the Vercel frontend. Set all values together and save/redeploy after this implementation is merged. Incomplete Brevo configuration fails production startup rather than accepting an unusable delivery configuration.

The current preview has Vercel access protection. A recipient needs access to that preview to open verification/reset links; temporary sharing links expire. Choose a stable approved frontend address and validate its access before inviting real users. Do not disable deployment protection merely to get a test link working.

## Acceptance test after configuration

Use a controlled test account and recipient. Request verification, observe provider acceptance, open the inbox link and confirm verification. Request a password reset, open the new link, reset once, and verify that the old password/session fails and the new password works. Reused/expired links must fail. A provider receipt is acceptance, not proof of inbox delivery.

The worker sends up to five messages per poll, with the existing leased, encrypted outbox and retry policy. Render free-service sleep can delay polling. A crash after provider acceptance can duplicate an email; tokens remain single-use. Continuous delivery, alerts, bounce handling and retention are still production gates. No exactly-once delivery claim is made.

## Provider contract

Fixed HTTPS endpoint `https://api.brevo.com/v3/smtp/email`, API-key header, text-only transactional content and a 10-second deadline. Redirects are rejected. Only HTTP 201 with a nonempty messageId counts as accepted. Errors are generic; provider bodies, keys, recipients and reset links are not logged. No new SDK dependency is needed.

Reference checked 18 October 2026: https://developers.brevo.com/reference/send-transac-email
