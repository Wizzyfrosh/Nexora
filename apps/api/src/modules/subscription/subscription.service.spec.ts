import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService } from './paystack.service';
import { AuthRepository } from '../auth/auth.repository';
import { BusinessService } from '../business/business.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subRepo: jest.Mocked<SubscriptionRepository>;
  let paystackService: jest.Mocked<PaystackService>;
  let authRepo: jest.Mocked<AuthRepository>;
  let businessService: jest.Mocked<BusinessService>;

  const mockBusiness = {
    id: 'business-id-123',
    ownerId: 'user-id-123',
    name: 'Test Business',
    slug: 'test-business',
  } as any;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
  } as any;

  const mockPlan = {
    id: 'plan-id-123',
    name: SubscriptionPlan.BASIC,
    displayName: 'Basic Plan',
    priceNgn: 50000,
    paystackPlanCode: 'PLN_basic_code',
  } as any;

  const mockSubscription = {
    id: 'sub-id-123',
    businessId: 'business-id-123',
    plan: SubscriptionPlan.TRIAL,
    status: SubscriptionStatus.TRIAL,
  } as any;

  beforeEach(async () => {
    const mockSubRepo = {
      findPlanByName: jest.fn(),
      findByBusinessId: jest.fn(),
      createPaymentRecord: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
      updatePaymentRecord: jest.fn(),
      findExpiredSubscriptions: jest.fn(),
    };

    const mockPaystackService = {
      initializeTransaction: jest.fn(),
      verifyTransaction: jest.fn(),
      validateWebhookSignature: jest.fn(),
    };

    const mockAuthRepo = {
      findUserById: jest.fn(),
    };

    const mockBusinessService = {
      getBusinessProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: SubscriptionRepository, useValue: mockSubRepo },
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: BusinessService, useValue: mockBusinessService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    subRepo = module.get(SubscriptionRepository);
    paystackService = module.get(PaystackService);
    authRepo = module.get(AuthRepository);
    businessService = module.get(BusinessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateSubscription', () => {
    it('should successfully initiate subscription checkout', async () => {
      businessService.getBusinessProfile.mockResolvedValue(mockBusiness);
      authRepo.findUserById.mockResolvedValue(mockUser);
      subRepo.findPlanByName.mockResolvedValue(mockPlan);
      subRepo.findByBusinessId.mockResolvedValue(mockSubscription);
      
      paystackService.initializeTransaction.mockResolvedValue({
        status: true,
        message: 'Success',
        data: {
          authorization_url: 'https://checkout.paystack.com/mock',
          access_code: 'access-123',
          reference: 'ref-123',
        },
      });

      const result = await service.initiateSubscription('user-id-123', 'business-id-123', {
        plan: 'BASIC' as any,
        callbackUrl: 'http://localhost/callback',
      });

      expect(businessService.getBusinessProfile).toHaveBeenCalledWith('business-id-123');
      expect(authRepo.findUserById).toHaveBeenCalledWith('user-id-123');
      expect(subRepo.findPlanByName).toHaveBeenCalledWith(SubscriptionPlan.BASIC);
      expect(paystackService.initializeTransaction).toHaveBeenCalled();
      expect(subRepo.createPaymentRecord).toHaveBeenCalledWith({
        subscriptionId: 'sub-id-123',
        amountNgn: 50000,
        paystackReference: 'ref-123',
        paystackStatus: 'PENDING',
        metadata: { plan: SubscriptionPlan.BASIC },
      });

      expect(result).toEqual({
        authorizationUrl: 'https://checkout.paystack.com/mock',
        reference: 'ref-123',
      });
    });

    it('should throw NotFoundException if business not owned by user', async () => {
      businessService.getBusinessProfile.mockResolvedValue({
        ...mockBusiness,
        ownerId: 'another-user',
      });

      await expect(
        service.initiateSubscription('user-id-123', 'business-id-123', {
          plan: 'BASIC' as any,
          callbackUrl: 'http://localhost/callback',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if plan not configured in database', async () => {
      businessService.getBusinessProfile.mockResolvedValue(mockBusiness);
      authRepo.findUserById.mockResolvedValue(mockUser);
      subRepo.findPlanByName.mockResolvedValue(null);

      await expect(
        service.initiateSubscription('user-id-123', 'business-id-123', {
          plan: 'BASIC' as any,
          callbackUrl: 'http://localhost/callback',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyPayment', () => {
    it('should successfully verify and activate subscription', async () => {
      paystackService.verifyTransaction.mockResolvedValue({
        status: true,
        message: 'Verified',
        data: {
          status: 'success',
          reference: 'ref-123',
          amount: 5000000,
          paid_at: '2026-06-13T12:00:00Z',
          metadata: {
            businessId: 'business-id-123',
            planName: SubscriptionPlan.BASIC,
          },
          customer: { customer_code: 'cust-123', email: 'test@example.com' },
          authorization: { authorization_code: 'auth-123', reusable: true },
        },
      } as any);

      const result = await service.verifyPayment('ref-123');

      expect(paystackService.verifyTransaction).toHaveBeenCalledWith('ref-123');
      expect(subRepo.updateSubscriptionStatus).toHaveBeenCalledWith('business-id-123', expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        plan: SubscriptionPlan.BASIC,
      }));
      expect(subRepo.updatePaymentRecord).toHaveBeenCalledWith('ref-123', expect.objectContaining({
        paystackStatus: 'SUCCESS',
      }));

      expect(result).toEqual({ success: true, message: 'Payment verified successfully' });
    });

    it('should return failure message if transaction was not successful', async () => {
      paystackService.verifyTransaction.mockResolvedValue({
        status: true,
        message: 'Failed',
        data: {
          status: 'failed',
          reference: 'ref-123',
        },
      } as any);

      const result = await service.verifyPayment('ref-123');
      expect(result).toEqual({ success: false, message: 'Payment not successful' });
    });
  });

  describe('checkExpiredSubscriptions', () => {
    it('should query and transition expired trials and active subscriptions', async () => {
      const expiredTrialSub = { businessId: 'expired-trial-id' } as any;
      const expiredActiveSub = { businessId: 'expired-active-id' } as any;

      subRepo.findExpiredSubscriptions.mockImplementation(async (status) => {
        if (status === SubscriptionStatus.TRIAL) {
          return [expiredTrialSub];
        }
        if (status === SubscriptionStatus.ACTIVE) {
          return [expiredActiveSub];
        }
        return [];
      });

      await service.checkExpiredSubscriptions();

      expect(subRepo.findExpiredSubscriptions).toHaveBeenCalledWith(SubscriptionStatus.TRIAL, expect.any(Date));
      expect(subRepo.findExpiredSubscriptions).toHaveBeenCalledWith(SubscriptionStatus.ACTIVE, expect.any(Date));

      expect(subRepo.updateSubscriptionStatus).toHaveBeenCalledWith('expired-trial-id', {
        status: SubscriptionStatus.EXPIRED,
      });
      expect(subRepo.updateSubscriptionStatus).toHaveBeenCalledWith('expired-active-id', {
        status: SubscriptionStatus.EXPIRED,
      });
    });
  });
});
