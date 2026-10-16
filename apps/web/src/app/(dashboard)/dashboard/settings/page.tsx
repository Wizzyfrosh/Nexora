"use client";
import Link from "next/link";
import { MediaPicker } from "@/components/media-picker";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Settings as SettingsIcon,
  User,
  Palette,
  Clock,
  Share2,
  Globe,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { BusinessService } from "@/lib/api/business";
import { UpdateBusinessDto, DayOfWeek } from "@nexora/shared-types";

// ============================================================
// Tab definitions
// ============================================================
const TABS = [
  { id: "general",  label: "General",       icon: User },
  { id: "branding", label: "Branding",      icon: Palette },
  { id: "hours",    label: "Working Hours", icon: Clock },
  { id: "social",   label: "Social Links",  icon: Share2 },
  { id: "publish",  label: "Publish",       icon: Globe },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ============================================================
// Day-of-week definitions for working hours
// ============================================================
const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: "Monday",
  [DayOfWeek.TUESDAY]: "Tuesday",
  [DayOfWeek.WEDNESDAY]: "Wednesday",
  [DayOfWeek.THURSDAY]: "Thursday",
  [DayOfWeek.FRIDAY]: "Friday",
  [DayOfWeek.SATURDAY]: "Saturday",
  [DayOfWeek.SUNDAY]: "Sunday",
};

const DEFAULT_HOURS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
].map((day) => ({
  day,
  openTime: "09:00",
  closeTime: "17:00",
  isClosed: day === DayOfWeek.SUNDAY,
}));

