import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseTarget, applyConfirmation, endpoints } from './guard-db-release.mjs';

const fixture = (target='rehearsal') => {
  const base = 'postgresql://nexora_owner:test-only-fixture@';
  const suffix = '/nexora?sslmode=require';
  const host = endpoints[target];
  return {
    GITHUB_REF: 'refs/heads/main',
    NEXORA_DB_TARGET: target,
    NEXORA_MIGRATE_MODE: 'status',
    NEXORA_MIGRATE_CONFIRM: '',
    NEXORA_MIGRATE_APPROVED: 'false',
    PAYSTACK_LIVE_ENABLED: 'false',
    PUBLIC_PUBLISHING_ENABLED: 'false',
    DATABASE_URL: base + host.replace('.c-8.', '-pooler.c-8.') + suffix,
    DIRECT_URL: base + host + suffix,
  };
};

test('read-only rehearsal status accepts exact isolated Neon endpoint', () => {
  assert.deepEqual(validateReleaseTarget(fixture()), {
    target: 'rehearsal',
    operation: 'status',
    host: endpoints.rehearsal,
  });
});

test('production status requires the separately allowlisted production endpoint', () => {
  assert.equal(validateReleaseTarget(fixture('production')).target, 'production');
  assert.throws(() => validateReleaseTarget({
    ...fixture('production'), DIRECT_URL: fixture().DIRECT_URL,
  }), /wrong Neon branch/);
});

test('cannot apply migration without two deliberate confirmations', () => {
  const base = {...fixture(), NEXORA_MIGRATE_MODE:'apply'};
  assert.throws(() => validateReleaseTarget(base), /explicit target-specific/);
  assert.throws(() => validateReleaseTarget({
    ...base, NEXORA_MIGRATE_CONFIRM:applyConfirmation.rehearsal,
  }), /additional migration approval/);
  assert.equal(validateReleaseTarget({
    ...base, NEXORA_MIGRATE_CONFIRM:applyConfirmation.rehearsal,
    NEXORA_MIGRATE_APPROVED:'true',
  }).operation,'apply');
});

test('production requires production-specific typed confirmation', () => {
  assert.throws(() => validateReleaseTarget({
    ...fixture('production'),NEXORA_MIGRATE_MODE:'apply',
    NEXORA_MIGRATE_CONFIRM:applyConfirmation.rehearsal,
    NEXORA_MIGRATE_APPROVED:'true',
  }),/explicit target-specific/);
});

test('prevents checkout enabled, wrong branches, pooler/direct swaps or db name change', () => {
  const f=fixture();
  assert.throws(() => validateReleaseTarget({...f,GITHUB_REF:'refs/heads/feature'}));
  assert.throws(() => validateReleaseTarget({...f,PAYSTACK_LIVE_ENABLED:'true'}));
  assert.throws(() => validateReleaseTarget({...f,PUBLIC_PUBLISHING_ENABLED:'true'}));
  assert.throws(() => validateReleaseTarget({...f,DIRECT_URL:f.DATABASE_URL}));
  assert.throws(() => validateReleaseTarget({...f,DIRECT_URL:f.DIRECT_URL.replace('/nexora','/other')}));
  assert.throws(() => validateReleaseTarget({...f,DATABASE_URL:f.DATABASE_URL.replace('test-only-fixture','other')}));
  assert.throws(() => validateReleaseTarget({...f,DIRECT_URL:f.DIRECT_URL.replace('sslmode=require','sslmode=disable')}));
});
