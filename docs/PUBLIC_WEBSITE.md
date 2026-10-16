# Public websites and publishing

Implemented 16 October 2026. This is a reviewable pilot slice, not launch approval.

## Released owner-to-visitor flow

1. Register and verify the owner account using the existing account flow.
2. Save actual business details and verified public catalogue images. Add real products/services in the existing catalogue screens.
3. In My website, edit/reorder up to five sections: Hero, About, Products, Services and Contact. Hero and Contact are required for publication. Unsupported legacy layouts are preserved until the owner explicitly prepares and saves a replacement.
4. Choose a released preset in Appearance: Default, Modern White, Business Green or Portfolio Lite. These share the catalogue renderer with bounded colour and shape/typographic variants; they are not the fictional homepage concept gallery.
5. Open the authenticated, noindex preview of saved content. Enquiry submission is disabled there.
6. When an operator has approved the launch gates and enabled publishing, publish the saved site at `/@slug`. A visitor can browse the paginated catalogue, use structured phone/email/WhatsApp links, or submit an enquiry. The existing owner Enquiries inbox reads the saved record.
7. Unpublish at any time. New public requests also deny expired/suspended/past-due or deleted subscriptions, deleted businesses/websites, and unverified/deleted owners.

Saving sections, appearance or business details edits the currently published website immediately. There is no separate draft revision or publish-history/rollback system. Unpublish before preparing changes that must remain off the public website. Already downloaded pages/images cannot be recalled.

## Contracts and boundaries

| Route | Access and behaviour |
| --- | --- |
| `GET /api/v1/storefronts/:slug?page=1` | Public, explicit Storefront DTO; unavailable sites return 404; no-store. |
| `GET /api/v1/storefronts/sitemap` | Public eligible slugs only; no-store, bounded pilot list. |
| `GET /api/v1/businesses/:id/storefront/preview` | Authenticated owner/tenant; private, no-store; preview ignores publication/entitlement but still validates released content and image ownership. |
| `GET /api/v1/businesses/:id/storefront/publication` | Owner-only publication setting and actionable prerequisite reasons. |
| `PUT /api/v1/businesses/:id/storefront/publication` | Owner-only, exact boolean `published`, configured Origin, atomic update/audit. |
| `POST /api/v1/businesses/:id/crm/leads` | Public-access guard plus transactional recheck, bounded input, honeypot and 100 enquiries/tenant/hour cap. Returns only receipt ID. |

Generic business-profile updates reject `isPublished`, including false. All callers must use the dedicated publication action. Existing public profile/catalogue/CRM guards now also require verified, nondeleted owners. **Cutover changes access for previously published unverified accounts**; inventory and notify those owners before rollout. No production data was changed automatically.

Publication serializes with billing's subscription row and the tenant row; no network calls run inside that transaction. The renderer reads business, entitlement, website and bounded catalogue data inside one repeatable-read transaction, with a current-clock expiry recheck before returning. An in-flight snapshot may finish after a concurrent edit/revocation; later requests re-evaluate access. No cross-request content cache is used. Tenant guards and scoped persistence remain mandatory; preview is not a public bypass.

React renders plain escaped text, not arbitrary HTML/CSS/scripts. A shared runtime allowlist rejects unsupported/duplicate section types and unknown content keys. Hero buttons use local section anchors only. Image URLs must be present in this tenant's nondeleted READY registry. Legacy unverified branding/catalogue images are omitted; unverified section images fail closed. Cloudinary URLs remain public assets, even before publication; this is not confidential media storage.

Public DTOs exclude owner identity, subscription/billing records, session data, audit logs, domain configuration and private lead data. Published business contact details are intentionally public. Public visitors do not probe owner authentication or attach cookies to enquiry requests. API/Next reads are no-store, but unpublishing cannot erase external copies or a visitor's existing browser history.

## Bounded pilot behaviour

- Catalogue page size is 50 products and 50 services, with stable featured/id ordering, explicit totals, and previous/next page links. A shared page parameter advances both lists; pages must be integers 1–10000. Preview shows the first page. No checkout, cart or inventory reservation is claimed.
- At most 20 image references per catalogue item and 100 READY registry rows are read; the media subsystem enforces a 100-file tenant quota.
- Sitemap considers the first 100 currently eligible businesses and filters supported content/media. This pilot cap must be replaced with segmented/cursor-generated sitemaps before a larger rollout; it is not a complete large-tenant sitemap system.
- Existing application throttles remain process-local. The DB tenant/hour enquiry cap is shared across instances, but distributed IP/bot escalation, retention/erasure tooling, abuse monitoring and contact-delivery alerts remain launch work. The form saves an enquiry; it does not send email notifications.
- Social links/working hours remain stored settings but are not rendered in this five-section release. Custom domains, testimonials, staff roles, analytics and premium layouts are not released here.

## Configuration and rollout

`PUBLIC_PUBLISHING_ENABLED` is an API-only switch, default **false**, accepting exactly `true` to enable new publish actions. It does not globally disable reads of already-published eligible rows, and it never blocks owner unpublishing. It is not a substitute for unpublishing existing sites. No deployed switch was changed.

`SITE_URL` is the web server's canonical origin, without a trailing slash. Use the correct HTTPS origin in an approved deployment. If absent/invalid, business metadata is noindex and the sitemap emits no entries rather than inventing canonical URLs. `NEXT_PUBLIC_API_URL` remains the public API base including `/api/v1`; no secrets belong there. Verify exact frontend/API CORS and cookie topology in staging.

The installed Next version can pass `%40slug` to the page and `@slug` to metadata. One-time decoding plus a strict handle allowlist normalizes both; traversal, malformed and double-encoded handles are rejected. Server metadata/page reads share request-local cached lookups; content is not reused across visitor requests.

No schema migration or dependency change is introduced by this slice. It depends on the preceding media/account/billing branches and their five additive migrations. Review that stack in order. Do not merge/deploy automatically.

Before enabling publishing: resolve the P0 billing/dependency acceptance items, verify real SMTP and Cloudinary staging delivery, review legacy content/account cutover, use real owner content for the complete register → verify → upload → preview → publish → contact → inbox → unpublish journey, confirm expiry/deletion and direct public API denial, and approve privacy/support/abuse operations. See VERIFICATION.md for executed evidence and remaining limits.
