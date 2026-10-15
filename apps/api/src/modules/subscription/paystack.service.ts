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

  private async request(path: string, body?: Record<string, unknown>) {
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
      const result = await response.json();
      if (!response.ok || result.status !== true || !result.data)
        throw new Error('Provider unavailable');
      return result;
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
    const result = await this.request('/transaction/initialize', {
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
    return this.request('/transaction/verify/' + encodeURIComponent(reference));
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
