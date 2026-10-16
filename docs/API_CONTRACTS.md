# API inventory and contract rules

Base: /api/v1. Current API envelope: { success, message, data }; apiFetch unwraps data.
This inventory identifies code, not verified production endpoints. Public tenant/expiry gates have been hardened and regression-tested; remaining payment flaws are documented in SECURITY.md.

## Existing route families

| Method             | Relative route                                                       | Boundary                                                      |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| POST               | /auth/signup, /auth/login                                            | Public, validated credentials; sets cookies                   |
| POST               | /auth/logout, /auth/refresh                                          | Session lifecycle; refresh may use refresh cookie             |
| GET                | /auth/me                                                             | Authenticated user and business summary                       |
| POST               | /auth/forgot-password, /auth/reset-password, /auth/verify-email      | Token flows; delivery/UI incomplete                           |
| GET                | /businesses/my-businesses                                            | Owner list                                                    |
| POST               | /businesses                                                          | Authenticated create                                          |
| GET / PUT          | /businesses/:businessId                                              | Private tenant-scoped profile                                 |
| GET                | /businesses/slug/:slug                                               | Public profile; shared entitlement policy                  |
| GET / POST         | /businesses/:businessId/products                                     | Private paginated list / create                               |
| GET / PUT / DELETE | /businesses/:businessId/products/:productId                          | Private single-item CRUD                                      |
| GET / POST         | /businesses/:businessId/products/categories/all, /categories         | Actual category routes differ by method/path                  |
| GET                | /businesses/:businessId/products/public/list, /public/slug/:slug     | Public catalogue; shared entitlement policy           |
| GET / POST         | /businesses/:businessId/services                                     | Private list / create                                         |
| GET / PUT / DELETE | /businesses/:businessId/services/:serviceId                          | Private single-item CRUD                                      |
| GET                | /businesses/:businessId/services/public/list, /public/slug/:slug     | Public services                                               |
| GET                | /websites/themes                                                     | Preset inventory                                              |
| GET                | /websites/:businessId                                                | Private config                                                |
| PUT                | /websites/:businessId/theme, /sections, /domain                      | Tenant config writes; sections saved atomically under parent scope      |
| GET                | /websites/public/:businessId                                         | Public config with shared policy and limited projection       |
| POST               | /businesses/:businessId/crm/leads                                    | Public form submission                                        |
| POST               | /businesses/:businessId/crm/track/whatsapp                           | Public click record                                           |
| GET                | /businesses/:businessId/crm/leads, /leads/stats, /leads/unread-count | Private owner reads                                           |
| PUT / DELETE       | /businesses/:businessId/crm/leads/:leadId/read, /leads/:leadId       | Mark read / delete                                            |
| POST               | /subscriptions/:businessId/initiate                                  | Private subscription checkout                                 |
| GET                | /subscriptions/verify/:reference                                     | Payment verification; ownership/fulfilment requirements apply |
| POST               | /subscriptions/webhook/paystack                                      | Provider signature boundary                                   |

## New/changed API requirements

Billing checkout accepts BASIC/PREMIUM only and a callback URL on the configured frontend origin. Only Paystack test keys can initialize checkout. Verification requires the saved purchase's business owner; foreign/unknown references return 404, unsuccessful/mismatched verification returns 400, provider unavailability returns 503. A successful replay returns recorded success without extending access again. Webhook HTTP 200 means durable receipt, not immediate fulfilment; processing runs from the inbox. See BILLING_ROLLOUT.md.

Define explicit DTOs for theme, typography, sections and domains. Runtime content DTOs now validate catalogue, lead and website input; section/theme service validators provide additional bounds. Provider upload ownership remains a separate feature.
Reject unknown properties, duplicate section IDs, unsupported section types, negative/NaN/oversized prices, unsafe URL protocols and cross-tenant foreign keys.
Public serializers return only business contact/catalogue data intended for display; never owner identity/password/token fields, private leads or provider/payment data.

## Pagination

Existing catalogue clients expect { data: [...], total, page, limit, totalPages } inside the API envelope.
Current catalogue/CRM service bounds enforce page >=1 (maximum 1000000), limit between 1 and 100, and stable ordering. Validate query values rather than relying on implicit conversion.
Return 400 validation errors, 401 authentication failure, 403 authorization failure (or consistent 404 resource concealment), 409 conflict, 429 throttling, 503 provider/dependency unavailability.

## Illustrative contract

GET /businesses/{authorizedId}/crm/leads/stats:

```json
{
  "success": true,
  "message": "Lead statistics retrieved",
  "data": { "total": 0, "unread": 0, "thisWeek": 0 }
}
```

Public lead capture now returns only { id }, and click tracking returns { recorded: true }; private visitor details are not echoed publicly.

Cookie-authenticated mutations must include the exact configured Origin. A browser's origin must be on the fixed web origin until verified custom-domain support is implemented.

Zero means a successful count of zero; unavailable must remain an error. Never convert failed count requests to invented zero statistics.

## Contract management

Generate OpenAPI from validated backend DTOs in a later task, save a reviewed snapshot, and check shared-types drift. Avoid maintaining an invented executable specification that claims unimplemented routes are operational.
