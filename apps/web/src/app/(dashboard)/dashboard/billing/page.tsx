"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { SubscriptionService } from "@/lib/api/subscription";
import { SubscriptionPlan } from "@nexora/shared-types";

function BillingPageContent() {
  const { user, refreshUser } = useAuth();
  const business = user?.businesses?.[0];
  const subscription = business?.subscription;

  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const searchParams = useSearchParams();

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      // Clear the query parameter so refreshing doesn't re-trigger verification
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (ref: string) => {
    setVerificationStatus('verifying');
    try {
      const result = await SubscriptionService.verifyPayment(ref);
      if (result.success) {
        setVerificationStatus('success');
        await refreshUser();
      } else {
        setVerificationStatus('error');
        setErrorMessage(result.message || 'Payment verification failed');
      }
    } catch (err: any) {
      console.error(err);
      setVerificationStatus('error');
      setErrorMessage(err.message || 'An error occurred during payment verification');
    }
  };

  const handleUpgrade = async (plan: 'BASIC' | 'PREMIUM') => {
    if (!business) return;
    setIsLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/dashboard/billing`;
      const response = await SubscriptionService.initiateSubscription(
        business.id,
        plan as unknown as SubscriptionPlan,
        callbackUrl
      );
      if (response.authorizationUrl) {
        window.location.href = response.authorizationUrl;
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper properties to render subscription state
  const isTrial = !subscription || subscription.plan === 'TRIAL' || subscription.status === 'TRIAL';
  const isBasic = subscription?.plan === 'BASIC' && subscription?.status === 'ACTIVE';
  const isPremium = subscription?.plan === 'PREMIUM' && subscription?.status === 'ACTIVE';

  let currentPlanTitle = "Free Trial";
  let currentPlanPrice = "₦0";
  let currentPlanCycle = "/ forever";
  let planStatusBadge = "Trial Active";
  let remainingText = "";

  if (subscription) {
    const now = new Date();
    const endDate = subscription.status === 'TRIAL' 
      ? new Date(subscription.trialEndDate) 
      : (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null);
    
    if (endDate) {
      const diffTime = Math.max(0, endDate.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (subscription.status === 'TRIAL') {
        remainingText = `${diffDays} days remaining in trial`;
        planStatusBadge = "Trial Active";
      } else if (subscription.status === 'ACTIVE') {
        remainingText = `Renews in ${diffDays} days`;
        planStatusBadge = "Active";
      } else {
        remainingText = `Status: ${subscription.status.replace('_', ' ')}`;
        planStatusBadge = subscription.status;
      }
    }

    if (subscription.plan === 'BASIC') {
      currentPlanTitle = "Basic Plan";
      currentPlanPrice = "₦50,000";
      currentPlanCycle = "/ year";
    } else if (subscription.plan === 'PREMIUM') {
      currentPlanTitle = "Premium Plan";
      currentPlanPrice = "₦120,000";
      currentPlanCycle = "/ year";
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage your plan, billing cycle, and payment methods.</p>
        </div>
      </div>

      {/* Verification Overlays */}
      {verificationStatus === 'verifying' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass p-8 rounded-2xl border border-primary/20 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold">Verifying Payment</h2>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your transaction with Paystack.</p>
          </div>
        </div>
      )}

      {verificationStatus === 'success' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass p-8 rounded-2xl border border-emerald-500/20 max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full"></div>
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-500">Upgrade Successful!</h2>
            <p className="text-muted-foreground text-sm">Thank you! Your business profile has been upgraded successfully. All premium features are now active.</p>
            <Button className="w-full mt-4" variant="default" onClick={() => setVerificationStatus('idle')}>
              Back to Billing
            </Button>
          </div>
        </div>
      )}

      {verificationStatus === 'error' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass p-8 rounded-2xl border border-destructive/20 max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl font-bold">×</span>
            </div>
            <h2 className="text-2xl font-bold text-destructive">Payment Failed</h2>
            <p className="text-muted-foreground text-sm">{errorMessage || 'We could not verify your payment. Please contact support if this issue persists.'}</p>
            <Button className="w-full mt-4" variant="outline" onClick={() => setVerificationStatus('idle')}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <Card className="glass relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -z-10"></div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are currently on the {currentPlanTitle}</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary text-primary px-3 py-1 text-sm">{planStatusBadge}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="space-y-1">
              <p className="text-4xl font-bold">{currentPlanPrice} <span className="text-lg font-medium text-muted-foreground">{currentPlanCycle}</span></p>
              {remainingText && (
                <p className={`text-sm font-medium mt-2 ${subscription?.status === 'EXPIRED' || subscription?.status === 'SUSPENDED' ? 'text-destructive' : 'text-primary'}`}>
                  {remainingText}
                </p>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Workspace Isolation & Storage</p>
              <div className="w-full bg-secondary rounded-full h-2.5 mb-1">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: isPremium ? "10%" : isBasic ? "25%" : "45%" }}></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPremium ? "Unlimited Storage Active" : isBasic ? "250MB of 10GB used" : "450MB of 1GB used (Free Tier limit)"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {/* Trial / Free */}
        <Card className={`glass transition-all ${isTrial ? 'border-primary/40 shadow-md' : 'opacity-60'}`}>
          <CardHeader>
            <CardTitle>7-Day Trial</CardTitle>
            <CardDescription>Experience the full platform risk-free.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold mb-4">₦0 <span className="text-sm font-medium text-muted-foreground">/ yr</span></div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Full access during trial</li>
              <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Limited templates</li>
              <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Nexora branding</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full" disabled>
              {isTrial ? "Current Plan" : "Trial Expired"}
            </Button>
          </CardFooter>
        </Card>

        {/* Basic */}
        <Card className={`glass relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${isBasic ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/50'}`}>
          <div className="absolute top-0 right-0 p-1 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg">POPULAR</div>
          <CardHeader>
            <CardTitle>Basic</CardTitle>
            <CardDescription>Everything you need for a growing business.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold mb-4">₦50,000 <span className="text-sm font-medium text-muted-foreground">/ yr</span></div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited products & services</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Professional templates</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic SEO tools</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> WhatsApp integration</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Analytics dashboard</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              variant={isBasic ? "secondary" : "gradient"} 
              className="w-full"
              onClick={() => handleUpgrade('BASIC')}
              disabled={isLoading || isBasic}
            >
              {isBasic ? "Current Plan" : isLoading ? "Redirecting..." : "Upgrade to Basic"}
            </Button>
          </CardFooter>
        </Card>

        {/* Premium */}
        <Card className={`glass transition-all hover:-translate-y-1 hover:shadow-lg ${isPremium ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/50'}`}>
          <CardHeader>
            <CardTitle>Premium</CardTitle>
            <CardDescription>Advanced features for serious scaling.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold mb-4">₦120,000 <span className="text-sm font-medium text-muted-foreground">/ yr</span></div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Everything in Basic</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Custom domain support</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Premium templates</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Advanced analytics</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Priority support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              variant={isPremium ? "secondary" : "outline"} 
              className="w-full"
              onClick={() => handleUpgrade('PREMIUM')}
              disabled={isLoading || isPremium}
            >
              {isPremium ? "Current Plan" : isLoading ? "Redirecting..." : "Upgrade to Premium"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Billing Configuration...</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
