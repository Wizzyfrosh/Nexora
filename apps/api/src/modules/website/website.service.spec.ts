import { WebsiteService } from './website.service';
import { WebsiteRepository } from './website.repository';
import { BusinessService } from '../business/business.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WebsiteService security', () => {
  const repo = {
    findByBusinessId: jest.fn(),
    createDefaultWebsite: jest.fn(),
    replaceSections: jest.fn(),
    getThemes: jest.fn(),
    getSubscriptionForBusiness: jest.fn(),
  };
  const service = new WebsiteService(
    repo as unknown as WebsiteRepository,
    {} as BusinessService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    repo.getSubscriptionForBusiness.mockResolvedValue({ plan: 'TRIAL', status: 'TRIAL' });
  });
  it('delegates valid complete saves to the tenant-scoped transaction', async () => {
    repo.findByBusinessId.mockResolvedValue({ id: 'site-a' });
    repo.replaceSections.mockResolvedValue([]);
    const sections = [
      { id: 'section-a', type: 'HERO', content: { headline: 'Welcome' } },
    ];
    await service.saveSections('business-a', sections);
    expect(repo.replaceSections).toHaveBeenCalledWith(
      'business-a',
      'site-a',
      sections,
    );
  });
  it.each(
    [
      {},
      [
        { id: 'same', type: 'HERO', content: {} },
        { id: 'same', type: 'ABOUT', content: {} },
      ],
      [{ type: 'SCRIPT', content: {} }],
      [{ type: 'HERO', content: { buttonUrl: 'javascript:alert(1)' } }],
      [{ type: 'HERO', content: { html: '<script>alert(1)</script>' } }],
      Array.from({ length: 31 }, () => ({ type: 'ABOUT', content: {} })),
    ].map((input) => [input]),
  )(
    'rejects malformed/executable sections before touching persistence: %p',
    async (input) => {
      await expect(service.saveSections('business-a', input)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.findByBusinessId).not.toHaveBeenCalled();
      expect(repo.replaceSections).not.toHaveBeenCalled();
    },
  );
  it('public configuration cannot initialize a missing website', async () => {
    repo.findByBusinessId.mockResolvedValue(null);
    await expect(service.getPublicWebsiteConfig('a')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.createDefaultWebsite).not.toHaveBeenCalled();
  });
  it('public configuration omits private fields and deleted sections', async () => {
    repo.findByBusinessId.mockResolvedValue({
      id: 'private',
      businessId: 'a',
      customDomain: 'private.example',
      theme: 'DEFAULT',
      colorPalette: {},
      typography: {},
      sections: [
        {
          id: 's',
          type: 'HERO',
          order: 0,
          content: { headline: 'Hello' },
          deletedAt: null,
        },
        { type: 'ABOUT', deletedAt: new Date() },
      ],
    });
    expect(await service.getPublicWebsiteConfig('a')).toEqual({
      theme: 'DEFAULT',
      colorPalette: {},
      typography: {},
      sections: [{ type: 'HERO', order: 0, content: { headline: 'Hello' } }],
    });
  });
});
