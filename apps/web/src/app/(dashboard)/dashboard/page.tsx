"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Package,
  Briefcase,
  MessageCircle,
  Mail,
  Palette,
  Store,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ProductService } from "@/lib/api/product";
import { ServiceModuleService } from "@/lib/api/service";
import { CrmApiService } from "@/lib/api/crm";

type Metrics = {
  products: number;
  services: number;
  leads: number;
  unread: number;
};
export default function DashboardPage() {
  const { user } = useAuth();
  const business = user?.businesses?.[0];
  const businessId = business?.id;
  const [result, setResult] = useState<{
    businessId: string;
    metrics: Metrics | null;
    error: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!businessId) return;
    let active = true;
    Promise.all([
      ProductService.getProducts(businessId, 1, 1),
      ServiceModuleService.getServices(businessId, 1, 1),
      CrmApiService.getLeadStats(businessId),
    ])
      .then(([products, services, leads]) => {
        if (active)
          setResult({
            businessId,
            metrics: {
              products: products.total,
              services: services.total,
              leads: leads.total,
              unread: leads.unread,
            },
            error: "",
          });
      })
      .catch(() => {
        if (active)
          setResult({
            businessId,
            metrics: null,
            error:
              "We couldn’t load your overview. Your saved content has not changed.",
          });
      });
    return () => {
      active = false;
    };
  }, [businessId, attempt]);
  const metrics =
    result && result.businessId === businessId ? result.metrics : null;
  const error = result && result.businessId === businessId ? result.error : "";
  const subscription = business?.subscription;
  const status = subscription?.status?.toUpperCase();
  const subscriptionLabel =
    status === "ACTIVE"
      ? `${subscription?.plan} plan`
      : status === "TRIAL"
        ? "Trial workspace"
        : status
          ? status.replaceAll("_", " ")
          : "No subscription";
  const stats = [
    {
      label: "Products",
      value: metrics?.products,
      icon: Package,
      href: "/dashboard/products",
    },
    {
      label: "Services",
      value: metrics?.services,
      icon: Briefcase,
      href: "/dashboard/services",
    },
    {
      label: "Customer enquiries",
      value: metrics?.leads,
      icon: MessageCircle,
      href: "/dashboard/subscribers",
    },
    {
      label: "Unread enquiries",
      value: metrics?.unread,
      icon: Mail,
      href: "/dashboard/subscribers",
    },
  ];
  return (
    <div className="workspace-home">
      <div className="workspace-page-heading">
        <div>
          <span className="workspace-eyebrow">YOUR BUSINESS, AT A GLANCE</span>
          <h1>
            Hello, {user?.firstName || "there"}
            <span>.</span>
          </h1>
          <p>A little progress today. A bigger business tomorrow.</p>
        </div>
        <Link href="/dashboard/products" className="workspace-button">
          <Plus size={17} /> Manage products
        </Link>
      </div>
      <section className="workspace-welcome">
        <div>
          <span className="workspace-tag">{subscriptionLabel}</span>
          <h2>
            Make yourself
            <br />
            <em>right at home.</em>
          </h2>
          <p>
            Bring your story, catalogue and brand together.
            <br />
            Let’s make this space feel like your business.
          </p>
          <Link href="/dashboard/settings">
            Complete your business profile <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="workspace-welcome-art" aria-hidden="true">
          <Store size={75} strokeWidth={1} />
          <span>{business?.name || "Your big idea"}</span>
          <small>MADE FOR YOUR NEXT CHAPTER</small>
        </div>
      </section>
      {!businessId && (
        <p className="workspace-notice">
          No business is connected to this account yet. Business onboarding must
          be completed before catalogue management is available.
        </p>
      )}
      {error && (
        <div className="workspace-notice" role="alert">
          {error}
          <button onClick={() => setAttempt((a) => a + 1)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
      <div className="workspace-stats">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link href={href} className="workspace-stat" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>
              {value === undefined ? "—" : value.toLocaleString()}
            </strong>
            <small>
              {error
                ? "Temporarily unavailable"
                : !businessId
                  ? "No business connected"
                  : metrics
                    ? "From your business records"
                    : "Loading your records…"}
            </small>
          </Link>
        ))}
      </div>
      <div className="workspace-bottom-grid">
        <section className="workspace-panel-card">
          <div className="workspace-card-heading">
            <h2>Your next steps</h2>
            <span>MAKE IT YOURS</span>
          </div>
          {[
            {
              icon: Store,
              title: "Tell your story",
              text: "Add your business name, description and contact details.",
              href: "/dashboard/settings",
            },
            {
              icon: Package,
              title: "Show what you offer",
              text: "Build a catalogue of products and services.",
              href: "/dashboard/products",
            },
            {
              icon: Palette,
              title: "Find your look",
              text: "Explore your colours, typography and theme.",
              href: "/dashboard/appearance",
            },
          ].map(({ icon: Icon, title, text, href }, i) => (
            <Link href={href} className="workspace-step" key={title}>
              <span className="workspace-step-icon">
                <Icon size={20} />
              </span>
              <div>
                <small>STEP 0{i + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </section>
        <section className="workspace-panel-card workspace-release">
          <span className="workspace-eyebrow">WHAT’S NEXT</span>
          <h2>
            A clearer view
            <br />
            of your growth.
          </h2>
          <p>
            View real enquiries and processed, opt-in website activity. Collection
            may be off while launch checks are completed.
          </p>
          <small>No unique visitor or conversion-rate claims</small>
          <Link href="/dashboard/analytics">
            Open analytics <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
