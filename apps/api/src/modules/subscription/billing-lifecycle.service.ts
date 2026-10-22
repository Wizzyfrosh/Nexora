import { Injectable } from '@nestjs/common';
import { PaymentEvent } from '@prisma/client';
import { SubscriptionRepository } from './subscription.repository';
import { PaystackService, PaystackSubscription } from './paystack.service';
import {
  InvoiceEvidence,
  BillingEvidenceError,
  BillingEvidenceReason,
  requireBilling,
  validTransactionId,
} from './billing-policy';

type RecoveryStage =
  | 'PROVIDER_READ'
  | 'PAYMENT_ANCHOR'
  | 'SUBSCRIPTION_LINK'
  | 'PROVIDER_CANCELLATION'
  | 'INVOICE_RECONCILIATION';

// Static stages only: never retain the provider response, customer or token.
export class BillingRecoveryError extends Error {
  constructor(
    readonly stage: RecoveryStage,
    readonly reason:
      | BillingEvidenceReason
      | 'INTERNAL_FAILURE' = 'INTERNAL_FAILURE',
  ) {
    super('Billing recovery failed at ' + stage);
  }
}

@Injectable()
export class BillingLifecycleService {
  constructor(
    private readonly repo: SubscriptionRepository,
    private readonly provider: PaystackService,
  ) {}

  async process(
    event: PaymentEvent,
    verifyInitial: (reference: string) => Promise<void>,
  ): Promise<boolean> {
    let stage: RecoveryStage = 'PROVIDER_READ';
    try {
      return await this.processEvent(event, verifyInitial, (next) => {
        stage = next;
      });
    } catch (error) {
      throw new BillingRecoveryError(
        stage,
        error instanceof BillingEvidenceError
          ? error.reason
          : 'INTERNAL_FAILURE',
      );
    }
  }

  private async processEvent(
    event: PaymentEvent,
    verifyInitial: (reference: string) => Promise<void>,
    stage: (next: RecoveryStage) => void,
  ): Promise<boolean> {
    if (
      ![
        'subscription.create',
        'subscription.not_renew',
        'subscription.disable',
        'subscription.sync',
        'subscription.cancel',
        'invoice.create',
        'invoice.update',
        'invoice.payment_failed',
      ].includes(event.event)
    )
      return false;
    const evidence = event.billingData as unknown as InvoiceEvidence;
    const code = evidence.subscriptionCode || event.providerObjectId;
    if (!code || !/^SUB_[A-Za-z0-9]+$/.test(code)) return false;
    const linked = await this.repo.findLinked(code);
    let anchor = linked?.billingAnchorPayment;
    let version = anchor
      ? await this.repo.subscriptionSnapshotVersion(anchor)
      : undefined;
    let { data } = await this.provider.fetchSubscription(code);
    requireBilling(data.subscription_code === code);
    stage('PAYMENT_ANCHOR');
    if (!anchor) {
      // A signed invoice can prove the exact original reference; no email/plan guessing.
      if (evidence.reference) {
        const known = await this.repo.findPayment(evidence.reference);
        if (known) {
          await verifyInitial(evidence.reference);
          anchor = await this.repo.findPayment(evidence.reference);
        }
      }
      // The fetched most-recent invoice also gives authoritative transaction identity.
      if (
        !anchor &&
        validTransactionId(data.most_recent_invoice?.transaction)
      ) {
        anchor = await this.repo.findPaymentByTransaction(
          String(data.most_recent_invoice!.transaction),
        );
      }
      requireBilling(anchor?.fulfilledAt);
      // The first read discovered identity. Bind a fresh read to the local version.
      version = await this.repo.subscriptionSnapshotVersion(anchor);
      ({ data } = await this.provider.fetchSubscription(code));
      requireBilling(data.subscription_code === code);
    }
    stage('SUBSCRIPTION_LINK');
    await this.repo.linkAndSync(
      anchor,
      data,
      this.provider.expectedDomain(),
      version,
    );
    if (event.event === 'subscription.cancel') {
      stage('PROVIDER_CANCELLATION');
      if (['active', 'attention'].includes(data.status)) {
        requireBilling(data.email_token);
        await this.provider.cancelSubscription(code, data.email_token);
        // Durable intent remains until a fresh provider read confirms completion.
        throw new Error('Awaiting provider cancellation confirmation');
      }
      return true;
    }
    if (event.event === 'invoice.update' && evidence.paid) {
      stage('INVOICE_RECONCILIATION');
      const { data: charge } = await this.provider.verifyTransaction(
        evidence.reference,
      );
      await this.repo.fulfillInvoice(
        anchor,
        charge,
        evidence,
        data.customer.customer_code,
      );
    } else if (
      ['subscription.sync', 'subscription.create'].includes(event.event)
    ) {
      stage('INVOICE_RECONCILIATION');
      await this.reconcileLatest(data, anchor);
    }
    return true;
  }

  private async reconcileLatest(
    data: PaystackSubscription,
    anchor: NonNullable<
      Awaited<ReturnType<SubscriptionRepository['findPaymentByTransaction']>>
    >,
  ) {
    const invoice = data.most_recent_invoice;
    if (!invoice || !(invoice.paid === true || invoice.paid === 1)) return;
    requireBilling(validTransactionId(invoice.transaction));
    const { data: transaction } = await this.provider.fetchTransaction(
      String(invoice.transaction),
    );
    requireBilling(
      String(transaction.id) === String(invoice.transaction) &&
        transaction.reference,
    );
    const { data: charge } = await this.provider.verifyTransaction(
      transaction.reference,
    );
    requireBilling(String(charge.id) === String(invoice.transaction));
    const evidence: InvoiceEvidence = {
      subscriptionCode: data.subscription_code,
      invoiceCode: invoice.invoice_code,
      reference: transaction.reference,
      amount: invoice.amount,
      currency: data.plan.currency,
      customerCode: data.customer.customer_code,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      paid: true,
    };
    await this.repo.fulfillInvoice(
      anchor,
      charge,
      evidence,
      data.customer.customer_code,
    );
  }
}
