# Decision register

| ID      | Decision                                             | Reason / consequence                                                   |
| ------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| ADR-001 | Keep Next.js/NestJS/Prisma modular monolith          | Existing implementation; avoids costly framework rewrite               |
| ADR-002 | Installed Next.js 16 wins over older Next.js 15 plan | Builds must follow actual dependency APIs                              |
| ADR-003 | Shared DB, business-scoped access                    | Affordable MVP; demands rigorous tenant-negative testing               |
| ADR-004 | Structured sections, no arbitrary canvas/scripts     | Smaller scope, safer rendering and easier mobile consistency           |
| ADR-005 | Canonical planned /@businessSlug                     | Preserve agreed public URL; existing /sites link had no implementation |
| ADR-006 | Paystack for platform subscription only              | No buyer checkout or marketplace settlement scope                      |
| ADR-007 | Gate by server time on every public boundary         | Scheduled cleanup is not authorization                                 |
| ADR-008 | API-derived overview; no fake KPIs                   | Trustworthy workspace and honest unavailable state                     |
| ADR-009 | Purple/lilac synthesis of three references           | Consistent SaaS homepage/account/workspace identity                    |
| ADR-010 | Concept gallery explicitly illustrative              | Marketing preview is not a released theme or customer endorsement      |

## Open decisions before launch

Confirm API/worker host, DB provider/region and budgets; exact public domain/site topology; production email provider/sender; priced entitlements and fair use; refund/cancellation policy; support channel and retention durations.
No provider account creation, purchase, migration or secret rotation is performed by these documents.
Prior Redis credential disclosed in conversation must be rotated by the credential owner; never copy it into files.
