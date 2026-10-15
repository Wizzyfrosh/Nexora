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
