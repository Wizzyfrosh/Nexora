# Test strategy

## What counts as evidence

Build proves compilation, not working payments or database integration.
Unit tests use repository mocks; browser fixture responses test rendering/contracts only.
Real staging tests must use an isolated database, controlled accounts and provider test mode.

## Existing commands

```sh
npm run build --workspace @nexora/shared-types
npm exec --workspace api -- prisma generate --schema prisma/schema.prisma
npm run build
npm run test --workspace api -- --runInBand
npm run lint --workspace web
```

API lint currently uses --fix; review before running against unrelated files.
Run focused ESLint for changed frontend files, and record known legacy failures separately.

## Required cases by milestone

| Area       | Positive                                        | Negative/concurrency                                               |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Auth       | Register, verify, login, refresh, logout, reset | Expired/reused token, CSRF, default secrets, deleted user          |
| Tenants    | Owner edits own profile/catalogue               | ID substitution for product/category/section/image/lead            |
| Content    | Reorder/save all sections                       | Foreign/duplicate section ID, atomic rollback                      |
| Public     | Published eligible site renders                 | Missing subscription, expired timestamps, unpublish, deleted child |
| Billing    | Provider test purchase fulfils once             | Replay, amount mismatch, concurrent verify/webhook, DB outage      |
| Media      | Signed allowed upload attaches                  | Wrong owner/publicId, fake MIME, oversize, script payload          |
| Analytics  | Bounded events aggregate                        | Oversized metadata, cross-tenant read, queue failure               |
| UI         | Desktop/mobile links, filters, FAQ, forms       | API errors, no data, loading, reduced motion, keyboard             |
| Operations | Restore backup in isolated environment          | Failed migration recovery and rollback with compatible schema      |

## UI acceptance

Test 360/390/768/1024/1440 widths, no horizontal scroll; labels and errors announced; tab through primary controls; menu disclosure opens/closes; FAQ works without JS; concept filter matches category.
Mock /auth/me and count endpoints only for UI contract verification and clearly label this evidence.
Dashboard unavailable counts show an em dash/error, not fabricated zero. Error retry must re-fetch for current tenant.
Registration never sends a request with invalid password; pending submit disabled; rejection remains visible.

## Release criteria

All P0 security cases pass against real PostgreSQL. API + web production builds pass. No critical/high unresolved runtime vulnerabilities. Basic owner/visitor/payment journey verified in staging. Mobile visual review completed. Restore and rollback exercised.
Current gaps and actual results live in VERIFICATION.md, not hidden in comments.
