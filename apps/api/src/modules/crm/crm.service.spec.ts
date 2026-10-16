import { Test, TestingModule } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { CrmRepository } from './crm.repository';

describe('CrmService', () => {
  let service: CrmService;
  let crmRepo: jest.Mocked<CrmRepository>;

  const mockLead = {
    id: 'lead-id-123',
    businessId: 'business-id-123',
    name: 'Emmanuel O.',
    email: 'emmanuel@example.com',
    phone: '+234 801 234 5678',
    message: 'Hi, do you have the wallet in brown?',
    source: 'product-page',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockCrmRepo = {
      createLead: jest.fn(),
      getLeads: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      deleteLead: jest.fn(),
      getLeadStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: CrmRepository, useValue: mockCrmRepo },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
    crmRepo = module.get(CrmRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('captureLead', () => {
    it('should create a lead via the repository', async () => {
      const dto = {
        name: 'Emmanuel O.',
        email: 'emmanuel@example.com',
        phone: '+234 801 234 5678',
        message: 'Hi, do you have the wallet in brown?',
        source: 'product-page',
      };
      crmRepo.createLead.mockResolvedValue(mockLead);

      const result = await service.captureLead('business-id-123', dto);

      expect(crmRepo.createLead).toHaveBeenCalledWith('business-id-123', dto);
      expect(result).toEqual({ id: mockLead.id });
    });
  });

  describe('getLeads', () => {
    it('should retrieve paginated leads', async () => {
      const mockResult = {
        data: [mockLead],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      crmRepo.getLeads.mockResolvedValue(mockResult);

      const result = await service.getLeads('business-id-123', 1, 20);

      expect(crmRepo.getLeads).toHaveBeenCalledWith(
        'business-id-123',
        1,
        20,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass search filter to repository', async () => {
      const mockResult = {
        data: [mockLead],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      crmRepo.getLeads.mockResolvedValue(mockResult);

      const result = await service.getLeads(
        'business-id-123',
        1,
        20,
        'emmanuel',
      );

      expect(crmRepo.getLeads).toHaveBeenCalledWith(
        'business-id-123',
        1,
        20,
        'emmanuel',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread lead count', async () => {
      crmRepo.getUnreadCount.mockResolvedValue(5);

      const result = await service.getUnreadCount('business-id-123');

      expect(crmRepo.getUnreadCount).toHaveBeenCalledWith('business-id-123');
      expect(result).toBe(5);
    });
  });

  describe('getLeadStats', () => {
    it('should return aggregated lead statistics', async () => {
      const mockStats = { total: 128, unread: 3, thisWeek: 12 };
      crmRepo.getLeadStats.mockResolvedValue(mockStats);

      const result = await service.getLeadStats('business-id-123');

      expect(crmRepo.getLeadStats).toHaveBeenCalledWith('business-id-123');
      expect(result).toEqual(mockStats);
    });
  });

  describe('markLeadAsRead', () => {
    it('should mark a lead as read', async () => {
      const readLead = { ...mockLead, isRead: true };
      crmRepo.markAsRead.mockResolvedValue(readLead);

      const result = await service.markLeadAsRead(
        'business-id-123',
        'lead-id-123',
      );

      expect(crmRepo.markAsRead).toHaveBeenCalledWith(
        'lead-id-123',
        'business-id-123',
      );
      expect(result.isRead).toBe(true);
    });
  });

  describe('deleteLead', () => {
    it('should delete a lead', async () => {
      crmRepo.deleteLead.mockResolvedValue(mockLead);

      await service.deleteLead('business-id-123', 'lead-id-123');

      expect(crmRepo.deleteLead).toHaveBeenCalledWith(
        'lead-id-123',
        'business-id-123',
      );
    });
  });

  describe('legacy click tracking', () => {
    it('rejects the retired session/IP collection path', () => {
      expect(() => service.logWhatsAppClick()).toThrow('Use the consent-based analytics event endpoint');
    });
  });
});
