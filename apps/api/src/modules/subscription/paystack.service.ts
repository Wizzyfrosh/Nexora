import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    metadata: Record<string, any>;
    customer: {
      customer_code: string;
      email: string;
    };
    authorization: {
      authorization_code: string;
      reusable: boolean;
    };
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('paystack.secretKey') || '';
  }

  /**
   * Initializes a transaction on Paystack
   */
  async initializeTransaction(email: string, amountKobo: number, planCode: string, callbackUrl: string, metadata: any): Promise<PaystackInitResponse> {
    if (!this.secretKey) {
      throw new InternalServerErrorException('Paystack is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          plan: planCode,
          callback_url: callbackUrl,
          metadata,
        }),
      });

      const result = await response.json();
      if (!result.status) {
        throw new BadRequestException(result.message);
      }
      return result;
    } catch (error) {
      this.logger.error(`Paystack initialization failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  /**
   * Verifies a transaction on Paystack
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    if (!this.secretKey) {
      throw new InternalServerErrorException('Paystack is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const result = await response.json();
      if (!result.status) {
        throw new BadRequestException(result.message);
      }
      return result;
    } catch (error) {
      this.logger.error(`Paystack verification failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Validates webhook signature
   */
  validateWebhookSignature(signature: string, payload: any): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }
}
