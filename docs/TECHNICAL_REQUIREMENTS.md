# Technical requirements

## Installed baseline

| Component            | Repository choice                                        | Rule                                                              |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Web                  | Next.js 16.2.7 / React 19.2.4 / TypeScript               | Keep versions and lockfile; read installed Next docs              |
| Styling              | Tailwind 4, Radix Slot, CSS, lucide-react, Framer Motion | New marketing CSS is scoped; shared tokens serve existing screens |
| API                  | NestJS 11, TypeScript                                    | Modular monolith; controllers/services/repositories               |
| Database             | PostgreSQL / Prisma 6.4.1                                | Schema is apps/api/prisma/schema.prisma                           |
| Queue/cache          | Redis + BullMQ intended                                  | Packages/config alone do not implement jobs                       |
| Storage              | Cloudinary intended                                      | Browser must never receive API secret                             |
| Subscription billing | Paystack                                                 | Amounts verified server-side; no card data                        |
| Observability        | Sentry/PostHog intended                                  | Configuration alone does not install instrumentation              |
| Deployment           | Vercel web; persistent Node API/worker host to confirm   | Keep API and workers close to database                            |

Earlier plans mentioned Next.js 15. The source of truth for installed versions is package-lock.json, not the old planning text.

## Boundaries

Browser requests include credentials via apiFetch. API base path is /api/v1. Web NEXT_PUBLIC_API_URL must include the API prefix.
Shared package exports compiled dist: build it before dependent workspaces. Use type-only imports when possible.
API uses global validation, auth, throttling, response interceptor and exception filter. Do not create incompatible response envelopes.
Do not import @prisma/client into browser components. Public read DTOs must be explicit projections.

## Configuration

No secret values in source. Production fails fast for absent/weak JWT secrets, database URL and required integration settings.
Disable unfinished integrations explicitly. Return a bounded unavailable state rather than silently “succeeding”.
Store timestamps in UTC. Display locale-aware dates. Use decimal or integer minor units deliberately; do not use floating point to grant monetary value.
Page all lists, cap page sizes and request sizes, and encode user-provided URL segments.

## Standards

Strict TypeScript for new code; no unvalidated any at a security boundary; shared DTO changes need backend validation changes.
Avoid broad rewrites of the monorepo. Separate visual changes, security fixes, schema migrations and feature releases into reviewable slices.
HTTP handlers must have bounded external-call timeouts. Log correlation IDs and sanitized error codes.
