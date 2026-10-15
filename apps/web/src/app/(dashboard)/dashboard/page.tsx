"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Eye, MessageCircle, Package, Users, ExternalLink, BarChart } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const business = user?.businesses?.[0];
  const subscription = business?.subscription;

  // Calculate days left in subscription trial or plan duration
  let subscriptionText = "No active subscription";
  let badgeText = "Inactive";
  let badgeVariant: "outline" | "default" | "secondary" | "destructive" = "outline";

  if (subscription) {
    const now = new Date();
    const trialEnd = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null;
    const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
    
    if (subscription.status === 'trialing' && trialEnd) {
      const diffTime = Math.max(0, trialEnd.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      subscriptionText = `${diffDays} days left`;
      badgeText = "Trial";
      badgeVariant = "outline";
    } else if (subscription.status === 'active') {
      badgeText = subscription.plan.toUpperCase();
      badgeVariant = "default";
      if (periodEnd) {
        const diffTime = Math.max(0, periodEnd.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        subscriptionText = `Renews in ${diffDays} days`;
      } else {
        subscriptionText = "Active plan";
      }
    } else {
      badgeText = subscription.status.toUpperCase();
      badgeVariant = "secondary";
      subscriptionText = "Status: " + subscription.status;
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName || "User"} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild={!!business?.slug}>
            {business?.slug ? (
              <a href={`/sites/${business.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Website
              </a>
            ) : (
              <button disabled className="opacity-50">
                <ExternalLink className="w-4 h-4 mr-2" />
                No Website Yet
              </button>
            )}
          </Button>
          <Button variant="gradient">
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Views" 
          value="12,456" 
          trend="+12.5%" 
          trendUp={true} 
          icon={<Eye className="w-5 h-5 text-primary" />} 
        />
        <StatCard 
          title="WhatsApp Clicks" 
          value="1,245" 
          trend="+8.2%" 
          trendUp={true} 
          icon={<MessageCircle className="w-5 h-5 text-emerald-500" />} 
        />
        <StatCard 
          title="Total Products" 
          value="56" 
          trend="+2" 
          trendUp={true} 
          icon={<Package className="w-5 h-5 text-orange-500" />} 
        />
        <StatCard 
          title="Active Subscribers" 
          value="320" 
          trend="-1.2%" 
          trendUp={false} 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 glass">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Website traffic over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full rounded-lg border border-border/50 bg-background/50 flex items-center justify-center flex-col gap-2">
              <BarChart className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Chart integration pending</p>
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-8">
          {/* Subscription Status */}
          <Card className="glass overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -z-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Subscription</CardTitle>
                <Badge variant={badgeVariant} className={badgeVariant === "outline" ? "border-primary text-primary" : ""}>
                  {badgeText}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{subscriptionText}</div>
              <p className="text-sm text-muted-foreground mb-4">
                {subscription?.status === 'active' 
                  ? "Thank you for supporting Nexora! Enjoy all premium features." 
                  : "Upgrade to unlock custom domains and premium themes."}
              </p>
              {subscription?.status !== 'active' && (
                <Button className="w-full" variant="default" asChild>
                  <Link href="/dashboard/billing">Upgrade Now</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Top Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Signature Collection {i}</p>
                    <p className="text-xs text-muted-foreground">132 views</p>
                  </div>
                  <div className="text-sm font-medium">₦15,000</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon }: { title: string, value: string, trend: string, trendUp: boolean, icon: React.ReactNode }) {
  return (
    <Card className="glass hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="p-2 bg-background rounded-lg border border-border/50">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className={`flex items-center font-medium ${trendUp ? 'text-emerald-500' : 'text-destructive'}`}>
            {trendUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowUpRight className="w-4 h-4 mr-1 rotate-90" />}
            {trend}
          </span>
          <span className="text-muted-foreground ml-2">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

