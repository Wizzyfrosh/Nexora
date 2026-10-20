import { SubscriptionPlan, SubscriptionStatus } from "./enums";

export interface BillingStatus {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewalStatus: string;
  currentPeriodEnd: string | null;
  linked: boolean;
  cancelRequested: boolean;
}

export interface CancelRenewalResult {
  status: "PENDING" | "DONE" | "REVIEW";
}

export interface BillingHistoryItem {
  reference: string;
  status: string;
  amountNgn: number;
  currency: string;
  plan: SubscriptionPlan | null;
  paidAt: string | null;
  createdAt: string;
  coverageStart: string | null;
  coverageEnd: string | null;
  verified: boolean;
}
