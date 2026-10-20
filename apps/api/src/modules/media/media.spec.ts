import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import { sanitizeImage } from './media-image';
import { NeonStorageTransport } from './neon-storage.transport';
import { sectionMediaUrls } from '../../common/security/media';
import { MediaCapacityInterceptor } from './media.controller';
import { Subject } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
describe('Media file boundary', () => {
  it('decodes and re-encodes PNG to WebP without EXIF', async () => {
    const input = await sharp({
      create: { width: 4, height: 3, channels: 3, background: '#aabbcc' },
    })
      .png()
      .withMetadata()
      .toBuffer();
    const output = await sanitizeImage(input, 'image/png');
    const meta = await sharp(output.data).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    expect(output.width).toBe(4);
  });
  it('rejects SVG and MIME spoofing', async () => {
    await expect(
      sanitizeImage(Buffer.from('<svg/>'), 'image/png'),
    ).rejects.toThrow();
    await expect(
      sanitizeImage(Buffer.from('<svg/>'), 'image/svg+xml'),
    ).rejects.toThrow();
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    await expect(sanitizeImage(png, 'image/jpeg')).rejects.toThrow();
  });
  it('rejects excessive bytes and pixels', async () => {
    await expect(
      sanitizeImage(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'),
    ).rejects.toThrow();
    const large = await sharp({
      create: { width: 4000, height: 4000, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    await expect(sanitizeImage(large, 'image/png')).rejects.toThrow();
  });
  it('fails closed without Neon storage credentials', () => {
    expect(() =>
      new NeonStorageTransport(new ConfigService()).configured(),
    ).toThrow('not configured');
  });
  it('accepts only configured Neon branch endpoints and outputs public WebP URL', () => {
    const transport = new NeonStorageTransport(new ConfigService({
      storage: {
        endpoint: 'https://br-example.storage.c-7.eu-central-1.aws.neon.tech',
        bucket: 'nexora-public', region: 'eu-central-1',
        accessKeyId: 'fixture', secretAccessKey: 'fixture-secret',
      },
    }));
    expect(transport.url('nexora/business/asset')).toBe(
      'https://br-example.storage.c-7.eu-central-1.aws.neon.tech/nexora-public/nexora/business/asset.webp',
    );
  });
  it('finds nested media while leaving outbound contact links alone', () => {
    expect(
      sectionMediaUrls({
        images: [{ src: 'https://example.test/image.png', alt: 'Photo' }],
        buttonUrl: 'https://example.test/',
      }),
    ).toEqual(['https://example.test/image.png']);
  });
  it('bounds in-flight uploads and releases capacity on completion/cancellation', () => {
    const gate = new MediaCapacityInterceptor();
    const pending = new Subject();
    const next = { handle: () => pending };
    const context = {} as ExecutionContext;
    const one = gate.intercept(context, next).subscribe();
    const two = gate.intercept(context, next).subscribe();
    expect(() => gate.intercept(context, next)).toThrow('busy');
    one.unsubscribe();
    expect(() =>
      gate.intercept(context, next).subscribe().unsubscribe(),
    ).not.toThrow();
    two.unsubscribe();
  });
  it('signs a direct PUT to Neon without leaking credentials', async () => {
    const mock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    try {
      const transport = new NeonStorageTransport(new ConfigService({
        storage: {
          endpoint: 'https://br-example.storage.c-7.eu-central-1.aws.neon.tech',
          bucket: 'nexora-public', region: 'eu-central-1',
          accessKeyId: 'fixture', secretAccessKey: 'fixture-secret',
        },
      }));
      await transport.upload('nexora/business/asset', Buffer.from('fake'));
      const [url, init] = mock.mock.calls[0];
      expect(String(url)).toContain('/nexora-public/nexora/business/asset.webp');
      expect(init?.redirect).toBe('error');
      expect((init?.headers as Record<string,string>).authorization).toContain('AWS4-HMAC-SHA256');
      expect(JSON.stringify(init)).not.toContain('fixture-secret');
    } finally {
      mock.mockRestore();
    }
  });
});
