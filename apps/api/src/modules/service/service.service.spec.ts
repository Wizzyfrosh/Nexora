import { Test, TestingModule } from '@nestjs/testing';
import { ServiceService } from './service.service';
import { ServiceRepository } from './service.repository';
import { NotFoundException } from '@nestjs/common';

describe('ServiceService', () => {
  let service: ServiceService;
  let serviceRepo: jest.Mocked<ServiceRepository>;

  const mockService = {
    id: 'service-id-123',
    businessId: 'business-id-123',
    name: 'Hair Styling',
    slug: 'hair-styling',
    price: 5000,
    priceLabel: 'Starting from',
    images: ['https://unsplash.com/123'],
  } as any;

  beforeEach(async () => {
    const mockServiceRepo = {
      getServices: jest.fn(),
      findServiceById: jest.fn(),
      findServiceBySlug: jest.fn(),
      createService: jest.fn(),
      updateService: jest.fn(),
      deleteService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        { provide: ServiceRepository, useValue: mockServiceRepo },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
    serviceRepo = module.get(ServiceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('services CRUD', () => {
    it('should retrieve paginated list of services', async () => {
      const mockResult = { data: [mockService], total: 1, page: 1, limit: 10, totalPages: 1 };
      serviceRepo.getServices.mockResolvedValue(mockResult);

      const result = await service.getServices('business-id-123', 1, 10);

      expect(serviceRepo.getServices).toHaveBeenCalledWith('business-id-123', 1, 10);
      expect(result).toEqual(mockResult);
    });

    it('should retrieve single service by ID', async () => {
      serviceRepo.findServiceById.mockResolvedValue(mockService);

      const result = await service.getService('business-id-123', 'service-id-123');

      expect(serviceRepo.findServiceById).toHaveBeenCalledWith('service-id-123', 'business-id-123');
      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException if service by ID does not exist', async () => {
      serviceRepo.findServiceById.mockResolvedValue(null);

      await expect(
        service.getService('business-id-123', 'service-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a service with unique slug', async () => {
      serviceRepo.findServiceBySlug.mockResolvedValue(null);
      serviceRepo.createService.mockResolvedValue(mockService);

      const result = await service.createService('business-id-123', {
        name: 'Hair Styling',
        price: 5000,
      });

      expect(serviceRepo.createService).toHaveBeenCalledWith(
        'business-id-123',
        { name: 'Hair Styling', price: 5000 },
        'hair-styling',
      );
      expect(result).toEqual(mockService);
    });

    it('should generate a counter slug if service slug already exists', async () => {
      serviceRepo.findServiceBySlug
        .mockResolvedValueOnce(mockService) // 'hair-styling' exists
        .mockResolvedValueOnce(null); // 'hair-styling-1' free
      serviceRepo.createService.mockResolvedValue({
        ...mockService,
        slug: 'hair-styling-1',
      });

      const result = await service.createService('business-id-123', {
        name: 'Hair Styling',
        price: 5000,
      });

      expect(serviceRepo.findServiceBySlug).toHaveBeenNthCalledWith(1, 'business-id-123', 'hair-styling');
      expect(serviceRepo.findServiceBySlug).toHaveBeenNthCalledWith(2, 'business-id-123', 'hair-styling-1');
      expect(result.slug).toBe('hair-styling-1');
    });

    it('should update service if exists', async () => {
      serviceRepo.findServiceById.mockResolvedValue(mockService);
      serviceRepo.updateService.mockResolvedValue({ ...mockService, price: 6000 });

      const result = await service.updateService('business-id-123', 'service-id-123', {
        price: 6000,
      });

      expect(serviceRepo.findServiceById).toHaveBeenCalledWith('service-id-123', 'business-id-123');
      expect(serviceRepo.updateService).toHaveBeenCalledWith('service-id-123', { price: 6000 });
      expect(result.price).toBe(6000);
    });

    it('should delete service if exists', async () => {
      serviceRepo.findServiceById.mockResolvedValue(mockService);
      serviceRepo.deleteService.mockResolvedValue(mockService);

      await service.deleteService('business-id-123', 'service-id-123');

      expect(serviceRepo.findServiceById).toHaveBeenCalledWith('service-id-123', 'business-id-123');
      expect(serviceRepo.deleteService).toHaveBeenCalledWith('service-id-123');
    });
  });
});
