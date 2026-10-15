# Privacy and data handling specification

This is an engineering policy proposal, not a published legal document or legal-compliance claim.

## Data map

Account: name/email, password hash, session records. Private by default.
Business public profile: selected business name/contact/address/social links and approved catalogue media/content.
Leads: visitor name, email/phone/message and source; private to authorized business operators.
Billing: provider references, amount/currency, status, period and audit history. Do not store card numbers or CVV.
Telemetry: bounded event types, resource/tenant IDs and coarse session identifiers; avoid raw IP storage unless operationally justified.
Media: provider ID, URL, size/type, owner and alt text.

## Access and disclosure

Separate account email from public business contact email. Public serializers must select fields explicitly.
Collect only what each form needs. Explain who receives an enquiry before submission.
Never send lead text or secret-bearing URLs to PostHog/session replay. Mask inputs and disable replay on auth/billing/private leads unless reviewed.
Provide a support path for access/export/deletion; verify identity and business scope.

## Proposed retention for approval

Expired reset/verification records: purge within 7 days after expiry; sessions within 30 days after revocation/expiry.
Raw analytics: 90 days, then aggregates; application logs 30 days.
Lead retention: business-controlled with a documented default, proposed 12 months.
Financial/security records: retention duration must be selected with applicable accounting/legal advice; do not auto-delete them with account cascades before that decision.
Backups retain their approved expiry; explain delayed deletion from backups.
These values are proposed requirements, not implemented cleanup jobs.

## Launch prerequisites

Confirm controller/processor responsibilities, operating jurisdictions, privacy notice, terms, consent/cookie behaviour, refund policy, abuse rules and provider agreements.
Inventory third parties: hosting, PostgreSQL, Redis, Cloudinary, Paystack, email and observability.
No claim of GDPR/NDPA compliance from this document alone; production policy needs qualified review against actual operations.
