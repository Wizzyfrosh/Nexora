# Nexora master implementation prompt

Paste the following task into your coding assistant after opening Wizzyfrosh/Nexora:

You are maintaining Nexora, a multi-tenant small-business website SaaS.
Read root AGENTS.md and nested instructions first. Read docs/PRD.md, CURRENT_STATE.md, ARCHITECTURE.md, SECURITY.md and IMPLEMENTATION_PLAN.md. Inspect package files and existing services before coding; requirements are not proof of implementation.

Keep the installed Next.js 16 / React 19 / Tailwind 4 frontend and NestJS / Prisma / PostgreSQL backend. Preserve the purple/lilac reference-led visual system and working business/catalogue/CRM integrations.
Do not recreate the repository or add a second backend. Do not downgrade packages to match old planning text.
Do not invent testimonials, usage numbers, traffic statistics or working Premium capabilities.

Start with the first incomplete milestone in docs/IMPLEMENTATION_PLAN.md. For M1, prioritize parent-scoped atomic website-section saves, cross-tenant category/media protection, consistent public current-time entitlement gates and production configuration validation.
Show a concise inspection report linking actual files to each gap. Define a bounded slice, implement it, and add meaningful negative/concurrency tests. Use an isolated test database when integration evidence is needed.
Do not run destructive or production database operations. Do not publish live billing or merge/deploy unless authorized for that action.

Build shared types, generate Prisma client, run relevant unit/integration tests and production builds. Inspect the final diff for secrets and regressions.
Update CURRENT_STATE.md only for gaps you actually closed. Record real commands/results/limitations in VERIFICATION.md.
End with changed behaviour, verified evidence, remaining risks and the next milestone. Do not call mock-based browser tests a live end-to-end test.

## UI follow-up task

Audit all catalogue, settings, appearance and billing workflows in the new workspace shell. Improve remaining forms/tables and mobile layouts without replacing API calls with samples.
Complete public rendering only after the entitlement and tenant gates are safe. Every advertised theme must exist as a released renderer preset.
