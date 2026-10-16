import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  releasedSections,
  normalizeStorefrontHandle,
} from '@nexora/shared-types';
import { StorefrontService } from './storefront.service';
import { StorefrontRepository } from './storefront.repository';
import { configuration } from '../../config/configuration';
import { SectionsRequest } from '../../common/dto/content.dto';
import { validateSections } from '../website/website-input';

describe('Released storefront contracts', () => {
  it('preserves plain section objects through the actual HTTP ValidationPipe', async () => {
    const sections = [
      {
        type: 'HERO',
        content: { headline: 'Real story', buttonLink: '#contact' },
      },
      { type: 'CONTACT', content: { email: true } },
    ];
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const result = (await pipe.transform(
      { sections },
      { type: 'body', metatype: SectionsRequest },
    )) as unknown as SectionsRequest;
    expect(result.sections).toEqual(sections);
    expect(Array.isArray(result.sections[0])).toBe(false);
    expect(() => validateSections(result.sections)).not.toThrow();
    expect(() => releasedSections(result.sections)).not.toThrow();
  });
  it.each(['@ade-studio', '%40ade-studio'])(
    'normalises a Next route segment %s',
    (handle) => {
      expect(normalizeStorefrontHandle(handle)).toBe('@ade-studio');
    },
  );
  it.each([
    '%2540ade-studio',
    '@../secret',
    '@name?query',
    '%GG',
    '@a/b',
    '@' + 'a'.repeat(101),
  ])('rejects unsafe route segment %s', (handle) => {
    expect(normalizeStorefrontHandle(handle)).toBeNull();
  });
  it.each(['TESTIMONIALS', 'HTML', 'TEAM', 'constructor'])(
    'rejects unsupported section %s',
    (type) => {
      expect(() => releasedSections([{ type, content: {} }])).toThrow();
    },
  );
  it.each<Record<string, unknown>>([
    { html: '<script>evil()</script>' },
    { constructor: 'attack' },
    { buttonLink: 'javascript:alert(1)' },
    { buttonLink: 'https://example.test' },
    { imageUrl: 'data:image/svg+xml,evil' },
    { headline: 'a'.repeat(161) },
    { email: true },
    { headline: { nested: 'not text' } },
  ])('rejects unsupported hero fields: %j', (content) => {
    expect(() => releasedSections([{ type: 'HERO', content }])).toThrow();
  });
  it('rejects duplicates and oversized section lists', () => {
    expect(() =>
      releasedSections(
        Array.from({ length: 6 }, () => ({ type: 'HERO', content: {} })),
      ),
    ).toThrow();
    expect(() =>
      releasedSections([
        { type: 'HERO', content: {} },
        { type: 'HERO', content: {} },
      ]),
    ).toThrow();
  });
  it('projects section data without leaking persistence fields', () => {
    expect(
      releasedSections([
        {
          id: 'id',
          websiteId: 'secret',
          type: 'HERO',
          content: {
            headline: '<script>plain text</script>',
            buttonLink: '#contact',
          },
        },
      ]),
    ).toEqual([
      {
        id: 'id',
        type: 'HERO',
        content: {
          headline: '<script>plain text</script>',
          buttonLink: '#contact',
        },
      },
    ]);
  });
  it('defaults publication to off', () => {
    const previous = process.env.PUBLIC_PUBLISHING_ENABLED;
    delete process.env.PUBLIC_PUBLISHING_ENABLED;
    expect(configuration().publishingEnabled).toBe(false);
    if (previous !== undefined)
      process.env.PUBLIC_PUBLISHING_ENABLED = previous;
  });
});

describe('Storefront publication policy', () => {
  const fixture = () => ({
    id: 'business',
    slug: 'business',
    name: 'Business',
    isPublished: true,
    deletedAt: null,
    owner: { emailVerified: true },
    subscription: {
      status: 'TRIAL',
      deletedAt: null,
      trialEndDate: new Date(Date.now() + 60_000),
      currentPeriodEnd: null,
    },
    website: {
      theme: 'DEFAULT',
      deletedAt: null,
      colorPalette: { primary: '#8044b6' },
      sections: [
        { type: 'HERO', content: {} },
        { type: 'CONTACT', content: {} },
      ],
    },
  });
  function setup(enabled = true) {
    const b = fixture();
    const tx = {
      business: {
        findUnique: jest.fn().mockResolvedValue(b),
        findUniqueOrThrow: jest.fn().mockResolvedValue(b),
        update: jest.fn().mockResolvedValue(b),
      },
      subscription: { updateMany: jest.fn() },
      media: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { create: jest.fn() },
    };
    const repo = {
      business: tx.business,
      $transaction: jest.fn((work: (value: typeof tx) => unknown) => work(tx)),
    };
    return {
      b,
      tx,
      service: new StorefrontService(
        repo as unknown as StorefrontRepository,
        new ConfigService({ publishingEnabled: enabled }),
      ),
    };
  }
  it('refuses publication when the rollout is off without recording an audit success', async () => {
    const { service, tx } = setup(false);
    await expect(
      service.publish('business', 'owner', true),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('allows unpublishing despite disabled rollout and expired entitlement', async () => {
    const { b, service, tx } = setup(false);
    b.subscription.trialEndDate = new Date(0);
    await expect(service.publish('business', 'owner', false)).resolves.toEqual({
      isPublished: false,
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner',
        action: 'WEBSITE_UNPUBLISHED',
        entity: 'Business',
        entityId: 'business',
      },
    });
  });
  it('requires a verified owner before publishing or reading', async () => {
    const { b, service } = setup();
    b.owner.emailVerified = false;
    await expect(
      service.publish('business', 'owner', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.read({ slug: 'business' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([0, -1, 1.5, NaN, 10001])(
    'rejects page %s before querying',
    async (page) => {
      const { service, tx } = setup();
      await expect(
        service.read({ slug: 'business' }, false, page),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.business.findUnique).not.toHaveBeenCalled();
    },
  );
  it('publishes atomically with an owner audit event', async () => {
    const { service, tx } = setup();
    await expect(service.publish('business', 'owner', true)).resolves.toEqual({
      isPublished: true,
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner',
        action: 'WEBSITE_PUBLISHED',
        entity: 'Business',
        entityId: 'business',
      },
    });
  });
});
