# Verification report — 15 October 2026

## Verification codes — 18 October 2026

- API Prisma generation, shared-types build, Nest build and Next production build passed locally. 220 unit tests in 18 suites passed.
- Targeted web ESLint passed. API source lint passed; including the existing integration file exposed its pre-existing unsafe-response typing/async-mock lint findings. No lint suppression added.
- PostgreSQL integration cases now cover concurrent single-use claims, five-attempt lockout with concurrent guesses, expiry, authentication, resend replacement and legacy-link rejection. Execution requires the disposable PostgreSQL CI service; no hosted customer database is used for these tests.
- Real inbox delivery of the new template remains pending deployment and a controlled recipient test. Pending old verification links are invalidated by the additive attempt-counter migration.

## First-party analytics — 16 October 2026

- Final [CI run 38853598771](https://github.com/Wizzyfrosh/Nexora/actions/runs/38853598771) passes both jobs on source 8f6c81a658803886f5bf0a16d3c82af2f8571385: 200 unit tests across 16 suites, 122 PostgreSQL integration tests across six suites (21 analytics + 26 storefront + 14 media + 14 account + 29 billing + 18 tenant), all three builds, six migrations, zero schema drift, runtime/critical audit gates and production-prune API import smoke. The compiled standalone worker processed its persisted disposable-database fixture with no failure, pending or review rows. Subsequent changes only record documentation/evidence. No production database was used.
- Local `npm run build`, Prisma client generation, `npx tsc --noEmit -p apps/api/tsconfig.json`, `npm run test --workspace api -- --runInBand` and targeted analytics API/web ESLint pass. Production audit remains zero findings; the known 25 noncritical development-tree findings remain, not a clean full-tree audit.
- Production Next Chromium fixtures pass opt-in/no-request-before-consent, deny/withdrawal across tabs, DNT/GPC override, event DTO shape, omitted cookies, disabled rollout and preview exclusion. Owner fixtures pass error/retry, zero/populated data, date windows, exact-value table and 390px overflow checks. Desktop/mobile screenshots were reviewed. Controlled HTTP proves browser contracts, not actual database processing or a production scheduler.
- Review covers effect cleanup, a versioned minimal preference key, per-mounted-page event IDs for effect replay, visible errors/empty/backlog states and UTC dates. No visitor/session profile or third-party SDK is added. The retired legacy WhatsApp route cannot write IP-derived session data. Historical legacy records are not imported/deleted automatically.
- Initial PostgreSQL CI correctly rejected the second owner's fresh signup layout because auth still seeded legacy Hero/Contact field names. Fresh registrations now use the released schema; the unchanged real HTTP acceptance assertion passes. Existing saved layouts are not rewritten. Event-capacity serialization now uses a row lock without updating business profile timestamps, with a database regression assertion.
- The restored test Chromium binary was truncated and crashed before startup; re-extracting the existing bundled compressed binary into a new scratch test executable resolved the environment issue. No application dependency or source changed for that recovery.
- Collection and publishing remain default-off. No merge/deploy, production migration, external monitoring configuration or real provider action was performed. See ANALYTICS.md for worker scheduling, retention targets and remaining operational gates.

## Public website delivery — 16 October 2026

- Final [CI run 38828937058](https://github.com/Wizzyfrosh/Nexora/actions/runs/38828937058) passes both jobs on source e11349f269717a55a1fb0775ad38dcb45133bd19: 170 unit tests across 15 suites, 101 PostgreSQL integration tests across five suites (26 storefront + 14 media + 14 account + 29 billing + 18 tenant), all three builds, all five preceding migrations, zero schema drift, audit gates and production-prune API import smoke. Subsequent changes only record documentation/evidence. Production audit reports zero findings; the known 25 noncritical development-tree findings remain, not a clean full-tree audit.
- Local `npm run build`, `npx tsc --noEmit -p apps/api/tsconfig.json`, and `npm run test --workspace api -- --runInBand` pass. Targeted ESLint passes without fixes for new storefront API sources/tests, public-access policy, new web routes/components/helpers and the changed settings screen. Existing unrelated lint debt elsewhere is not covered by a blanket claim.
- Chromium fixtures on the production Next build pass SSR text/title/canonical metadata, no public owner-session probes, current sitemap output, catalogue paging, unpublish-to-unavailable behaviour, escaped script text, contact failure/retry/success, private noindex preview with disabled enquiries, section save, dedicated publish/unpublish, appearance save/preview, profile failure/reload and a profile payload without isPublished. Desktop 1440px and mobile 390px screenshots were inspected; mobile has no horizontal overflow. Fixture imagery/business content is not shipped in production source.
- Browser verification caught a real Next route-encoding mismatch: page params contained `%40slug` while metadata used `@slug`. Strict one-time handle normalization and eight regression cases now cover this boundary. Targeted checks were rerun after the fix.
- Initial PostgreSQL CI exposed a pre-existing HTTP DTO conversion defect: implicit Array conversion turned plain section objects into arrays and rejected valid saves before persistence. Explicit object typing on SectionsRequest now preserves the validated objects. A focused real-ValidationPipe unit regression and all 26 actual HTTP/database storefront tests pass after the fix; no assertion was weakened to hide it.
- Browser HTTP is controlled test transport, not proof of actual deployed cookies, provider delivery or a live business journey. Real database boundary evidence comes from the separate PostgreSQL CI suite. No merge/deployment, production migration, SMTP send or real Cloudinary operation was performed. Publishing remains default-off; P0/staging gates remain open in PUBLIC_WEBSITE.md.

## Secure media — 16 October 2026

- API-mediated signed image upload, sanitization, transactional quota/ownership checks, attachment replacement, deferred cleanup and owner pickers implemented. Final [CI run 38825818799](https://github.com/Wizzyfrosh/Nexora/actions/runs/38825818799) passes both jobs on source a6a13ddbf7b68a69063bd8f9a690d437c6c668e2: 137 unit tests across 14 suites, 75 PostgreSQL integration tests (14 media + 14 account + 29 billing + 18 tenant), all three builds, all five migrations, zero drift, audit gates and production-prune import smoke. Later changes only record evidence/documentation.
- Local full API type check includes integration sources. A generated Turbopack cache panic interrupted one incremental build; moving only the generated .next directory aside resolved it. A clean rebuild and CI passed; no user source was removed.
- Chromium desktop/mobile fixtures passed storage-unavailable error and retry, multipart request shape, verified asset selection, product save/reload, library reuse and 390px overflow checks. Screenshot review caught an inherited animation trapping/fading fixed dialogs; roots no longer animate and media forms are opaque, viewport-anchored and scrollable. Computed browser checks confirm a solid-white card, no root animation, a 390×844 viewport overlay and reachable Save controls. These are controlled HTTP fixtures, not actual provider delivery.
- New media source, PostgreSQL test source and picker pass targeted lint without fixes. React review checked event-driven file upload, effect cleanup, explicit statuses/errors and labelled controls. Existing catalogue/settings pages retain unrelated legacy lint debt; no blanket lint claim.
- Tests use real Sharp decoding and mock Cloudinary transport. Real provider credentials, CDN invalidation, production native-image runtime and deployed upload limits still require staging validation. Public-CDN media is not private storage; see MEDIA_SECURITY.md.
- Fifth migration is additive and marks old registry rows LEGACY, not READY. No production database or real provider upload/delete was touched.

## Dependency maintenance — 16 October 2026

- Fresh `npm ci --no-audit`, shared build, Prisma client generation, all three workspace builds, full API TypeScript check and 129 unit tests pass locally. No framework-major, React or Prisma version migration; Next and its lint configuration move together to 16.4.2.
- `npm run audit:production`: zero findings. `npm run audit:critical`: exits successfully, zero critical; still reports 25 development-tree entries (5 high, 20 moderate) propagated from two unpatched roots. `npm run audit:full` remains a nonzero manual review, not a clean audit. See DEPENDENCIES.md for exact paths, exposure and sources.
- [CI run 38823682750](https://github.com/Wizzyfrosh/Nexora/actions/runs/38823682750) passed both jobs on source 765683575b5b8bd8128d8d57bcfb5053affe87c9: audit gates, all three builds, 129 unit tests, production-prune API import smoke, all four migrations, zero schema drift and 61 PostgreSQL integration tests (14 account + 29 billing + 18 tenant). A local pre-CI smoke check caught the wrong compiled API entry path; start:prod and the workspace-aware smoke test were corrected before this successful run. Later changes only record evidence.
- Chromium desktop/mobile recovery fixture checks pass on Next 16.4.2: request/reset/mismatch guard, explicit verification, missing SMTP state, fragment privacy and concurrent single-flight refresh. Browser HTTP and SMTP are mocked; database boundary evidence comes from the separate real PostgreSQL CI suite, not these fixtures. No deployed cookie or real inbox claim.
- No production service, database, credentials, provider account or live deployment changed.

## Account-security follow-up — 16 October 2026

- Local API full type check, all workspace builds and 129 unit tests pass. Targeted API/web lint passes without fixes.
- Real PostgreSQL account suite covers hashed/encrypted storage, single-use/expiry/purpose checks, reset/session revocation (including clearing both browser cookies), refresh rotation/replay/concurrency, normalization, cooldown and mail retry. Final [CI run 38822788408](https://github.com/Wizzyfrosh/Nexora/actions/runs/38822788408) passed both jobs: 129 unit tests across 13 suites, all three workspace builds, and 61 PostgreSQL integration tests (14 account + 29 billing + 18 tenant). All four migrations applied with no schema drift. Tested source: fb43be7baa73a6d7fc5d6373130e90b983914122; CI tested its PR merge commit fcdae87994367470c47538d17d38beeb836d57fe. Subsequent changes only record this evidence and remaining launch gates.
- Chromium desktop/mobile fixture checks passed: recovery submission, password mismatch guard, explicit verification (no automatic consume), unavailable SMTP message, URL-fragment token privacy and single-flight refresh. SMTP and browser HTTP responses are mocked; these do not prove actual inbox delivery.
- Fourth SQL migration includes an intentional legacy-token invalidation cutover; no production migration or real email was sent. See ACCOUNT_SECURITY.md.
- React quality review checked the changed recovery/auth/dashboard screens for hook lifecycle, client-only fragment handling, explicit event-driven mutations, labels/status/errors and disabled submission. No further source changes were needed.
- CI dependency installation reports 27 audit findings (2 low, 5 moderate, 17 high, 3 critical) across the installed dependency tree. This phase does not triage exploitability or distinguish production from development dependencies; dependency remediation is an unresolved launch gate. Do not treat passing tests as a clean dependency/security audit or run a blind breaking `npm audit fix --force`.

## Recurring billing follow-up

- Local: 123 unit tests across 12 suites pass; all three workspace builds pass. API type check including integration sources and targeted changed web lint pass.
- PostgreSQL regressions passed **47/47** (29 billing + 18 tenant), including exact mapping, concurrent invoice replay, cancellation, failure/ordering, mismatches, latest-invoice recovery, owner substitution, suspended renewals and stale provider snapshots. Evidence: [CI run 38791724375](https://github.com/Wizzyfrosh/Nexora/actions/runs/38791724375), tested source commit acf5ce6ca21a21446d91e3f02eee3d8ed453076b. Both CI jobs passed; all three migrations applied and no schema drift was detected.
- Targeted billing API lint now passes without unsafe-any errors. Chromium checks at 1440x1000 and 390x844 pass: confirmation/keep/cancel, disabled Premium, no invented metrics, failed verification then retry, no horizontal overflow or page errors. These use controlled HTTP fixtures, not a real provider session.
- Added an additive SQL migration; CI applies all three migrations and checks schema drift on disposable PostgreSQL 16.
- No provider account was charged or refunded. Provider transport remains mocked in automated tests. See RECURRING_BILLING.md for live launch blockers.

## Payment hardening follow-up

- Local monorepo build: 3/3 workspaces pass (unchanged web/shared builds cached).
- API unit suite: 11 suites, 102 tests pass. Full API TypeScript check including integration sources passes; diff whitespace check passes.
- PostgreSQL billing regressions added alongside the 18 tenant tests: replay/concurrency, distinct purchases, owner isolation, raw HTTP signature, mismatches, rollback, durable retry/reconciliation, suspension and expiry races.
- Disposable PostgreSQL 16 CI passed **35/35 integration tests** (17 billing + 18 tenant), applied both SQL migrations, and reported no schema difference. Build/unit job also passed. Evidence: [run 38785191636](https://github.com/Wizzyfrosh/Nexora/actions/runs/38785191636), source commit 9c541de9c715e89db233043b8c5a6b6b2210aac8.
- Initial CI caught an empty additive migration artifact before integration execution; it was corrected and the entire workflow rerun successfully. No production database was touched.
- No production database changes or live charges. Provider HTTP is mocked in automated integration tests; a real Paystack sandbox exercise and recurring lifecycle/refund gates remain open. See BILLING_ROLLOUT.md.

## Tenant-safety follow-up

- `npm run test --workspace api -- --runInBand`: 10 suites, 79 unit tests passed.
- API production build and full API TypeScript check (including tests): passed.
- Scope: parent-scoped transaction writes, explicit route-tenant authorization, category validation, public entitlement/projection rules, bounded input and pagination, production configuration and cookie Origin checks.
- Real PostgreSQL HTTP/rollback/concurrency regression suite added as `npm run test:security --workspace api`, executed by the disposable `tenant-security-postgres` GitHub job. **Passed: 18/18 integration tests** on PostgreSQL 16 in [GitHub run 38783059278](https://github.com/Wizzyfrosh/Nexora/actions/runs/38783059278), source commit 6a7a234f9e744c3c15ac789ab1ff793988cd491a. Both CI jobs completed successfully.
- Local PostgreSQL startup could not proceed because this environment denies changing to the non-root account PostgreSQL requires. No permissions were changed and no deployed database was used.
- Payment handling, media-provider ownership and full session/deployment validation remain open. This is not a production-readiness certification.

The original UI milestone evidence below is retained as historical context.

## Scope

Reference-led homepage, authentication screens, workspace shell and API-derived overview. Backend source audited to build an accurate remaining-feature plan. No production configuration or database was modified.

## Checks completed

| Check                     | Result    | Evidence / limit                                                                                                                     |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency install        | Passed    | npm ci from committed lockfile                                                                                                       |
| Shared types              | Passed    | npm run build --workspace @nexora/shared-types                                                                                       |
| Prisma generation         | Passed    | npm exec --workspace api -- prisma generate --schema prisma/schema.prisma; generation only, no migration                             |
| Monorepo production build | Passed    | npm run build; 3/3 Turbo tasks successful                                                                                            |
| Backend unit suite        | Passed    | 6 suites, 43 tests; repository mocks, no live database                                                                               |
| Changed frontend lint     | Passed    | ESLint on the 10 changed/new TSX route/component files                                                                               |
| Desktop/mobile browser    | Passed    | Chromium at 1440x1000 and 390x844; no pageerror events                                                                               |
| Public interactions       | Passed    | Single H1, document title, gallery filtering, FAQ expansion, mobile menu close-on-navigation, local photos, no horizontal overflow   |
| Account form              | Passed    | Registration inputs, password show/hide; controlled 401 login error displayed                                                        |
| Workspace contracts       | Passed    | Controlled /auth/me and catalogue/CRM fixtures yield counts 7,3,9,2; mobile website navigation and responsive shell                  |
| Visual inspection         | Completed | Full-page desktop/mobile homepage, desktop workspace and mobile registration reviewed; image-loading problem fixed with local assets |
| Diff hygiene              | Passed    | git diff --check                                                                                                                     |

Browser fixtures are test data only and are not present in production application code. The fixture authentication/count responses do not prove real API authentication, database queries or tenant authorization.

## Not verified at the earlier UI baseline

Live registration/session cookie topology, PostgreSQL persistence, actual billing, public websites, Cloudinary uploads, mail delivery, queue processing, production observability, provider limits and full WCAG conformance. No production credentials were supplied or retrieved for these checks.

## Known limitations

Public website renderer and analytics are still incomplete. Existing security blockers remain in SECURITY.md/CURRENT_STATE.md. The 43 existing unit tests do not cover all those risks.
The remaining catalogue/settings/billing page internals retain existing workflows and inherit shared design tokens. They have not each received a complete workflow redesign or live integration test in this change.
Pricing and Premium capabilities are explicitly marked as planned/early-release until launch gates pass.

## Reproduce

Follow SETUP.md, run the root build and API unit command, start the production web server, then verify the public interactions listed above. Use a separate staging environment and real PostgreSQL for the integration/security scenarios in TESTING.md.
The GitHub verify workflow runs builds/unit tests; hosted browser and live integration gates are future additions.

## Hosted preview connection — 18 October 2026

- Shared-types build and Next production build passed with the HTTPS Render upstream and relative browser API base.
- Render built the existing tested API source; Neon migration ledger confirms all six migrations finished successfully.
- Vercel preview `/api/v1` returned HTTP 200 with the Nest response, proving the external rewrite reaches Render.
- No live provider transactions or customer data were used. The final deployed API proxy returns `Cache-Control: private, no-store, max-age=0`.
- Hosted HTTP acceptance passed: signup 201; both cookies Secure, HttpOnly and SameSite=Lax; profile 200; foreign-Origin refresh 403; refresh 200; logout 200; profile after logout 401; subsequent login 200. Test account remains logged out. Homepage was also observed in the cloud browser. This is HTTP session acceptance, not a full browser dashboard/provider journey.
- Targeted web ESLint passed from apps/web; git diff --check passed. An initial lint invocation from the repository root failed to find the web config and was rerun from the correct workspace.

## Brevo account transport — 18 October 2026

- Prisma generation and Nest API build passed.
- `npm test -- --runInBand` from apps/api: 218 tests across 17 suites passed, including HTTPS transport acceptance/rejection, redacted network errors, missing receipt/key, encrypted queue configuration and production configuration checks.
- Provider requests are mocked in tests. No real messages sent; sender verification, private configuration and inbox acceptance remain pending.
- Targeted ESLint on transport/configuration and their new tests, final API build, and git diff --check passed. Configuration values now require strings instead of coercing arbitrary objects.
