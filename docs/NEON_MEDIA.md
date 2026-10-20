# Neon Object Storage for Nexora media

## Provisioned (20 October 2026)

Separate `nexora-public` public-read buckets exist on these branches:

- Preview: Neon project `autumn-term-84572816`, branch `br-polished-unit-b9nkm4ic`
- Production: Neon project `purple-night-06010146`, branch `br-lucky-credit-ba9ullga`

Scoped storage credentials were installed privately in the corresponding Render API services. No key material was committed. Object Storage uses S3 Signature V4 over HTTPS and path-style addressing.

## Implementation

The NestJS media transport now writes normalized WebP bytes to `nexora-public/nexora/<businessId>/<mediaId>.webp`. Tenant ownership remains enforced in the PostgreSQL media registry. Stored image URLs are public, as before; never store confidential images in this bucket.

The existing guardrails remain: verified owner only, no SVG, Sharp validation/re-encoding, 5 MiB uploads, 12-megapixel decoding cap, 100-file tenant quota, and durable cleanup. S3 writes are verified by HTTP status; provider-specific Cloudinary response attestation is no longer used. Browser file upload continues through the authenticated NestJS endpoint, not direct anonymous S3 PUT.

The service now needs:
```dotenv
NEON_STORAGE_BUCKET=nexora-public
AWS_ENDPOINT_URL_S3=https://YOUR-BRANCH.storage.c-X.eu-central-1.aws.neon.tech
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=SET_IN_RENDER_ONLY
AWS_SECRET_ACCESS_KEY=SET_IN_RENDER_ONLY
```

Use only the endpoint and credentials from the matching Neon branch. Never add these secrets to `NEXT_PUBLIC_` env vars.

## Limits and compatibility

- The `nexora-public` bucket allows anonymous reads. Publication gates protect catalogue API discovery but do NOT make already-uploaded images private.
- Existing legacy Cloudinary media is not automatically moved. Inventory and migrate any existing rows before removing the old transport; do not delete existing Cloudinary images until their references have been replaced.
- Public-read endpoint delivery is currently direct from Neon. A CDN may be needed for high traffic.
- An object deletion is a storage operation, not an immediate cache purge.
- Both GitHub and real provider tests must pass before deployment. A passing mocked upload does not validate Neon credentials, actual uploads, or public image delivery.

## Required staging acceptance

1. Use a verified preview owner and small JPEG/PNG to perform the real upload.
2. Confirm returned URL is HTTPS on the preview storage branch and unauthenticated GET returns WebP.
3. Attach image to tenant-owned product, confirm a different owner cannot reuse it.
4. Remove image from all content; delete it, observe cleanup event finish.
5. Confirm wrong credentials/missing bucket/overloaded uploads fail without leaking tokens.
6. Confirm production environment remains disabled for new publication until independent launch review.

Production branch and preview branch must never share an S3 endpoint or credential. No payments or publishing have been enabled by this work.
