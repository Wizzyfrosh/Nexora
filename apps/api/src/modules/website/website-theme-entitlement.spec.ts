import { BadRequestException } from '@nestjs/common';
import { WebsiteRepository } from './website.repository';
import { PrismaService } from '../../database/prisma.service';

describe('Premium theme write gate', () => {
  const sub = { plan: 'BASIC', status: 'ACTIVE', currentPeriodEnd: new Date('2099-01-01') };
  const tx = {
    subscription: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(sub),
    },
    website: { update: jest.fn().mockResolvedValue({ theme: 'LUXURY_GOLD' }) },
  };
  const prisma = { $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)) };
  const repo = new WebsiteRepository(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    tx.subscription.findUnique.mockResolvedValue(sub);
  });

  it('blocks a direct API-style premium write for a Basic owner', async () => {
    await expect(repo.updateTheme('owner-business', 'LUXURY_GOLD', {primary:'#d4af37'}, {heading:'Inter'}))
      .rejects.toThrow(BadRequestException);
    expect(tx.website.update).not.toHaveBeenCalled();
  });

  it('allows a verified active paid Premium subscription to select a premium design', async () => {
    tx.subscription.findUnique.mockResolvedValue({plan:'PREMIUM', status:'ACTIVE', currentPeriodEnd:new Date('2099-01-01')});
    await expect(repo.updateTheme('owner-business','LUXURY_GOLD',{primary:'#d4af37'},{heading:'Inter'}))
      .resolves.toEqual({theme:'LUXURY_GOLD'});
    expect(tx.website.update).toHaveBeenCalledWith({
      where: {businessId:'owner-business'},
      data: {theme:'LUXURY_GOLD',colorPalette:{primary:'#d4af37'},typography:{heading:'Inter'}},
    });
  });

  it('rejects inactive Premium entitlements while permitting Basic designs', async () => {
    tx.subscription.findUnique.mockResolvedValue({plan:'PREMIUM', status:'EXPIRED', currentPeriodEnd:new Date('2099-01-01')});
    await expect(repo.updateTheme('owner-business','TECH_STARTUP',{},{})).rejects.toThrow();
    expect(tx.website.update).not.toHaveBeenCalled();
    await expect(repo.updateTheme('owner-business','BUSINESS_GREEN',{},{})).resolves.toEqual({theme:'LUXURY_GOLD'});
  });

  it('denies orphaned subscription records', async () => {
    tx.subscription.findUnique.mockResolvedValue(null);
    await expect(repo.updateTheme('owner-business','DEFAULT',{},{})).rejects.toThrow();
    expect(tx.website.update).not.toHaveBeenCalled();
  });
});
