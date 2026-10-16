import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  MEDIA_MAX_BYTES,
  MEDIA_MAX_PIXELS,
  MEDIA_MIME_TYPES,
} from '@nexora/shared-types';

export async function sanitizeImage(buffer: Buffer, mime: string) {
  const magic =
    mime === 'image/png'
      ? buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === 'image/jpeg'
        ? buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        : mime === 'image/webp' &&
          buffer.subarray(0, 4).toString() === 'RIFF' &&
          buffer.subarray(8, 12).toString() === 'WEBP';
  if (!magic)
    throw new BadRequestException('File bytes do not match the image type');
  // Reject APNG before decoding; libvips may otherwise expose only its first frame.
  if (mime === 'image/png') {
    for (let offset = 8; offset + 12 <= buffer.length; ) {
      const length = buffer.readUInt32BE(offset);
      if (buffer.subarray(offset + 4, offset + 8).toString() === 'acTL')
        throw new BadRequestException('Animated images are not supported');
      offset += length + 12;
    }
  }
  if (
    !buffer.length ||
    buffer.length > MEDIA_MAX_BYTES ||
    !MEDIA_MIME_TYPES.includes(mime as (typeof MEDIA_MIME_TYPES)[number])
  )
    throw new BadRequestException('Use a JPEG, PNG or WebP image up to 5 MiB');
  try {
    const image = sharp(buffer, {
      limitInputPixels: MEDIA_MAX_PIXELS,
      failOn: 'warning',
      animated: false,
    });
    const meta = await image.metadata();
    const expected = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
    }[mime];
    if (
      meta.format !== expected ||
      !meta.width ||
      !meta.height ||
      meta.width * meta.height > MEDIA_MAX_PIXELS ||
      (meta.pages ?? 1) !== 1
    )
      throw new Error();
    // Re-encoding removes metadata and prevents uploaded HTML/SVG/polyglot bytes
    // from being served as the original file. No attacker URLs or filenames used.
    const { data, info } = await image
      .rotate()
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MEDIA_MAX_BYTES) throw new Error();
    return { data, width: info.width, height: info.height };
  } catch {
    throw new BadRequestException(
      'The image is invalid, animated or exceeds 12 megapixels',
    );
  }
}
