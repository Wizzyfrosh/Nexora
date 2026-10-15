# Nexora coding-agent instructions

Applies repository-wide. Read the relevant nested AGENTS.md as well. Preserve existing user changes and the installed framework versions.

## Mission

Build a trustworthy small-business website SaaS. Finish real end-to-end slices; do not substitute hard-coded business metrics, fake customers, mocked production services or placeholder buttons for completed features.

## Before changes

1. Inspect git status and the target files.
2. Read docs/CURRENT_STATE.md, docs/PRD.md, docs/SECURITY.md and the relevant implementation milestone.
3. Treat documents as requirements, not proof of implementation. Verify the code.
4. Read apps/web/AGENTS.md. Next.js 16 guidance is bundled at node_modules/next/dist/docs/.
5. Identify affected routes, contracts, tenant checks and tests before editing.

## Architecture and scope

- Retain Next.js / NestJS / Prisma / PostgreSQL. Do not introduce a second backend or replace auth without an explicit migration task.
- Shared contracts belong in packages/shared-types. Do not expose Prisma, secrets or Node-only packages to browser code.
- Controllers validate and delegate. Services enforce business policy. Repositories handle persistence.
- One business is one tenant. Obtain identity from the authenticated session; validate ownership server-side on every private operation.
- Scope nested writes by both child ID and its parent business/website. A tenant guard alone is insufficient.
- Business content may only be returned publicly when published, not deleted, and entitled at the current server time.
- Keep payment fulfilment transactional and idempotent. Callbacks do not grant entitlements.
- Use real API data, honest zero states, visible errors and retry actions. Do not display invented growth percentages.

## Frontend

Prefer server components for static marketing. Use small client components for state and browser APIs.
Keep links actionable, avoid nested buttons/links, label form fields, retain keyboard focus, and respect reduced motion.
Preserve the reference-led purple/lilac, off-white, warm accent direction in docs/DESIGN_BRIEF.md.
Do not market planned Premium capabilities as released. Do not invent testimonials, partner logos, uptime guarantees or usage figures.
Use repository-native CSS/vector elements for interface previews. Never present an illustration as an actual customer screenshot.

## Data and security

No secrets in commits, logs, prompts or screenshots. Commit only placeholder environment examples.
No unsafe HTML injection, arbitrary CSS/script upload, client-supplied role changes or trusting payment metadata without checking persisted records.
Use allowlisted DTOs, URL protocols, upload types and size limits. Add negative tests for tenant boundaries, billing replay and expiry.
Never run destructive database reset/drop, production migrations, purchase infrastructure or merge/deploy automatically without the user's applicable authorization.

## Workflow and completion

Work on a feature branch. Keep changes focused. Inspect the diff before committing.
Build shared types before dependent apps. Generate Prisma client before API build/tests.
Run relevant lint, type/build and meaningful tests. Record exact commands, results and limitations in docs/VERIFICATION.md.
Do not run the API lint script casually: its current --fix flag mutates files.
Report what changed, what passed, what could not be verified, and the next concrete milestone.
Update docs/CURRENT_STATE.md when a gap is actually closed. Never call the full product production-ready based on a UI build.
