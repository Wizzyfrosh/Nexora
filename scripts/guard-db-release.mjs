#!/usr/bin/env node
/**
 * Guard Nexora's manually-dispatched production/rehearsal Prisma migrations.
 *
 * Does not connect to the database. Secrets remain in GitHub Actions environments.
 * Intentional hard-coded host allowlist prevents accidental preview/prod crossover.
 */
import assert from 'node:assert/strict';

export const endpoints = Object.freeze({
  rehearsal: 'ep-lively-rice-bawbyzik.c-8.eu-central-1.aws.neon.tech',
  production: 'ep-wild-dew-baff7imw.c-8.eu-central-1.aws.neon.tech',
});
export const applyConfirmation = Object.freeze({
  rehearsal: 'APPLY_NEXORA_REHEARSAL_SCHEMA',
  production: 'APPLY_NEXORA_PRODUCTION_SCHEMA',
});

function parseDbUrl(source, key) {
  assert.ok(typeof source === 'string' && source.length, key + ' is missing');
  let url;
  try { url = new URL(source); } catch { throw new Error(key + ' is invalid'); }
  assert.ok(url.protocol === 'postgresql:' || url.protocol === 'postgres:', key + ' must be PostgreSQL');
  assert.ok(url.username && url.password && url.pathname === '/nexora', key + ' must use the Nexora database');
  assert.ok(!url.hash, key + ' must not include fragments');
  return url;
}

export function validateReleaseTarget(env) {
  const target = env.NEXORA_DB_TARGET;
  const operation = env.NEXORA_MIGRATE_MODE;
  assert.ok(target === 'rehearsal' || target === 'production', 'Unknown database target');
  assert.ok(operation === 'status' || operation === 'apply', 'Unknown migration operation');
  assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Only main may release schemas');
  assert.equal(env.PAYSTACK_LIVE_ENABLED, 'false', 'Paystack must remain disabled during schema release');
  assert.equal(env.PUBLIC_PUBLISHING_ENABLED, 'false', 'Publishing must remain disabled during schema release');
  const direct = parseDbUrl(env.DIRECT_URL, 'DIRECT_URL');
  const pooled = parseDbUrl(env.DATABASE_URL, 'DATABASE_URL');
  assert.equal(direct.hostname, endpoints[target], 'DIRECT_URL points to the wrong Neon branch');
  assert.equal(pooled.hostname, endpoints[target].replace('.c-8.', '-pooler.c-8.'), 'DATABASE_URL must use the matching Neon pooler');
  assert.equal(pooled.username, direct.username, 'Database roles do not match');
  assert.equal(pooled.pathname, direct.pathname, 'Database names do not match');
  assert.equal(pooled.password, direct.password, 'Database role credentials do not match');
  assert.equal(direct.searchParams.get('sslmode'), 'require', 'Direct connection must require TLS');
  assert.equal(pooled.searchParams.get('sslmode'), 'require', 'Pooler connection must require TLS');

  if (operation === 'apply') {
    assert.equal(env.NEXORA_MIGRATE_CONFIRM, applyConfirmation[target], 'An explicit target-specific confirmation is required');
    assert.equal(env.NEXORA_MIGRATE_APPROVED, 'true', 'An additional migration approval is required');
  }
  return { target, operation, host: direct.hostname };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    const { target, operation, host } = validateReleaseTarget(process.env);
    process.stdout.write('Validated Nexora ' + target + ' database ' + host + ' for ' + operation + '\n');
  } catch {
    // Avoid printing exception values; they could contain secrets in future versions.
    process.stderr.write('Nexora migration target validation failed; check protected workflow settings.\n');
    process.exitCode = 1;
  }
}