// ============================================================
// Page Component
// ============================================================
export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const business = user?.businesses?.[0];
  const businessId = business?.id;

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [workingHours, setWorkingHours] = useState(DEFAULT_HOURS);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // ---- Load profile ----
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    BusinessService.getProfile(businessId)
      .then((data) => {
        if (cancelled) return;
        setName(data.name || "");
        setSlug(data.slug || "");
        setDescription(data.description || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setWhatsapp(data.whatsapp || "");
        setAddress(data.address || "");
        setLogoUrl(data.logoUrl || "");
        setBannerUrl(data.bannerUrl || "");
        if (data.workingHours && Array.isArray(data.workingHours) && data.workingHours.length > 0) {
          setWorkingHours(data.workingHours);
        }
        if (data.socialLinks && typeof data.socialLinks === "object") {
          setSocialLinks(data.socialLinks as Record<string, string>);
        }
      })
      .catch(() => { if (!cancelled) setLoadError("Business details could not be loaded. Reload to retry; no changes were saved."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  // ---- Save handler ----
  const handleSave = async () => {
    if (!businessId || loadError) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");

    const dto: UpdateBusinessDto = {
      name,
      description: description || undefined,
      phone: phone || undefined,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      address: address || undefined,
      logoUrl,
      bannerUrl,
      workingHours,
      socialLinks,
    };

    try {
      await BusinessService.updateProfile(businessId, dto);
      setSaved(true);
      refreshUser();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) return <div role="alert"><p>{loadError}</p><Button onClick={() => window.location.reload()}>Reload settings</Button></div>;

  return (
    <div className="space-y-8">
      {saveError && <p role="alert" className="text-red-700">{saveError}</p>}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Business Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your business profile, branding, and publishing options.
          </p>
        </div>
        <Button
          variant="gradient"
          className="font-semibold shadow-lg min-w-[140px]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Sidebar */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    whitespace-nowrap flex-shrink-0
                    ${isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }
                  `}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "general" && (
                <GeneralTab
                  name={name} setName={setName}
                  slug={slug}
                  description={description} setDescription={setDescription}
                  email={email} setEmail={setEmail}
                  phone={phone} setPhone={setPhone}
                  whatsapp={whatsapp} setWhatsapp={setWhatsapp}
                  address={address} setAddress={setAddress}
                />
              )}
              {activeTab === "branding" && (
                <BrandingTab
                  logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                  bannerUrl={bannerUrl} setBannerUrl={setBannerUrl}
                />
              )}
              {activeTab === "hours" && (
                <WorkingHoursTab
                  workingHours={workingHours}
                  setWorkingHours={setWorkingHours}
                />
              )}
              {activeTab === "social" && (
                <SocialLinksTab
                  socialLinks={socialLinks}
                  setSocialLinks={setSocialLinks}
                />
              )}
              {activeTab === "publish" && (
                <PublishTab />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GENERAL TAB
// ============================================================
function GeneralTab({
  name, setName,
  slug,
  description, setDescription,
  email, setEmail,
  phone, setPhone,
  whatsapp, setWhatsapp,
  address, setAddress,
}: {
  name: string; setName: (v: string) => void;
  slug: string;
  description: string; setDescription: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  whatsapp: string; setWhatsapp: (v: string) => void;
  address: string; setAddress: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
          <CardDescription>Core details about your business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business Name</Label>
              <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Business" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-slug">Slug (URL Handle)</Label>
              <Input id="biz-slug" value={slug} disabled className="h-11 bg-secondary/30 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Slugs cannot be changed after creation.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-desc">Description</Label>
            <textarea
              id="biz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell your customers about your business..."
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background/50 px-4 py-3 text-sm shadow-sm transition-colors focus:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Contact Details</CardTitle>
          <CardDescription>How customers can reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="biz-email">Contact Email</Label>
              <Input id="biz-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@mybusiness.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-phone">Phone Number</Label>
              <Input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" className="h-11" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="biz-whatsapp">WhatsApp Number</Label>
              <Input id="biz-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 801 234 5678" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-address">Physical Address</Label>
              <Input id="biz-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Lagos Avenue, Ikeja" className="h-11" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// BRANDING TAB
// ============================================================
function BrandingTab({ logoUrl, setLogoUrl, bannerUrl, setBannerUrl }: {
  logoUrl: string; setLogoUrl: (v: string) => void;
  bannerUrl: string; setBannerUrl: (v: string) => void;
}) {
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Business logo</CardTitle><CardDescription>Choose a verified upload owned by your business.</CardDescription></CardHeader>
      <CardContent><MediaPicker value={logoUrl ? [logoUrl] : []} max={1} onChange={urls => setLogoUrl(urls[0] || "")} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Banner image</CardTitle><CardDescription>Save your settings to attach or remove the selected image.</CardDescription></CardHeader>
      <CardContent><MediaPicker value={bannerUrl ? [bannerUrl] : []} max={1} onChange={urls => setBannerUrl(urls[0] || "")} /></CardContent></Card>
  </div>;
}

// ============================================================
// WORKING HOURS TAB
// ============================================================
function WorkingHoursTab({
  workingHours,
  setWorkingHours,
}: {
  workingHours: typeof DEFAULT_HOURS;
  setWorkingHours: (v: typeof DEFAULT_HOURS) => void;
}) {
  const updateDay = (index: number, field: string, value: string | boolean) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setWorkingHours(updated);
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Working Hours</CardTitle>
        <CardDescription>Set your business operating hours. Customers will see these on your site.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {workingHours.map((day, i) => (
            <div
              key={day.day}
              className={`
                flex items-center gap-4 p-3 rounded-lg border transition-colors
                ${day.isClosed
                  ? "border-border/30 bg-secondary/20 opacity-60"
                  : "border-border/50 bg-background/50"
                }
              `}
            >
              <div className="w-28 flex-shrink-0">
                <span className="text-sm font-medium">{DAY_LABELS[day.day] || day.day}</span>
              </div>

              <button
                type="button"
                onClick={() => updateDay(i, "isClosed", !day.isClosed)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out
                  ${day.isClosed ? "bg-secondary" : "bg-primary"}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${day.isClosed ? "translate-x-0" : "translate-x-5"}
                  `}
                />
              </button>
              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
                {day.isClosed ? "Closed" : "Open"}
              </span>

              {!day.isClosed && (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={day.openTime}
                    onChange={(e) => updateDay(i, "openTime", e.target.value)}
                    className="h-9 w-32 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={day.closeTime}
                    onChange={(e) => updateDay(i, "closeTime", e.target.value)}
                    className="h-9 w-32 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SOCIAL LINKS TAB
// ============================================================
const SOCIAL_PLATFORMS = [
  { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourbusiness" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "twitter",   label: "Twitter / X", placeholder: "https://x.com/yourbusiness" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/yourbusiness" },
  { key: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@yourbusiness" },
  { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@yourbusiness" },
];

function SocialLinksTab({
  socialLinks,
  setSocialLinks,
}: {
  socialLinks: Record<string, string>;
  setSocialLinks: (v: Record<string, string>) => void;
}) {
  const updateLink = (key: string, value: string) => {
    setSocialLinks({ ...socialLinks, [key]: value });
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Social Media Links</CardTitle>
        <CardDescription>Store your social profiles. Social-link rendering is not included in this public-site release.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SOCIAL_PLATFORMS.map((platform) => (
          <div key={platform.key} className="space-y-2">
            <Label htmlFor={`social-${platform.key}`}>{platform.label}</Label>
            <Input
              id={`social-${platform.key}`}
              value={socialLinks[platform.key] || ""}
              onChange={(e) => updateLink(platform.key, e.target.value)}
              placeholder={platform.placeholder}
              className="h-11"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// PUBLISH TAB
// ============================================================
function PublishTab() {
  return <Card><CardHeader><CardTitle>Website publishing</CardTitle><CardDescription>Preview your site and review publication requirements in My website. Saving this profile does not publish it.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/dashboard/website">Manage website publishing</Link></Button></CardContent></Card>;
}
