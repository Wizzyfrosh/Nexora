import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'node:crypto';

/** Neon Object Storage supports S3 SigV4 with path-style bucket addressing. */
@Injectable()
export class NeonStorageTransport {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const endpoint = this.config.get<string>('storage.endpoint') || '';
    const region = this.config.get<string>('storage.region') || '';
    const bucket = this.config.get<string>('storage.bucket') || '';
    const accessKey = this.config.get<string>('storage.accessKeyId') || '';
    const secret = this.config.get<string>('storage.secretAccessKey') || '';
    let url: URL;
    try { url = new URL(endpoint); }
    catch { throw new ServiceUnavailableException('Object storage is not configured'); }
    if (
      url.protocol !== 'https:' || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/' ||
      !/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket) ||
      !/^[-a-z0-9]+$/.test(region) ||
      !accessKey || !secret
    ) throw new ServiceUnavailableException('Object storage is not configured');
    // Only Neon branch endpoints are permitted; never sign requests to arbitrary hosts.
    if (!/^[a-z0-9-]+\.storage\.c-[0-9]+\.[a-z0-9-]+\.aws\.neon\.tech$/.test(url.hostname))
      throw new ServiceUnavailableException('Object storage endpoint is not a Neon branch');
    return { url, region, bucket, accessKey, secret };
  }

  configured() { this.settings(); }

  url(publicId: string): string {
    const { url, bucket } = this.settings();
    return new URL(
      '/' + bucket + '/' + publicId.split('/').map(encodeURIComponent).join('/') + '.webp',
      url,
    ).href;
  }

  private async signedRequest(method: 'PUT' | 'DELETE', publicId: string, bytes?: Buffer) {
    const { url, region, bucket, accessKey, secret } = this.settings();
    if (!/^nexora\/[a-zA-Z0-9-]{1,80}\/[a-zA-Z0-9-]{1,80}$/.test(publicId))
      throw new ServiceUnavailableException('Invalid storage object key');
    const path = '/' + bucket + '/' + publicId + '.webp';
    const payloadHash = createHash('sha256').update(bytes || Buffer.alloc(0)).digest('hex');
    const now = new Date();
    const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const stamp = iso.slice(0, 8);
    const headers: Record<string, string> = {
      'host': url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': iso,
    };
    if (method === 'PUT') {
      headers['content-type'] = 'image/webp';
      headers['cache-control'] = 'public, max-age=31536000, immutable';
      headers['if-none-match'] = '*';
    }
    const names = Object.keys(headers).sort();
    const canonical = names.map(k => k + ':' + headers[k].trim() + '\n').join('');
    const scope = stamp + '/' + region + '/s3/aws4_request';
    const request = [method, path, '', canonical, names.join(';'), payloadHash].join('\n');
    const digest = createHash('sha256').update(request).digest('hex');
    const stringToSign = ['AWS4-HMAC-SHA256', iso, scope, digest].join('\n');
    const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();
    const key = hmac(hmac(hmac(hmac('AWS4' + secret, stamp), region), 's3'), 'aws4_request');
    headers.authorization = 'AWS4-HMAC-SHA256 Credential=' + accessKey + '/' + scope +
      ', SignedHeaders=' + names.join(';') +
      ', Signature=' + createHmac('sha256', key).update(stringToSign).digest('hex');
    try {
      const response = await fetch(new URL(path, url), {
        method,
        headers,
        ...(bytes ? { body: new Uint8Array(bytes) } : {}),
        signal: AbortSignal.timeout(20000),
        redirect: 'error',
      });
      if (!response.ok && !(method === 'DELETE' && response.status === 404))
        throw new Error('Object storage rejected request');
    } catch {
      throw new ServiceUnavailableException('Object storage request failed; retry later');
    }
  }

  async upload(publicId: string, bytes: Buffer) {
    await this.signedRequest('PUT', publicId, bytes);
  }

  async destroy(publicId: string) {
    await this.signedRequest('DELETE', publicId);
  }
}
