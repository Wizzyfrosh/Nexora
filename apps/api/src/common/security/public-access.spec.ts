import { assertPublicAccess } from './public-access';
import { NotFoundException } from '@nestjs/common';
const now = new Date('2026-10-15T12:00:00Z');
const live = {
  isPublished: true,
  deletedAt: null,
  subscription: {
    status: 'TRIAL',
    trialEndDate: new Date(now.getTime() + 1),
    currentPeriodEnd: null,
    deletedAt: null,
  },
};
describe('public entitlement policy', () => {
  it('allows a current trial', () =>
    expect(() => assertPublicAccess(live, now)).not.toThrow());
  it('allows a current active plan', () =>
    expect(() =>
      assertPublicAccess(
        {
          ...live,
          subscription: {
            ...live.subscription,
            status: 'ACTIVE',
            currentPeriodEnd: new Date(now.getTime() + 1),
          },
        },
        now,
      ),
    ).not.toThrow());
  it.each([
    null,
    { ...live, isPublished: false },
    { ...live, deletedAt: now },
    { ...live, subscription: null },
    { ...live, subscription: { ...live.subscription, deletedAt: now } },
    ...['PAST_DUE', 'SUSPENDED', 'EXPIRED', 'UNKNOWN'].map((status) => ({
      ...live,
      subscription: { ...live.subscription, status },
    })),
    { ...live, subscription: { ...live.subscription, trialEndDate: now } },
    {
      ...live,
      subscription: { ...live.subscription, trialEndDate: new Date('invalid') },
    },
    {
      ...live,
      subscription: {
        ...live.subscription,
        status: 'ACTIVE',
        currentPeriodEnd: null,
      },
    },
  ])('fails closed for inaccessible state %p', (business) =>
    expect(() => assertPublicAccess(business, now)).toThrow(NotFoundException),
  );
});
