# Secure catalogue media

## Implemented flow

Verified owner → tenant-scoped multipart POST `/businesses/:businessId/media` → bounded decode and re-encode → signed server-to-Cloudinary upload → verified provider response → READY registry row → save a registered URL on owned content. No upload signatures or Cloudinary secret are exposed to the browser; no client-supplied public ID, filename, URL or provider metadata is trusted.

This deliberately uses API bandwidth/CPU rather than direct-to-provider browser grants. The API checks MIME and magic bytes before invoking the decoder; only JPEG, PNG and WebP are allowed. Input/output ≤5 MiB, decoded input ≤12 megapixels, no APNG/multipage animation. Sharp strips metadata and produces a new WebP. Two upload requests per API process are allowed concurrently before multipart buffering; overload returns 503. Existing global rate/origin/session guards still apply. A Cloudinary request has a 20-second deadline and redirects are rejected.

The server signs exact random tenant-prefixed public IDs, overwrite=false, image-only endpoint, WebP allowlist and timestamp using SHA-256. The authenticated HTTPS response must match the expected ID, resource/delivery type, format, bytes, dimensions and positive version. The API constructs the canonical HTTPS URL; it does not persist a browser URL. Failed/ambiguous uploads retain a durable cleanup record and quota reservation.

## Storage is public, not a private document vault

This slice is for public catalogue/branding images only, as stated beside the file input. Cloudinary upload delivery URLs can be accessed by anyone who knows the URL, including before a business publishes. API tenant/private routes remain authenticated, but URLs are not access-control tokens. Do not upload IDs, confidential documents or private photos. API publication gates do not revoke CDN URLs. Private media or revocable signed delivery requires a separate authenticated-delivery design before supporting that use case. No confidentiality guarantee is made here.

## Ownership, quota and attachment

Media registry states: PENDING → READY → DELETING → DELETED; failures after five cleanup attempts move to REVIEW. Existing records default to LEGACY and are not silently verified. No existing content or media is deleted by the additive migration.

The tenant row serializes quota reservations, READY claims, attachment validation and deletion decisions. There is no provider/network call inside a DB transaction. Technical pilot guardrails: 100 files / 250 MiB per business, including pending, legacy and failed-cleanup records; each pending upload reserves the full 5 MiB. These are abuse limits, not a newly advertised paid-plan entitlement.

Product/service create and image replacement, business logo/banner saves and media-bearing section writes require exact READY URLs owned by that business. They cannot attach arbitrary external URLs or another tenant's asset. Gallery replacement is transactional. Section content is not a general-purpose arbitrary renderer: media-key checks complement the existing content validator; M4 must still introduce explicit section schemas before public rendering.

Deletion refuses assets referenced by products, services, branding or media-bearing sections. The tenant lock prevents an attachment/deletion race. Remove references and save first, then delete from the library. Deleted/queued assets cannot be attached again. Catalogue images shared by several records are not destroyed automatically when one record is removed.

Legacy URLs remain visible on existing content but cannot be resubmitted as verified attachments. Re-upload legacy assets through this flow or clear their references before editing galleries/branding. Production rollout must inventory legacy content; do not mark imported rows READY without provider/ownership verification.

## Cleanup and operations

A running API polls every 15 seconds, claims at most five jobs with two-minute leases and uses idempotent signed destroy requests with CDN invalidation. Expired PENDING rows become cleanup work after 15 minutes. Ambiguous upload failures retain that grace period so a late provider response is not immediately raced by deletion. Normal READY deletions queue immediately. Failed destroys back off exponentially, then remain REVIEW with quota retained. A crash after remote upload but before READY is recovered from the reservation. A crash after remote destroy is safe to retry (`not found` is acknowledged).

No success claim implies immediate CDN erasure; invalidation propagates asynchronously and external copies cannot be recalled. Monitor DELETING age and REVIEW counts; investigate failed provider calls and reconcile the exact stored public IDs. Do not blindly free quota or delete by tenant/prefix. A dedicated hosted worker, operator alerts, a manual retry UI, long-term retention, distributed rate limiting, image safety moderation and provider cost alerts remain operational launch work. An instance that does not stay running cannot guarantee timely cleanup.

## Configure and stage privately

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` only on the API; use a dedicated Cloudinary product environment with appropriate API privileges and cost controls. API key is numeric. No unsigned preset or browser SDK is required. Do not put the secret in NEXT_PUBLIC variables, chat, commits or screenshots. Missing configuration returns an honest unavailable error; list/read paths do not invent assets.

Review/apply `20261016010000_secure_media` only under an authorized rollout after the earlier stacked migrations. No production migration or real Cloudinary upload/delete was performed by this task. Before launch use a controlled public sample image: upload → verify stripped WebP → attach to product/service/branding → reload → confirm foreign owner denial → remove all references → delete → confirm provider/Cloudinary CDN behavior and durable retry. Check API/reverse-proxy body limits and native Sharp support on the actual Node 22 host.

## Primary references checked

- https://cloudinary.com/documentation/upload_images
- https://cloudinary.com/documentation/image_upload_api_reference
- https://sharp.pixelplumbing.com/api-constructor/
- https://sharp.pixelplumbing.com/api-output/

Automated database tests mock only Cloudinary transport. Browser fixture tests mock HTTP responses and do not prove provider credentials, upload acceptance, private hosting topology or CDN invalidation.
