import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { sanitizeImage } from './media-image';
import {
  CloudinaryTransport,
  cloudinarySignature,
} from './cloudinary.transport';
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
  it('signs sorted server-defined parameters using SHA256', () => {
    expect(
      cloudinarySignature(
        { timestamp: '1', public_id: 'nexora/a/b' },
        'secret',
      ),
    ).toBe(
      createHash('sha256')
        .update('public_id=nexora/a/b&timestamp=1secret')
        .digest('hex'),
    );
  });
  it('fails closed without storage credentials', () => {
    expect(() =>
      new CloudinaryTransport(new ConfigService()).configured(),
    ).toThrow('not configured');
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
  it('sends signed server-defined fields only to the fixed provider host', async () => {
    const mock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ result: 'ok' }), { status: 200 }),
      );
    try {
      const transport = new CloudinaryTransport(
        new ConfigService({
          cloudinary: {
            cloudName: 'fixture',
            apiKey: '123',
            apiSecret: 'private-fixture',
          },
        }),
      );
      await transport.destroy('nexora/a/b');
      const [url, init] = mock.mock.calls[0];
      expect(url).toBe('https://api.cloudinary.com/v1_1/fixture/image/destroy');
      expect(init?.redirect).toBe('error');
      const fields = init?.body as FormData;
      expect(fields.get('invalidate')).toBe('true');
      expect(fields.get('public_id')).toBe('nexora/a/b');
      expect(fields.get('signature')).toMatch(/^[a-f0-9]{64}$/);
      expect([...fields.values()]).not.toContain('private-fixture');
    } finally {
      mock.mockRestore();
    }
  });
});
