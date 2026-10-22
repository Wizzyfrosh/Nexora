# OTP-first onboarding follow-up

Scope: client-side navigation and session-state ordering. This is not a production rollout.

## Changes
- After successful registration or login, unverified accounts navigate directly to /verify-email. Verified accounts navigate to /dashboard.
- The auth context increments a request revision before reading or changing authentication state. Results from earlier profile requests cannot clear a newer login or logout state.
- The initial profile lookup uses a stable callback so the effect does not depend on a changing function identity.
- Server-side verified-owner publishing rules, session cookies, password reset, email delivery, and business data remain unchanged.

## Acceptance
- Fresh signup goes straight to the OTP screen, with the user's actual email displayed.
- Unverified returning login goes to OTP rather than the dashboard.
- A verified login goes to the dashboard.
- A profile request started before signup/login/logout cannot overwrite the newer result.
- OTP submission persists verification; a subsequent authenticated profile refresh reflects it.
- Existing owner dashboard features remain accessible according to their current server-side policies.

## Release
Check the feature-branch GitHub Actions run, then test all three navigation cases with a controlled mailbox on staging. A green TypeScript/web build is not a real inbox, deployed browser, or production readiness test. Phase 13 staging/provider checks remain open. Do not enable live billing, public publishing, or analytics automatically.
