import { Test, TestingModule } from '@nestjs/testing';
import { WebsiteService } from './website.service';
import { WebsiteRepository } from './website.repository';
import { BusinessService } from '../business/business.service';
import { BadRequestException } from '@nestjs/common';

describe('WebsiteService', () => {
  let service: WebsiteService;
  let websiteRepo: jest.Mocked<WebsiteRepository>;
  let businessService: jest.Mocked<BusinessService>;

  const mockWebsite = {
    id: 'website-id-123',
    businessId: 'business-id-123',
    theme: 'DEFAULT',
    colorPalette: { primary: '#4f46e5' },
    typography: { heading: 'Inter' },
    sections: [
      { id: 'section-1', type: 'HERO', order: 0, content: { headline: 'Hello' } },
      { id: 'section-2', type: 'ABOUT', order: 1, content: { title: 'About' } },
    ],
  } as any;

  beforeEach(async () => {
    const mockWebsiteRepo = {
      findByBusinessId: jest.fn(),
      createDefaultWebsite: jest.fn(),
      updateTheme: jest.fn(),
      updateCustomDomain: jest.fn(),
      upsertSection: jest.fn(),
      deleteSection: jest.fn(),
      getThemes: jest.fn(),
    };

    const mockBusinessService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsiteService,
        { provide: WebsiteRepository, useValue: mockWebsiteRepo },
        { provide: BusinessService, useValue: mockBusinessService },
      ],
    }).compile();

    service = module.get<WebsiteService>(WebsiteService);
    websiteRepo = module.get(WebsiteRepository);
    businessService = module.get(BusinessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWebsiteConfig', () => {
    it('should return existing website config if it exists', async () => {
      websiteRepo.findByBusinessId.mockResolvedValue(mockWebsite);

      const result = await service.getWebsiteConfig('business-id-123');

      expect(websiteRepo.findByBusinessId).toHaveBeenCalledWith('business-id-123');
      expect(result).toEqual(mockWebsite);
    });

    it('should create and return a default website config if none exists', async () => {
      websiteRepo.findByBusinessId.mockResolvedValue(null);
      websiteRepo.createDefaultWebsite.mockResolvedValue(mockWebsite);

      const result = await service.getWebsiteConfig('business-id-123');

      expect(websiteRepo.findByBusinessId).toHaveBeenCalledWith('business-id-123');
      expect(websiteRepo.createDefaultWebsite).toHaveBeenCalledWith('business-id-123');
      expect(result).toEqual(mockWebsite);
    });
  });

  describe('updateTheme', () => {
    it('should successfully update theme settings', async () => {
      websiteRepo.findByBusinessId.mockResolvedValue(mockWebsite);
      websiteRepo.updateTheme.mockResolvedValue({ ...mockWebsite, theme: 'MODERN_WHITE' });

      const result = await service.updateTheme('business-id-123', {
        theme: 'MODERN_WHITE',
        colorPalette: { primary: '#000' },
        typography: { heading: 'Outfit' },
      });

      expect(websiteRepo.updateTheme).toHaveBeenCalledWith(
        'business-id-123',
        'MODERN_WHITE',
        { primary: '#005f46e5' && '#000' },
        { heading: 'Outfit' },
      );
      expect(result.theme).toBe('MODERN_WHITE');
    });
  });

  describe('saveSections', () => {
    it('should upsert sections and delete removed sections', async () => {
      websiteRepo.findByBusinessId.mockResolvedValue(mockWebsite);
      websiteRepo.upsertSection.mockImplementation(async (webId, secId, type, order, content) => {
        return { id: secId || 'new-sec-id', type, order, content } as any;
      });

      const incomingPayload = [
        { id: 'section-1', type: 'HERO', content: { headline: 'Updated Hello' } },
        { type: 'CONTACT', content: { title: 'Contact Us' } },
      ];

      const result = await service.saveSections('business-id-123', incomingPayload);

      // Verify deleteSection was called for section-2 (which was not in payload)
      expect(websiteRepo.deleteSection).toHaveBeenCalledWith('section-2');
      expect(websiteRepo.deleteSection).not.toHaveBeenCalledWith('section-1');

      // Verify upsertSection was called for both
      expect(websiteRepo.upsertSection).toHaveBeenCalledWith(
        'website-id-123',
        'section-1',
        'HERO',
        0,
        { headline: 'Updated Hello' },
      );
      expect(websiteRepo.upsertSection).toHaveBeenCalledWith(
        'website-id-123',
        undefined,
        'CONTACT',
        1,
        { title: 'Contact Us' },
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('section-1');
      expect(result[1].id).toBe('new-sec-id');
    });

    it('should throw BadRequestException if sections payload is not an array', async () => {
      websiteRepo.findByBusinessId.mockResolvedValue(mockWebsite);

      await expect(
        service.saveSections('business-id-123', {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getThemes', () => {
    it('should return all themes from repository', async () => {
      const mockThemes = [{ name: 'Modern White' }] as any[];
      websiteRepo.getThemes.mockResolvedValue(mockThemes);

      const result = await service.getThemes();

      expect(websiteRepo.getThemes).toHaveBeenCalled();
      expect(result).toEqual(mockThemes);
    });
  });
});
