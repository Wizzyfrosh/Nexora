# Application flows

## Owner

Homepage → register → API creates identity/business/trial → dashboard.
Current registration/login consume cookies via AuthContext. Email verification UI/delivery remains incomplete.
Dashboard → profile settings → products/services → appearance → website setup → future authenticated preview → eligible publish.
A saved profile/theme is not yet a live public site. The website setup page communicates that boundary.

## Returning owner

Login → /auth/me → authorized dashboard → API-derived counts → manage catalogue/enquiries.
On failed authentication show an error; do not navigate to dashboard. On API failure show retry without overwriting saved content.
At expiry retain dashboard access; show subscription status and billing path. Do not wipe catalogue records.

## Visitor (required future release)

Open /@slug → check publication + entitlement → render business profile/catalogue → WhatsApp deep link or validated contact form → confirmation.
Do not expose business owner email/session data merely because the visitor knows a slug.
Unknown/unpublished/expired tenant must never render cached previous content. Use a consistent unavailable response and noindex policy.

## Payment

Owner chooses plan → API persists expected purchase → Paystack hosted checkout → browser redirect returns pending confirmation → signed event/verification fulfils once → refreshed subscription.
A closed browser tab must not prevent fulfilment. Duplicate callbacks must not extend a term twice. Failed verification must remain pending/failed with recovery instructions.

## Removal and unpublish

Owner unpublishes → access gate denies immediately → cached projection purged → sitemap updated.
Catalogue deletion removes it from owner/public lists; attached media cleanup occurs only after reference/ownership checks.
Account deletion is a separately authenticated, confirmable operation with retention rules for financial/audit records.

## Responsive behaviour

Homepage uses mobile menu, usable CTA targets and no horizontal overflow. Workspace uses desktop sidebar and mobile disclosure with overlay, labelled controls and Escape handling.
Forms keep input on provider errors, expose errors to assistive technology and prevent double submission while pending.
