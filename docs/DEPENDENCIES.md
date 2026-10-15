# Dependency security and release policy

Reviewed 16 October 2026. Scope: the committed npm workspace lockfile, not a penetration test or an attestation about a deployed artifact.

## Triage and changes

Baseline audit: 27 affected package entries (2 low, 5 moderate, 17 high, 3 critical). The production-only view reported 12 entries, including 2 critical. Counts include transitive impact on parent packages; they are not counts of independently exploitable application vulnerabilities.

| Path | Change | Exposure assessment |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.2.7 → 16.4.2, aligned exact versions | Runtime framework requires an update; staying on 16.2.7 leaves multiple advisories. No framework-major or React migration. Source has no next/og ImageResponse or custom trust-proxy configuration; that limits specific advisory paths, not every Next risk. |
| Nest Express adapter / Multer | Adapter 11.1.24 → 11.2.7; Multer 2.1.1 → 2.4.0 | Remains on Nest 11. No FileInterceptor/multipart upload implementation was found, but patched before the upcoming media slice. |
| Express transitive dependencies | proxy-addr 2.0.8, body-parser 2.3.0, qs 6.16.1 | Proxy spoofing advisory requires a particular trusted-subnet configuration not present in this source. Patched anyway; actual hosting proxy topology still needs review. |
| Next image/CSS pipeline | sharp 0.35.5, PostCSS 8.5.23, source-map-js 1.2.2, nanoid 3.3.20 | Updated through supported upstream dependency resolution, not forced cross-major overrides. |
| Other runtime/tooling transitives | Compatible patches for fast-copy, form-data, fast-uri, brace-expansion, js-yaml, handlebars, browserslist and esbuild | Lockfile changes are regression-tested; no blind force-fix or dependency substitution. |
| Prisma runtime client | Move @prisma/client from devDependencies to dependencies; version unchanged | Required by the running API. Generate the client during build before pruning development dependencies. |

After compatible fixes, the production audit reports zero findings. The full installed tree still reports 25 entries: 5 high and 20 moderate, propagated from two unpatched development-tooling roots:

- `braces@3.0.3` → micromatch → fast-glob → Next ESLint tooling: GHSA-vfj7-8cjw-p6xm, stack exhaustion from attacker-controlled nested patterns. Registry/advisory have no patched release at review time. Application request handlers do not import these tools or accept user glob patterns. Do not run lint/build against untrusted repository content on a privileged runner.
- `sprintf-js@1.0.3` → argparse@1 → js-yaml@3 → Istanbul/Jest: GHSA-hp3w-g68c-fv3c, denial of service from untrusted precision format strings. Registry latest 1.1.3 is also affected. Application request handlers do not use it. Test/coverage inputs remain trusted repository content.

Do not downgrade Next's ESLint configuration to 14 or downgrade Jest adapters just to make the counter green. Do not invent a patched version or substitute a different package API through overrides. Residual findings remain open for upstream remediation or an explicit owner-approved release risk decision. They are not silently waived by CI.

## Repeatable gates

```sh
npm ci
npm run audit:production
npm run audit:critical
npm run audit:full
```

`audit:production` fails on any known production severity. `audit:critical` reports the entire tree and fails on critical findings, including development dependencies. `audit:full` intentionally exits nonzero while the unpatched roots remain. A green CI does not mean the full audit is clean: noncritical tooling findings require manual review. Registry/network errors must fail checks, not be treated as zero findings. Advisory data changes over time; rerun before release and after lockfile changes.

CI builds and tests, then prunes dev dependencies and imports the generated Prisma client and compiled API module without starting a server or connecting to a database. This is a packaging smoke test, not a deployed-health check. PostgreSQL integration tests run separately on a disposable database.

## Sources checked

- https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j
- https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-hp3w-g68c-fv3c
- Live npm advisory responses and registry package metadata for the installed lockfile.

No merge, deployment, production migration, payment or real email delivery is authorized by this maintenance slice.
