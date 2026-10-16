import { BadRequestException } from '@nestjs/common';
export function assertBusinessUrls(data: {
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: unknown;
}) {
  const valid = (value: unknown) => {
    if (value === '' || value === undefined || value === null) return;
    try {
      const url = new URL(String(value));
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error();
    } catch {
      throw new BadRequestException(
        'Business image and social links must use HTTPS',
      );
    }
  };
  valid(data.logoUrl);
  valid(data.bannerUrl);
  if (data.socialLinks !== undefined && data.socialLinks !== null) {
    if (typeof data.socialLinks !== 'object' || Array.isArray(data.socialLinks))
      throw new BadRequestException('Invalid social links');
    const allowed = [
      'facebook',
      'instagram',
      'twitter',
      'linkedin',
      'tiktok',
      'youtube',
    ];
    for (const [key, value] of Object.entries(data.socialLinks)) {
      if (
        !allowed.includes(key) ||
        typeof value !== 'string' ||
        value.length > 2048
      )
        throw new BadRequestException('Invalid social links');
      valid(value);
    }
  }
}
