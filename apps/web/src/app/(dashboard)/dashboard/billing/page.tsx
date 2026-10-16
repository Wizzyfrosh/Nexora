"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/contexts/AuthContext";
import { SubscriptionService } from "@/lib/api/subscription";
import { BillingStatus, SubscriptionPlan } from "@nexora/shared-types";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

function BillingContent() {
  const { user, refreshUser } = useAuth();
  const businessId = user?.businesses?.[0]?.id;
  const params = useSearchParams();
  const reference = params.get("reference");
  const verifiedRef = useRef<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const reload = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await SubscriptionService.status(businessId);
      setBilling(data);
      setStatusError("");
    } catch (error) {
      setStatusError(message(error));
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    let current = true;
    SubscriptionService.status(businessId).then(
      (data) => {
        if (current) {
          setBilling(data);
          setStatusError("");
        }
      },
      (error) => {
        if (current) setStatusError(message(error));
      },
    );
    return () => {
      current = false;
    };
  }, [businessId]);
  useEffect(() => {
    if (billing?.renewalStatus !== "CANCEL_REQUESTED") return;
    const timer = setInterval(() => void reload(), 10000);
    return () => clearInterval(timer);
  }, [billing?.renewalStatus, reload]);

  const verify = useCallback(
    async (value: string) => {
      setVerifying(true);
      setActionError("");
      try {
        const result = await SubscriptionService.verifyPayment(value);
        if (!result.success)
          throw new Error(result.message || "Payment is not confirmed yet.");
        setNotice("Payment confirmed. Your paid access has been updated.");
        await refreshUser();
        await reload();
        window.history.replaceState({}, "", "/dashboard/billing");
      } catch (error) {
        setActionError(message(error));
      } finally {
        setVerifying(false);
      }
    },
    [refreshUser, reload],
  );

  useEffect(() => {
    if (!reference || !businessId || verifiedRef.current === reference) return;
    verifiedRef.current = reference;
    void verify(reference);
  }, [reference, businessId, verify]);

  async function checkout(plan: SubscriptionPlan) {
    if (!businessId) return;
    setBusy(true);
    setActionError("");
    try {
      const result = await SubscriptionService.initiateSubscription(
        businessId,
        plan,
        window.location.origin + "/dashboard/billing",
      );
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setActionError(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRenewal() {
    if (!businessId) return;
    setBusy(true);
    setActionError("");
    try {
      const result = await SubscriptionService.cancelRenewal(businessId);
      setNotice(
        result.status === "REVIEW"
          ? "Your cancellation needs support review. Renewal has not been confirmed as stopped."
          : result.status === "DONE"
            ? "Renewal is stopped. Your paid access remains until its expiry."
            : "Cancellation requested. We are waiting for Paystack confirmation. Your paid access remains until its expiry.",
      );
      setConfirmCancel(false);
      await reload();
    } catch (error) {
      setActionError(message(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7 max-w-5xl">
      <div>
        <p className="text-sm font-semibold text-primary mb-2">
          Your workspace
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Billing & subscriptions
        </h1>
        <p className="text-muted-foreground mt-2">
          Review paid access and manage annual renewal.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        Checkout is in test mode. Live payments are unavailable while launch
        checks are completed.
      </div>
      <div aria-live="polite">
        {verifying && <p role="status">Checking your payment with Paystack…</p>}
        {notice && (
          <p role="status" className="rounded-xl bg-primary/5 p-4">
            {notice}
          </p>
        )}
        {actionError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 p-4 text-destructive"
          >
            <p>{actionError}</p>
            {reference && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={verifying}
                onClick={() => void verify(reference)}
              >
                Retry verification
              </Button>
            )}
          </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>
            Access dates and renewal status come from your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {statusError ? (
            <div role="alert">
              <p>{statusError}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void reload()}
              >
                Retry status
              </Button>
            </div>
          ) : !billing ? (
            <p role="status">Loading subscription…</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">
                  {billing.plan === "TRIAL" ? "7-day trial" : billing.plan}
                </h2>
                <Badge variant="outline">{billing.status}</Badge>
              </div>
              {billing.currentPeriodEnd && (
                <p>
                  Paid access ends{" "}
                  {new Date(billing.currentPeriodEnd).toLocaleDateString(
                    "en-NG",
                    { dateStyle: "long" },
                  )}
                  .
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Renewal:{" "}
                {billing.renewalStatus === "UNLINKED"
                  ? "Provider mapping not confirmed. No renewal date is promised."
                  : billing.renewalStatus.replaceAll("_", " ")}
              </p>
              {billing.linked &&
                !billing.cancelRequested &&
                ["active", "attention"].includes(billing.renewalStatus) &&
                (confirmCancel ? (
                  <div className="rounded-xl border p-4 space-y-3">
                    <p>
                      Stop future renewal? This preserves your paid access
                      through its expiry date.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={busy}
                        onClick={() => void cancelRenewal()}
                      >
                        Confirm stop renewal
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep renewal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Stop automatic renewal
                  </Button>
                ))}
              {billing.cancelRequested && (
                <p className="text-sm">
                  A cancellation request is on record. Refresh the status to
                  check provider confirmation.
                </p>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void reload()}
              >
                Refresh status
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            name: "Basic",
            plan: SubscriptionPlan.BASIC,
            price: "₦50,000",
            copy: "Manage your business profile, catalogue and enquiries.",
          },
          {
            name: "Premium",
            plan: SubscriptionPlan.PREMIUM,
            price: "₦120,000",
            copy: "Planned tier. Custom domains, team access and advanced analytics are not yet released.",
          },
        ].map((item) => (
          <Card key={item.plan}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription>{item.copy}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold">
                {item.price}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / year
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Proposed annual price. Test checkout does not make unreleased
                features available.
              </p>
              <Button
                className="w-full"
                variant={
                  item.plan === SubscriptionPlan.BASIC ? "default" : "outline"
                }
                disabled={
                  busy ||
                  verifying ||
                  !billing ||
                  Boolean(statusError) ||
                  billing.linked ||
                  item.plan === SubscriptionPlan.PREMIUM ||
                  (billing.status === "ACTIVE" && billing.plan !== item.plan)
                }
                onClick={() => void checkout(item.plan)}
              >
                {item.plan === SubscriptionPlan.PREMIUM
                  ? "Not available for purchase"
                  : busy
                    ? "Opening checkout…"
                    : billing?.linked
                      ? "Recurring subscription linked"
                      : "Open test checkout"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p role="status">Loading billing…</p>}>
      <BillingContent />
    </Suspense>
  );
}
