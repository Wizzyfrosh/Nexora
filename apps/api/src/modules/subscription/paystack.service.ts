import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PaystackCharge {
  id: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string;
  metadata: { businessId?: string; planName?: string } | null;
  customer: { customer_code: string; email: string };
}

export interface PaystackInvoice {
  invoice_code: string;
  amount: number;
  period_start: string;
  period_end: string;
  paid: boolean | number;
  transaction: number | string | null;
}

export interface PaystackSubscription {
  subscription_code: string;
  domain: string;
  status: string;
  amount: number;
  updatedAt: string;
  customer: { customer_code: string; email: string };
  plan: {
    plan_code: string;
    amount: number;
    currency: string;
    interval: string;
  };
  most_recent_invoice?: PaystackInvoice | null;
  email_token?: string; // Used transiently for provider cancellation; never persisted/returned.
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('paystack.secretKey') || '';
  }

  assertTestCheckout() {
    // Live checkout stays closed until recurring lifecycle/refund/reconciliation gates pass.
    if (!this.secretKey.startsWith('sk_test_')) {
      throw new ServiceUnavailableException(
        'Only Paystack test checkout is enabled',
      );
    }
  }

  private async request<T>(
    path: string,
    body?: Record<string, unknown>,
    allowEmpty = false,
  ): Promise<{ data: T }> {
    if (!this.secretKey)
      throw new ServiceUnavailableException('Paystack is not configured');
    try {
      const response = await fetch('https://api.paystack.co' + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: 'Bearer ' + this.secretKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
      const value: unknown = await response.json();
      const result =
        value && typeof value === 'object'
          ? (value as { status?: unknown; data?: unknown })
          : {};
      if (
        !response.ok ||
        result.status !== true ||
        (!allowEmpty && !result.data)
      )
        throw new Error('Provider unavailable');
      return { data: result.data as T };
    } catch {
      throw new ServiceUnavailableException(
        'Payment provider unavailable; retry verification later',
      );
    }
  }

  async initializeTransaction(
    email: string,
    amount: number,
    plan: string,
    callbackUrl: string,
    reference: string,
    metadata: { businessId: string; planName: string },
  ) {
    this.assertTestCheckout();
    const result = await this.request<{
      reference: string;
      authorization_url: string;
    }>('/transaction/initialize', {
      email,
      amount,
      currency: 'NGN',
      plan,
      callback_url: callbackUrl,
      reference,
      metadata,
    });
    let url: URL;
    try {
      url = new URL(result.data.authorization_url);
    } catch {
      throw new ServiceUnavailableException('Invalid checkout response');
    }
    if (
      result.data.reference !== reference ||
      url.origin !== 'https://checkout.paystack.com' ||
      url.username ||
      url.password
    ) {
      throw new ServiceUnavailableException('Invalid checkout response');
    }
    return { data: { reference, authorization_url: url.href } };
  }

  async verifyTransaction(
    reference: string,
  ): Promise<{ data: PaystackCharge }> {
    return this.request<PaystackCharge>(
      '/transaction/verify/' + encodeURIComponent(reference),
    );
  }

  fetchSubscription(code: string): Promise<{ data: PaystackSubscription }> {
    return this.request<PaystackSubscription>(
      '/subscription/' + encodeURIComponent(code),
    );
  }

  fetchTransaction(id: string): Promise<{ data: PaystackCharge }> {
    return this.request<PaystackCharge>(
      '/transaction/' + encodeURIComponent(id),
    );
  }

  async cancelSubscription(code: string, token: string) {
    // Cancellation remains available even when NEW checkout is disabled.
    await this.request('/subscription/disable', { code, token }, true);
  }

  validateWebhookSignature(
    signature: string | undefined,
    raw: Buffer | undefined,
  ): boolean {
    if (!this.secretKey || !raw || !/^[a-fA-F0-9]{128}$/.test(signature || ''))
      return false;
    const expected = createHmac('sha512', this.secretKey).update(raw).digest();
    return timingSafeEqual(expected, Buffer.from(signature!, 'hex'));
  }
}
