"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Crown, LockKeyhole, ArrowUpRight } from "lucide-react";
import { TEMPLATE_CATALOG, isTemplateEntitled, type TemplateId } from "@nexora/shared-types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { WebsiteService } from "@/lib/api/website";
import "./template-gallery.css";

const categories = ["All", "Retail", "Services", "Wellness", "Portfolio", "Luxury", "Fashion", "Food", "Technology", "Creative"] as const;

export default function AppearanceManager() {
  const business = useAuth().user?.businesses?.[0];
  const businessId = business?.id;
  const subscription = business?.subscription;
  const [theme, setTheme] = useState<string>("DEFAULT");
  const [primary, setPrimary] = useState("#8044b6");
  const [category, setCategory] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    WebsiteService.getWebsiteConfig(businessId)
      .then((config) => {
        if (cancelled) return;
        setTheme(config.theme);
        if (/^#[a-fA-F0-9]{6}$/.test(config.colorPalette.primary))
          setPrimary(config.colorPalette.primary);
      })
      .catch(() => {
        if (!cancelled) setError("Appearance could not be loaded. Reload to retry.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  const selected = TEMPLATE_CATALOG.find((item) => item.id === theme);
  const entitled = isTemplateEntitled(theme, subscription);
  const matching = useMemo(() => TEMPLATE_CATALOG.filter(
    (item) => category === "All" || item.category.toLowerCase().includes(category.toLowerCase()),
  ), [category]);

  if (loading) return <p role="status" className="text-muted-foreground">Loading the design library…</p>;
  return (
    <div className="design-library">
      <header className="design-library-header">
        <div>
          <span className="design-kicker">YOUR BRAND, YOUR STYLE</span>
          <h1>Choose a signature look.</h1>
          <p>Explore carefully designed layouts for shops, creative businesses and service providers. Each template keeps your own products, photos and business information.</p>
        </div>
        <Link href="/dashboard/website" className="design-preview-link">Website editor <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>

      <div className="design-library-summary">
        <span>{TEMPLATE_CATALOG.length} curated design directions</span>
        <span>4 Basic · 5 Premium</span>
        <span>{subscription?.plan === "PREMIUM" && subscription.status === "ACTIVE" ? "Premium plan" : "Basic & trial access"}</span>
      </div>

      <nav className="design-filters" aria-label="Filter website templates">
        {categories.map((value) => <button type="button" key={value} aria-pressed={category===value} onClick={() => setCategory(value)}>{value}</button>)}
      </nav>

      <div className="design-cards">
        {matching.map((item) => {
          const isActive = theme === item.id;
          const allowed = isTemplateEntitled(item.id, subscription);
          return <button
            type="button"
            key={item.id}
            aria-pressed={isActive}
            aria-label={item.name + (allowed ? "" : " — Premium plan required")}
            className={"design-card " + (isActive ? "selected" : "")}
            onClick={() => { setTheme(item.id); setPrimary(item.tone); setNotice(""); setError(""); }}
          >
            <div className={"design-thumbnail design-thumbnail-" + item.id.toLowerCase()} style={{"--sample-accent":item.tone,"--sample-surface":item.surface} as React.CSSProperties}>
              <div className="design-mini-nav"><span>STUDIO / 01</span><span>MENU —</span></div>
              <div className="design-mini-layout">
                <div className="design-mini-content"><span>THE NEW COLLECTION</span><strong>{item.layout === "technology" ? "Ideas, in motion." : item.layout === "hospitality" ? "Stay a little longer." : "Make it your own."}</strong><i>EXPLORE COLLECTION ↗</i></div>
                <div className="design-mini-photo" aria-hidden="true"><span /><span /><span /></div>
              </div>
              <div className="design-mini-footer"><i /><i /><i /></div>
            </div>
            <div className="design-card-info">
              <div><strong>{item.name}</strong><small>{item.category}</small></div>
              <span className={"design-tier " + (allowed ? "" : "locked")}>{item.tier === "PREMIUM" ? <Crown size={13} aria-hidden="true"/> : null}{item.tier === "PREMIUM" ? "Premium" : "Basic"}</span>
            </div>
            <p>{item.description}</p>
            <span className="design-selection">
              {isActive ? <><Check size={15} aria-hidden="true"/> Selected</> :
                !allowed ? <><LockKeyhole size={14} aria-hidden="true"/> View preview · Unlock with Premium</> :
                "Choose design →"}
            </span>
          </button>;
        })}
      </div>

      {error && <p role="alert" className="design-error">{error}</p>}
      {notice && <p role="status" className="design-success">{notice}</p>}
      <section className="design-config">
        <div>
          <span className="design-kicker">FINAL TOUCHES</span>
          <h2>{selected?.name ?? "Your selected design"}</h2>
          <p>{!entitled ? "You can explore this design, but it requires an active Premium plan to save or publish. Premium checkout is not yet available." : "Personalize your accent color and save your design. Site sections and photos remain editable from My Website."}</p>
          <label htmlFor="design-color">Brand accent <input id="design-color" type="color" value={primary} onChange={(e)=>setPrimary(e.target.value)}/></label>
        </div>
        <div className="design-actions">
          <button type="button" disabled={busy || !businessId || !entitled || !selected} onClick={async () => {
            if (!businessId || !selected || !entitled) return;
            setBusy(true);setError("");setNotice("");
            try {
              await WebsiteService.updateTheme(businessId, {
                theme: selected.id as TemplateId, colorPalette: {primary}, typography: {heading: "Inter", body: "Inter"},
              });
              setNotice("Website design saved. Review your storefront preview before publishing.");
            } catch(e) { setError(e instanceof Error ? e.message : "Saving failed. Please retry."); }
            finally {setBusy(false);}
          }}>{busy ? "Saving…" : !entitled ? "Premium plan required" : "Save this design"}</button>
          <Link href="/dashboard/website">Edit website sections <ArrowUpRight size={15}/></Link>
          {!entitled && <Link href="/dashboard/billing">Review subscription plans</Link>}
        </div>
      </section>
    </div>
  );
}
