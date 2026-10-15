# Nexora product requirements

Version 1.0 · 15 October 2026 · Product owner: Wisdom Umanor (WizzyFrosh)
Status: implementation specification, reconciled with the repository. See CURRENT_STATE.md for actual delivery status.

## Problem and product

Small businesses need a credible, mobile-friendly home for their brand and catalogue without maintaining custom code. Nexora combines business details, products, services, website styling and enquiries in a private owner workspace and exposes a deliberately limited public website.

## Personas

- Owner: manages their own business, catalogue, website and subscription.
- Visitor: discovers an eligible published business and contacts it.
- Super admin: operates the platform through explicitly authorized, audited actions. Admin UI is a later milestone.
- Staff: planned only. An enum is not a complete permission system.

## Success definition

The first launch is complete when an owner can register, verify email, manage a business, add real catalogue content, select a released theme, publish an eligible website, receive a real enquiry, and renew access through a verified payment. A second owner must be unable to access or mutate the first owner's private content.
Pilot targets (proposed, not achieved): 5 businesses complete onboarding; at least 4 publish without developer intervention; no unresolved critical/high security defects. Track completion and error reasons before optimizing conversion.

## Scope and acceptance criteria

| ID    | Requirement         | Acceptance                                                                                                                                     |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | Account and session | Signup/login/logout work with secure cookies; verification/reset emails delivered; invalid and expired tokens rejected; refresh rotates tokens |
| FR-02 | Business profile    | Owner edits name, description, contact, opening hours and social links; persistence survives a new session                                     |
| FR-03 | Products            | Create/read/update/delete, categories, ordered images, decimal prices and availability; all operations tenant-scoped                           |
| FR-04 | Services            | Real CRUD with optional price or price label; cross-tenant category references rejected                                                        |
| FR-05 | Website appearance  | Released theme and validated palette/typography persist; preview reflects saved settings                                                       |
| FR-06 | Structured content  | Typed allowlisted sections, ordering, atomic save, owner preview; no arbitrary scripts                                                         |
| FR-07 | Public website      | Canonical /@businessSlug route; unpublished/deleted/expired/suspended sites inaccessible; public DTO excludes private data                     |
| FR-08 | Enquiries           | Visitor submits bounded validated form; owner can list/read/delete own enquiries; spam controls apply                                          |
| FR-09 | Subscription        | Seven-day trial, annual Basic/Premium; only server-confirmed payment grants entitlements; duplicate events have no extra effect                |
| FR-10 | Media               | Authenticated signed upload; MIME/size/type checks; ownership recorded before attachment; safe deletion                                        |
| FR-11 | Analytics           | Queued events, tenant-scoped aggregates and defined date windows; no fabricated metrics                                                        |
| FR-12 | Discovery           | Responsive page, working links, metadata, sitemap only for eligible public sites and accessible interactions                                   |

## Plans and commercial rules

Preserve PRD.txt's proposed pricing: Trial 7 days; Basic ₦50,000/year; Premium ₦120,000/year.
Trial begins once per initially created business according to signup rules; preventing repeated trial abuse is a release requirement.
Trial/basic catalogue features follow the original product intent. Original “unlimited” catalogue promise means no arbitrary commercial item cap, not unlimited bandwidth or abusive automated writes. Document fair-use controls before launch.
Premium roadmap: custom domains, team permissions, advanced analytics, priority support and possible future AI features. Do not sell those as available until implemented and verified.
At trial/paid expiry: dashboard access remains; public content is denied; data is retained according to the approved retention policy. Cancellation must not immediately remove already-paid access unless explicitly suspended for abuse.
Pricing, taxes, refund rules, support channel and plan entitlement matrix must be confirmed before live payments.

## MVP exclusions

No buyer cart/checkout, delivery, order fulfilment, marketplace discovery, native mobile app, drag-and-drop canvas, AI site generation or automatic WhatsApp catalogue sync.
Paystack pays for Nexora subscriptions, not a business's customer orders.
WhatsApp means a safe contact deep link plus optional click measurement, not access to WhatsApp messages.

## Nonfunctional requirements

Use WCAG 2.2 AA as the accessibility target; mobile widths from 360px; keyboard-operable navigation/forms; visible focus; reduced motion.
Targets, not guarantees: public p95 LCP <2.5s on representative mobile tests, private CRUD p95 <500ms excluding third parties, 99.5% initial monthly availability, backup RPO ≤24h and RTO ≤4h once an affordable plan is selected.
No cross-tenant disclosure, no plaintext passwords, no card collection/storage, no trusted browser payment outcomes.
