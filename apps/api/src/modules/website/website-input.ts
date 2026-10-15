import { BadRequestException } from '@nestjs/common';
import { Prisma, SectionType } from '@prisma/client';
export type SectionInput = {
  id?: string;
  type: string;
  content: Prisma.InputJsonObject;
};
export function validateSections(
  input: unknown,
): asserts input is SectionInput[] {
  if (!Array.isArray(input) || input.length > 30)
    throw new BadRequestException(
      'Sections must be an array with at most 30 items',
    );
  const ids = new Set<string>();
  for (const section of input) {
    if (
      !section ||
      typeof section !== 'object' ||
      Array.isArray(section) ||
      !Object.values(SectionType).includes(section.type) ||
      !section.content ||
      typeof section.content !== 'object' ||
      Array.isArray(section.content)
    )
      throw new BadRequestException('Invalid section type or content');
    if (section.id !== undefined) {
      if (typeof section.id !== 'string' || !section.id || ids.has(section.id))
        throw new BadRequestException('Invalid or duplicate section ID');
      ids.add(section.id);
    }
    validateContent(section.content);
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 100_000)
    throw new BadRequestException('Section content is too large');
}
function validateContent(value: unknown, depth = 0) {
  if (depth > 8)
    throw new BadRequestException('Section content is too deeply nested');
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:__proto__|prototype|constructor|html|script|style)$/i.test(key))
        throw new BadRequestException(
          'Executable section content is not supported',
        );
      if (
        /(?:url|href|src|link)$/i.test(key) &&
        typeof child === 'string' &&
        child
      ) {
        if (/^#[a-zA-Z0-9_-]+$/.test(child)) continue;
        if (
          child.startsWith('/') &&
          !child.startsWith('//') &&
          !child.includes('\\')
        )
          continue;
        try {
          if (new URL(child).protocol !== 'https:') throw new Error();
        } catch {
          throw new BadRequestException(
            'Section links and media must use HTTPS or a local path',
          );
        }
      }
      validateContent(child, depth + 1);
    }
  }
}
