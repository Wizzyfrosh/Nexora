import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductAvailability } from '@prisma/client';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: jest.Mocked<ProductRepository>;

  const mockProduct = {
    id: 'product-id-123',
    businessId: 'business-id-123',
    name: 'Leather Bag',
    slug: 'leather-bag',
    price: 15000,
    availability: ProductAvailability.IN_STOCK,
  } as any;

  const mockCategory = {
    id: 'cat-id-123',
    businessId: 'business-id-123',
    name: 'Bags',
    slug: 'bags',
  } as any;

  beforeEach(async () => {
    const mockProductRepo = {
      getCategories: jest.fn(),
      findCategoryBySlug: jest.fn(),
      createCategory: jest.fn(),
      getProducts: jest.fn(),
      findProductById: jest.fn(),
      findProductBySlug: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: ProductRepository, useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepo = module.get(ProductRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('categories', () => {
    it('should retrieve all categories', async () => {
      productRepo.getCategories.mockResolvedValue([mockCategory]);

      const result = await service.getCategories('business-id-123');

      expect(productRepo.getCategories).toHaveBeenCalledWith('business-id-123');
      expect(result).toEqual([mockCategory]);
    });

    it('should successfully create a new category', async () => {
      productRepo.findCategoryBySlug.mockResolvedValue(null);
      productRepo.createCategory.mockResolvedValue(mockCategory);

      const result = await service.createCategory('business-id-123', {
        name: 'Bags',
      });

      expect(productRepo.findCategoryBySlug).toHaveBeenCalledWith(
        'business-id-123',
        'bags',
      );
      expect(productRepo.createCategory).toHaveBeenCalledWith(
        'business-id-123',
        { name: 'Bags' },
        'bags',
      );
      expect(result).toEqual(mockCategory);
    });

    it('should throw BadRequestException if category slug already exists', async () => {
      productRepo.findCategoryBySlug.mockResolvedValue(mockCategory);

      await expect(
        service.createCategory('business-id-123', { name: 'Bags' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('products', () => {
    it('should retrieve paginated list of products', async () => {
      const mockResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      productRepo.getProducts.mockResolvedValue(mockResult);

      const result = await service.getProducts('business-id-123', 1, 10);

      expect(productRepo.getProducts).toHaveBeenCalledWith(
        'business-id-123',
        1,
        10,
      );
      expect(result).toEqual(mockResult);
    });

    it('should retrieve single product by ID', async () => {
      productRepo.findProductById.mockResolvedValue(mockProduct);

      const result = await service.getProduct(
        'business-id-123',
        'product-id-123',
      );

      expect(productRepo.findProductById).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
      );
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product by ID does not exist', async () => {
      productRepo.findProductById.mockResolvedValue(null);

      await expect(
        service.getProduct('business-id-123', 'product-id-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a product with unique slug', async () => {
      productRepo.findProductBySlug.mockResolvedValue(null);
      productRepo.createProduct.mockResolvedValue(mockProduct);

      const result = await service.createProduct('business-id-123', {
        name: 'Leather Bag',
        price: 15000,
      });

      expect(productRepo.createProduct).toHaveBeenCalledWith(
        'business-id-123',
        { name: 'Leather Bag', price: 15000 },
        'leather-bag',
      );
      expect(result).toEqual(mockProduct);
    });

    it('should generate a counter slug if product slug already exists', async () => {
      productRepo.findProductBySlug
        .mockResolvedValueOnce(mockProduct) // 'leather-bag' exists
        .mockResolvedValueOnce(null); // 'leather-bag-1' free
      productRepo.createProduct.mockResolvedValue({
        ...mockProduct,
        slug: 'leather-bag-1',
      });

      const result = await service.createProduct('business-id-123', {
        name: 'Leather Bag',
        price: 15000,
      });

      expect(productRepo.findProductBySlug).toHaveBeenNthCalledWith(
        1,
        'business-id-123',
        'leather-bag',
      );
      expect(productRepo.findProductBySlug).toHaveBeenNthCalledWith(
        2,
        'business-id-123',
        'leather-bag-1',
      );
      expect(result.slug).toBe('leather-bag-1');
    });

    it('should update product if exists', async () => {
      productRepo.findProductById.mockResolvedValue(mockProduct);
      productRepo.updateProduct.mockResolvedValue({
        ...mockProduct,
        price: 18000,
      });

      const result = await service.updateProduct(
        'business-id-123',
        'product-id-123',
        {
          price: 18000,
        },
      );

      expect(productRepo.findProductById).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
      );
      expect(productRepo.updateProduct).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
        { price: 18000 },
      );
      expect(result.price).toBe(18000);
    });

    it('should delete product if exists', async () => {
      productRepo.findProductById.mockResolvedValue(mockProduct);
      productRepo.deleteProduct.mockResolvedValue(mockProduct);

      await service.deleteProduct('business-id-123', 'product-id-123');

      expect(productRepo.findProductById).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
      );
      expect(productRepo.deleteProduct).toHaveBeenCalledWith(
        'product-id-123',
        'business-id-123',
      );
    });
  });
});
