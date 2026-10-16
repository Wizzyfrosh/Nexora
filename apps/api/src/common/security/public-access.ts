import { NotFoundException } from '@nestjs/common';

type SubscriptionAccess = {
  status: string;
  trialEndDate: Date | string | null;
  currentPeriodEnd: Date | string | null;
  deletedAt?: Date | null;
};
export type PublicBusiness = {
  isPublished: boolean;
  deletedAt?: Date | null;
  subscription: SubscriptionAccess | null;
};

export function assertPublicAccess(
  business: PublicBusiness | null,
  now = new Date(),
): asserts business is PublicBusiness {
  const subscription = business?.subscription;
  const expiry =
    subscription?.status === 'TRIAL'
      ? subscription.trialEndDate
      : subscription?.status === 'ACTIVE'
        ? subscription.currentPeriodEnd
        : null;
  const expiresAt =
    expiry === null || expiry === undefined ? NaN : new Date(expiry).getTime();
  if (
    !business ||
    business.deletedAt ||
    !business.isPublished ||
    !subscription ||
    subscription.deletedAt ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now.getTime()
  ) {
    // A uniform response conceals the reason and does not disclose private subscription data.
    throw new NotFoundException('Business website is unavailable');
  }
}
