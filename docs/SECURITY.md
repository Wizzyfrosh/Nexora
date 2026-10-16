# Security requirements and threat model

Scope: shared-business SaaS with account credentials, visitor PII, subscription entitlements and public content. Static review is not a penetration test.

## Threats and controls

| Threat                           | Required control                                                                                      | Required negative test                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Cross-tenant ID substitution     | Session actor + parent-scoped query for every nested resource                                         | Owner A supplies B's product/category/section/media ID; request denied; B unchanged                |
| Public draft/expired data access | Shared publication + current-time entitlement gate                                                    | Direct public URLs deny missing/deleted/unpublished/expired/suspended business                     |
| Payment forgery/replay           | Raw signature + provider verification + persisted expected purchase + unique transactional fulfilment | Invalid signature, changed amount/currency, replay and concurrent events cannot grant extra access |
| Session theft/CSRF               | Secure HttpOnly cookies, origin/CSRF checks, token rotation/revocation                                | Cross-origin state write rejected; revoked token rejected                                          |
| Stored XSS                       | Escape content, allowlist section schemas, safe href/src protocols                                    | Script HTML and javascript: URLs cannot execute                                                    |
| Upload abuse                     | Signed constrained uploads, verified file type/size, ownership and quotas                             | Foreign publicId, SVG script and oversized files rejected                                          |
| Abuse/spam                       | Per-user/tenant/IP limits and honeypot/bot escalation                                                 | Burst lead submissions bounded; normal visitors retain access                                      |
| Secret leakage                   | Fail-closed config, redacted logs, least privilege                                                    | Known defaults cannot start production; no secrets in client bundles                               |

## Audit findings and remediation status

1. **Addressed in tenant-safety follow-up:** repository now locks the parent and validates all IDs before a transactional replacement. Original finding: WebsiteRepository updates an existing section using where:{id:sectionId}; websiteId is not part of that write. Service removes sections before validating all incoming IDs. Validate membership first and replace all writes in one transaction.
2. **Addressed in tenant-safety follow-up:** shared policy checks deletion, publication, subscription existence/status and current expiry for all public boundaries. Original finding: Public BusinessService gates only selected status strings; require a nondeleted subscription, allowed status and unexpired server timestamps. Gate every public endpoint consistently.
3. Payment signing uses JSON serialization, not exact body bytes; compare decoded signatures with timingSafeEqual after validating length/format and require a configured secret.
4. Successful payments update subscription then payment without a shared transaction or fulfilment guard. Verify persisted reference, expected amount in kobo, NGN currency, intended tenant/plan/customer and provider status before an atomic fulfilment.
5. **Addressed in tenant-safety follow-up:** production configuration rejects missing/default/placeholder or identical JWT secrets and invalid database/frontend origins.

Payment findings 3/4 remain launch blockers. Media ownership, complete session-token hardening and deployed cookie topology remain open. Cookie writes now require the configured Origin; nonbrowser server requests without session cookies remain allowed. Public replies use explicit profile/catalogue projections; enquiry capture returns only a receipt ID. Unexpected database errors no longer expose their message to callers.
Database negative/rollback/concurrency checks run in an isolated PostgreSQL CI job; see VERIFICATION.md for actual execution status.

## Auth hardening

Store passwords with Argon2id and reviewed parameters. Normalize emails before both lookup and unique insert.
Rotate refresh tokens atomically, detect reuse, hash stored bearer tokens, revoke sessions on reset and keep access-token expiry bounded.
Use generic forgot-password responses and actual delivery. Bind reset tokens to account, expiry and single use. Do not log raw token links.
API subdomain and web domain should share a deliberately selected site topology. Current SameSite=Lax cookie configuration may fail with cross-site deployment hosts; CORS alone cannot solve cookie policy.
Require exact origin allowlist and anti-CSRF policy on state changes. Do not broaden cookies/CORS to arbitrary origins to fix authentication.
Require stronger administrator protection and auditable actions before exposing super-admin operations.

## Public content and SSRF

No arbitrary user-supplied scripts, raw HTML, executable SVG or custom CSS in MVP.
Allowed protocols: https for external media and safe contact links; tel/mailto/WhatsApp only through structured validators.
If server-side remote fetch is introduced: allowlist providers or block loopback/private/link-local networks and revalidate every redirect. URL syntax checks alone are insufficient.

## Release gate

Tenant-negative integration tests, webhook replay/concurrency tests, expiry/unpublish tests, secret scanning, dependency review, staging cookie test and backup restore exercise must pass.
Do not conflate passing unit tests with proof that these vulnerabilities are covered.

## References

OWASP tenant isolation: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
Paystack signature contract: https://paystack.com/docs/payments/webhooks/
Paystack transaction verification: https://paystack.com/docs/payments/verify-payments/
