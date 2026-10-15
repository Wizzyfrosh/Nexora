import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export interface UploadedImage {
  asset_id: string;
  public_id: string;
  resource_type: string;
  type: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  version: number;
}
export function cloudinarySignature(
  params: Record<string, string>,
  secret: string,
) {
  const data = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha256')
    .update(data + secret)
    .digest('hex');
}
@Injectable()
export class CloudinaryTransport {
  constructor(private readonly config: ConfigService) {}
  private credentials() {
    const cloud = this.config.get<string>('cloudinary.cloudName') || '';
    const key = this.config.get<string>('cloudinary.apiKey') || '';
    const secret = this.config.get<string>('cloudinary.apiSecret') || '';
    if (!/^[a-zA-Z0-9_-]+$/.test(cloud) || !/^\d+$/.test(key) || !secret)
      throw new ServiceUnavailableException('Media storage is not configured');
    return { cloud, key, secret };
  }
  configured() {
    this.credentials();
  }
  private async send(
    action: 'upload' | 'destroy',
    params: Record<string, string>,
    data?: Buffer,
  ): Promise<unknown> {
    const { cloud, key, secret } = this.credentials();
    const form = new FormData();
    for (const [name, value] of Object.entries(params))
      form.append(name, value);
    form.append('api_key', key);
    form.append('signature', cloudinarySignature(params, secret));
    if (data)
      form.append(
        'file',
        new Blob([new Uint8Array(data)], { type: 'image/webp' }),
        'image.webp',
      );
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/${action}`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(20_000),
          redirect: 'error',
        },
      );
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'Media storage request failed; retry later',
      );
    }
  }
  async upload(publicId: string, bytes: Buffer) {
    return (await this.send(
      'upload',
      {
        public_id: publicId,
        overwrite: 'false',
        type: 'upload',
        allowed_formats: 'webp',
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
      bytes,
    )) as UploadedImage;
  }
  async destroy(publicId: string) {
    const result = (await this.send('destroy', {
      public_id: publicId,
      type: 'upload',
      invalidate: 'true',
      timestamp: String(Math.floor(Date.now() / 1000)),
    })) as { result?: string };
    if (!['ok', 'not found'].includes(result.result || ''))
      throw new ServiceUnavailableException('Media deletion not acknowledged');
  }
  url(publicId: string, version: number) {
    const { cloud } = this.credentials();
    return `https://res.cloudinary.com/${cloud}/image/upload/v${version}/${publicId}.webp`;
  }
}
