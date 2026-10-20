/**
 * Nexora: real Neon Object Storage acceptance probe.
 *
 * Run manually in an approved PREVIEW shell with the same branch-specific
 * credentials as the preview API. Never execute in CI or production.
 *
 * NEXORA_STORAGE_SMOKE_ACK=preview-only node dist/src/modules/media/storage-smoke.js
 *
 * Synthetic object only. No customers, users, or database records.
 */
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { NeonStorageTransport } from './neon-storage.transport';
import { configuration } from '../../config/configuration';

const PREVIEW_ENDPOINT =
  'https://br-polished-unit-b9nkm4ic.storage.c-7.eu-central-1.aws.neon.tech';

async function main() {
  if (
    process.env.NEXORA_STORAGE_SMOKE_ACK !== 'preview-only' ||
    process.env.AWS_ENDPOINT_URL_S3 !== PREVIEW_ENDPOINT ||
    process.env.NEON_STORAGE_BUCKET !== 'nexora-public'
  ) {
    throw new Error(
      'Refusing storage write: this probe is allowed only on the known Nexora preview branch',
    );
  }

  const storage = new NeonStorageTransport(new ConfigService(configuration()));
  storage.configured();
  // Each run uses a never-reused random key. We do not put any customer data in storage.
  const id = 'nexora/' + randomUUID() + '/' + randomUUID();
  const expected = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#224466' },
  })
    .webp()
    .toBuffer();
  let uploaded = false;

  try {
    await storage.upload(id, expected);
    uploaded = true;
    const response = await fetch(storage.url(id), {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      throw new Error('Anonymous object read failed: HTTP ' + response.status);
    }
    const actual = Buffer.from(await response.arrayBuffer());
    if (!actual.equals(expected)) {
      throw new Error('Object read returned unexpected bytes');
    }
    if (!(response.headers.get('content-type') || '').includes('image/webp')) {
      throw new Error('Object is not served as image/webp');
    }
    process.stdout.write('PASS Neon preview: signed upload and anonymous byte-for-byte GET\n');
  } finally {
    // Delete even on read mismatch, and loudly report cleanup failure.
    if (uploaded) {
      await storage.destroy(id);
      process.stdout.write('PASS Neon preview: signed object deletion\n');
    }
  }
}

main().catch(() => {
  // Never print provider responses, signed headers, credentials or URLs.
  process.stderr.write('FAIL Neon preview storage probe; review service logs securely.\n');
  process.exitCode = 1;
});
