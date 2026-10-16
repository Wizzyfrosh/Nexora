import { BadRequestException } from '@nestjs/common';
import { ThemeId } from '@prisma/client';
export function validateAppearance(data: {
  theme: string;
  colorPalette: unknown;
  typography: unknown;
}) {
  if (
    data.theme !== 'DEFAULT' &&
    !Object.values(ThemeId).includes(data.theme as ThemeId)
  )
    throw new BadRequestException('Unsupported theme');
  if (
    !data.colorPalette ||
    typeof data.colorPalette !== 'object' ||
    Array.isArray(data.colorPalette) ||
    Object.keys(data.colorPalette).length > 30
  )
    throw new BadRequestException('Invalid colour palette');
  for (const [key, value] of Object.entries(data.colorPalette)) {
    if (
      !/^[a-zA-Z]{1,40}$/.test(key) ||
      typeof value !== 'string' ||
      !/^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/.test(value)
    )
      throw new BadRequestException('Colours must use hexadecimal values');
  }
  if (
    !data.typography ||
    typeof data.typography !== 'object' ||
    Array.isArray(data.typography)
  )
    throw new BadRequestException('Invalid typography');
  const fonts = [
    'Inter',
    'Playfair Display',
    'Outfit',
    'Montserrat',
    'Cinzel',
    'Syncopate',
    'Space Grotesk',
    'DM Serif Display',
    'Syne',
    'Plus Jakarta Sans',
    'Open Sans',
  ];
  for (const [key, value] of Object.entries(data.typography)) {
    const valid =
      typeof value === 'string' &&
      ((['heading', 'body', 'headingFont', 'bodyFont'].includes(key) &&
        fonts.includes(value)) ||
        (['headingWeight', 'bodyWeight'].includes(key) &&
          /^[1-9]00$/.test(value)) ||
        (key === 'baseFontSize' && /^(?:1[2-9]|2[0-4])px$/.test(value)));
    if (!valid) throw new BadRequestException('Unsupported typography setting');
  }
}
