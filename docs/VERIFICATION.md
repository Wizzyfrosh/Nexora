# Verification report — 15 October 2026

## Account-security follow-up — 16 October 2026

- Local API full type check, all workspace builds and 129 unit tests pass. Targeted API/web lint passes without fixes.
- Real PostgreSQL account suite covers hashed/encrypted storage, single-use/expiry/purpose checks, reset/session revocation, refresh rotation/replay/concurrency, normalization, cooldown and mail retry. Initial CI run 38822138641 passed all 61 tests and zero-drift migration checks. Final cookie/UI follow-up CI pending.
- Chromium desktop/mobile fixture checks passed: recovery submission, password mismatch guard, explicit verification (no automatic consume), unavailable SMTP message, URL-fragment token privacy and single-flight refresh. SMTP and browser HTTP responses are mocked; these do not prove actual inbox delivery.
- Fourth SQL migration includes an intentional legacy-token invalidation cutover; no production migration or real email was sent. See ACCOUNT_SECURITY.md.

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
