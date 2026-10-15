// ============================================================
// Nexora Web — Subscription API Client
// Typed methods for subscription and payment endpoints
// ============================================================

import { SubscriptionPlan } from '@nexora/shared-types';
import { apiFetch } from './client';

export interface InitiateSubscriptionResponse {
  authorizationUrl: string;
  reference: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export class SubscriptionService {
  /**
   * Initiate a subscription checkout session on Paystack.
   */
  static async initiateSubscription(
    businessId: string,
    plan: SubscriptionPlan,
    callbackUrl: string
  ): Promise<InitiateSubscriptionResponse> {
    return apiFetch<InitiateSubscriptionResponse>(`/subscriptions/${businessId}/initiate`, {
      method: 'POST',
      body: JSON.stringify({ plan, callbackUrl }),
    });
  }

  /**
   * Verify a Paystack payment by transaction reference.
   */
  static async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    return apiFetch<VerifyPaymentResponse>(`/subscriptions/verify/${reference}`);
  }
}
