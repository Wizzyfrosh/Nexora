export interface MediaAsset {
  id: string;
  url: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MAX_PIXELS = 12_000_000;
export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
