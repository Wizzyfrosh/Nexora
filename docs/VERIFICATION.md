# Verification report — 15 October 2026

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
