"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { WebsiteService, WebsiteConfig, ThemePreset, WebsiteSection } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Layout, 
  Save, 
  Globe, 
  ArrowUp, 
  ArrowDown, 
  Trash, 
  Plus, 
  Lock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Smartphone,
  Monitor
} from "lucide-react";
import Link from "next/link";

export default function AppearancePage() {
  const { user } = useAuth();
  const business = user?.businesses?.[0];
  const businessId = business?.id;
  const isTrial = business?.subscription?.plan === "TRIAL";

  // Configuration States
  const [themes, setThemes] = useState<ThemePreset[]>([]);
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [themeId, setThemeId] = useState<string>("DEFAULT");
  const [colorPalette, setColorPalette] = useState<Record<string, string>>({});
  const [typography, setTypography] = useState<Record<string, string>>({});
  const [customDomain, setCustomDomain] = useState<string>("");

  // UI States
  const [activeTab, setActiveTab] = useState<'themes' | 'sections' | 'colors' | 'domain'>('themes');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      if (!businessId) return;
      try {
        setIsLoading(true);
        const [themesData, configData] = await Promise.all([
          WebsiteService.getThemes(),
          WebsiteService.getWebsiteConfig(businessId)
        ]);
        setThemes(themesData);
        setConfig(configData);
        setSections(configData.sections || []);
        setThemeId(configData.theme);
        setColorPalette(configData.colorPalette || {});
        setTypography(configData.typography || {});
        setCustomDomain(configData.customDomain || "");
      } catch (error) {
        console.error("Failed to load appearance data", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [businessId]);

  // Load Google Fonts for preview in real-time
  useEffect(() => {
    const fonts = [typography.headingFont, typography.bodyFont].filter(Boolean);
    if (fonts.length === 0) return;
    
    const linkId = "google-fonts-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const fontQuery = fonts.map(f => f.replace(/\s+/g, "+")).join("|");
    link.href = `https://fonts.googleapis.com/css?family=${fontQuery}:300,400,500,600,700,800&display=swap`;
  }, [typography.headingFont, typography.bodyFont]);

  // Theme selection handler
  const handleSelectTheme = (themePreset: ThemePreset) => {
    if (themePreset.isPremium && isTrial) {
      return; // Locked for trials
    }
    setThemeId(themePreset.themeId);
    setColorPalette(themePreset.colors);
    setTypography({
      headingFont: themePreset.typography.headingFont,
      bodyFont: themePreset.typography.bodyFont,
      baseFontSize: themePreset.typography.baseFontSize || "16px",
      headingWeight: themePreset.typography.headingWeight || "700",
      bodyWeight: themePreset.typography.bodyWeight || "400"
    });
  };

  // Section CRUD operations
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap elements
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    if (expandedSection === sections[index].id) {
      setExpandedSection(null);
    }
  };

  const handleAddSection = (type: string) => {
    const defaultContents: Record<string, any> = {
      ANNOUNCEMENT_BAR: { text: "📢 Special Offer: Get 10% off your first purchase!", link: "", bgColor: "#4f46e5" },
      HERO: { headline: "Welcome to Our Business", subheadline: "We provide high-quality services and products tailored for you.", buttonText: "Learn More", buttonLink: "#about", imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80" },
      ABOUT: { title: "About Us", description: "Our business has been serving the community with dedication, bringing you the finest results and outstanding experiences.", imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" },
      PRODUCTS: { title: "Featured Products", subtitle: "Browse our handpicked products of premium quality." },
      SERVICES: { title: "Our Services", subtitle: "Explore the wide range of services we specialize in." },
      GALLERY: { title: "Our Gallery", imageUrl1: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80", imageUrl2: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80", imageUrl3: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" },
      TESTIMONIALS: { title: "Client Testimonials", testimonials: [{ name: "Amara Okeke", role: "Store Owner", quote: "This platform transformed how I share my products with clients. Absolutely recommended!" }, { name: "Kofi Mensah", role: "Designer", quote: "Stunning designs and simple layout controls. My business site was ready in minutes." }] },
      FAQ: { title: "Frequently Asked Questions", faqs: [{ question: "Where are you located?", answer: "We operate online and offer nationwide delivery." }, { question: "How can I place an order?", answer: "Click on the WhatsApp link on any product or contact us directly." }] },
      CONTACT: { title: "Get in Touch", email: true, whatsapp: true, phone: true },
      SOCIAL_LINKS: { title: "Connect With Us", facebook: "https://facebook.com", instagram: "https://instagram.com", twitter: "https://twitter.com", whatsapp: "https://wa.me/234" }
    };

    const newSection = {
      id: `temp-${Date.now()}`,
      type,
      content: defaultContents[type] || {},
    };

    setSections([...sections, newSection]);
    setExpandedSection(newSection.id);
    setShowAddSectionModal(false);
  };

  const handleUpdateSectionContent = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = {
      ...newSections[index],
      content: {
        ...newSections[index].content,
        [field]: value
      }
    };
    setSections(newSections);
  };

  // Save functionality
  const handleSave = async () => {
    if (!businessId) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // 1. Save theme settings
      await WebsiteService.updateTheme(businessId, {
        theme: themeId,
        colorPalette,
        typography
      });

      // 2. Save sections (which handles ordering and deleting removed ones)
      const savedSections = await WebsiteService.saveSections(businessId, sections);
      setSections(savedSections); // Update local sections with real DB IDs

      // 3. Save domain
      if (customDomain !== config?.customDomain) {
        await WebsiteService.updateCustomDomain(businessId, customDomain);
      }

      setSaveStatus({ type: 'success', message: 'All changes saved successfully!' });
    } catch (error: any) {
      console.error(error);
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading builder engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Builder</h1>
          <p className="text-muted-foreground mt-1">Design, customize sections, and preview your business page.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {saveStatus && (
            <div className={`text-sm px-3 py-1.5 rounded-lg border ${saveStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-destructive/10 border-destructive/30 text-destructive-foreground'}`}>
              {saveStatus.message}
            </div>
          )}
          <Button variant="outline" className="hidden md:flex" asChild>
            <Link href={`/@${business?.slug}`} target="_blank">
              <Globe className="w-4 h-4 mr-2" />
              Visit Site
            </Link>
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Editor Sidebar */}
        <div className="w-96 flex flex-col gap-4 min-h-0 flex-shrink-0">
          {/* Navigation tabs */}
          <div className="flex bg-secondary p-1 rounded-lg">
            <button 
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex flex-col items-center gap-1 ${activeTab === 'themes' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/30'}`}
              onClick={() => setActiveTab('themes')}
            >
              <Palette className="w-4 h-4" /> Presets
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex flex-col items-center gap-1 ${activeTab === 'colors' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/30'}`}
              onClick={() => setActiveTab('colors')}
            >
              <Palette className="w-4 h-4 text-emerald-500" /> Branding
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex flex-col items-center gap-1 ${activeTab === 'sections' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/30'}`}
              onClick={() => setActiveTab('sections')}
            >
              <Layout className="w-4 h-4" /> Sections
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex flex-col items-center gap-1 ${activeTab === 'domain' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:bg-background/30'}`}
              onClick={() => setActiveTab('domain')}
            >
              <Globe className="w-4 h-4" /> Domain
            </button>
          </div>

          {/* Panel content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-8 min-h-0">
            
            {/* Theme Presets Panel */}
            {activeTab === 'themes' && (
              <div className="space-y-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-base">Theme Presets</CardTitle>
                    <CardDescription className="text-xs">Choose a premium layout setup designed for conversions.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    {themes.map((theme) => {
                      const isSelected = themeId === theme.themeId;
                      const locked = theme.isPremium && isTrial;
                      return (
                        <div 
                          key={theme.id}
                          className={`relative cursor-pointer rounded-lg border overflow-hidden transition-all group aspect-[4/3] flex flex-col ${isSelected ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-foreground/30'}`}
                          onClick={() => handleSelectTheme(theme)}
                        >
                          <div className="w-full flex-1 bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${theme.previewImageUrl})` }}>
                            {/* Color previews */}
                            <div className="absolute bottom-2 left-2 flex gap-1 bg-black/60 backdrop-blur-sm p-1 rounded">
                              <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.primary }} />
                              <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.accent }} />
                              <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.colors.background }} />
                            </div>
                            {locked && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                                <Badge variant="secondary" className="flex items-center gap-1 font-semibold text-xs py-1 px-2">
                                  <Lock className="w-3 h-3 text-amber-500 fill-amber-500" /> Premium
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-2 bg-card border-t border-border flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{theme.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-primary" />}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {isTrial && (
                  <Card className="glass border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-4 flex gap-3 items-start">
                      <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-amber-400">Unlock Premium Themes</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Upgrade to Basic or Premium to access specialized layouts with rich presets.</p>
                        <Button variant="outline" size="sm" className="mt-2 text-[10px] h-7 border-amber-500/30 hover:bg-amber-500/10 text-amber-300" asChild>
                          <Link href="/dashboard/billing">Upgrade Account</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Custom Color/Typography Branding Panel */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-base">Color System</CardTitle>
                    <CardDescription className="text-xs font-medium">Fine-tune colors to match your business brand.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          className="w-12 h-10 p-1 cursor-pointer" 
                          value={colorPalette.primary || "#4f46e5"} 
                          onChange={(e) => setColorPalette({ ...colorPalette, primary: e.target.value })} 
                        />
                        <Input 
                          type="text" 
                          value={colorPalette.primary || ""} 
                          onChange={(e) => setColorPalette({ ...colorPalette, primary: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          className="w-12 h-10 p-1 cursor-pointer" 
                          value={colorPalette.accent || "#10b981"} 
                          onChange={(e) => setColorPalette({ ...colorPalette, accent: e.target.value })} 
                        />
                        <Input 
                          type="text" 
                          value={colorPalette.accent || ""} 
                          onChange={(e) => setColorPalette({ ...colorPalette, accent: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Background Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          className="w-12 h-10 p-1 cursor-pointer" 
                          value={colorPalette.background || "#ffffff"} 
                          onChange={(e) => setColorPalette({ ...colorPalette, background: e.target.value })} 
                        />
                        <Input 
                          type="text" 
                          value={colorPalette.background || ""} 
                          onChange={(e) => setColorPalette({ ...colorPalette, background: e.target.value })} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-base">Typography System</CardTitle>
                    <CardDescription className="text-xs">Set fonts for headers and body text.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Heading Font</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={typography.headingFont || "Inter"}
                        onChange={(e) => setTypography({ ...typography, headingFont: e.target.value })}
                      >
                        <option value="Inter">Inter (Sans-Serif)</option>
                        <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                        <option value="Outfit">Outfit (Geometric Sans)</option>
                        <option value="Montserrat">Montserrat (Bold Classic)</option>
                        <option value="Cinzel">Cinzel (Luxury Serif)</option>
                        <option value="Syncopate">Syncopate (Modern Tech)</option>
                        <option value="Space Grotesk">Space Grotesk (Futuristic Tech)</option>
                        <option value="DM Serif Display">DM Serif Display (Classic Bold)</option>
                        <option value="Syne">Syne (Creative Art)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Sleek Modern)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold mb-2 block">Body Text Font</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={typography.bodyFont || "Inter"}
                        onChange={(e) => setTypography({ ...typography, bodyFont: e.target.value })}
                      >
                        <option value="Inter">Inter (Clean Sans)</option>
                        <option value="Outfit">Outfit (Light Geometric)</option>
                        <option value="Montserrat">Montserrat (Highly Readable)</option>
                        <option value="Space Grotesk">Space Grotesk (Modern Tech)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Sleek Sans)</option>
                        <option value="Open Sans">Open Sans (Classic)</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Custom Domain Panel */}
            {activeTab === 'domain' && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Custom Domain</CardTitle>
                  <CardDescription className="text-xs">Connect your own custom domain (e.g. mybusiness.com) instead of our sub-domain.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user?.businesses?.[0]?.subscription?.plan !== 'PREMIUM' ? (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
                      <div className="flex gap-2 items-center text-primary font-bold text-xs">
                        <Lock className="w-4 h-4" /> PREMIUM FEATURE
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">Custom domain mapping is only available on our Premium Plan. Current plan: <span className="font-bold text-foreground">{user?.businesses?.[0]?.subscription?.plan || 'TRIAL'}</span></p>
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold" asChild>
                        <Link href="/dashboard/billing">Upgrade to Premium</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Custom Domain Address</Label>
                      <Input 
                        placeholder="e.g. www.mybusiness.com" 
                        value={customDomain} 
                        onChange={(e) => setCustomDomain(e.target.value)} 
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                        Note: After saving, point your domain's CNAME record to <code className="bg-secondary px-1 py-0.5 rounded font-mono">cname.nexora.ng</code>. Changes can take up to 24 hours to propagate.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sections Panel */}
            {activeTab === 'sections' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-foreground">Layout Sections</h3>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1" onClick={() => setShowAddSectionModal(!showAddSectionModal)}>
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </Button>
                </div>

                {/* Add Section Picker Modal Inline */}
                {showAddSectionModal && (
                  <Card className="glass border-dashed border-primary/40 p-3 bg-secondary/20">
                    <CardHeader className="p-0 pb-2">
                      <CardTitle className="text-xs font-bold flex justify-between items-center">
                        Select Section Type
                        <button className="text-muted-foreground hover:text-foreground text-[10px]" onClick={() => setShowAddSectionModal(false)}>Close</button>
                      </CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {["ANNOUNCEMENT_BAR", "HERO", "ABOUT", "PRODUCTS", "SERVICES", "GALLERY", "TESTIMONIALS", "FAQ", "CONTACT", "SOCIAL_LINKS"].map((type) => {
                        const exists = sections.some(s => s.type === type);
                        return (
                          <button
                            key={type}
                            className={`px-3 py-2 text-left text-xs font-semibold rounded-md border flex items-center justify-between transition-colors bg-card ${exists ? 'border-border text-muted-foreground opacity-60' : 'border-primary/20 text-foreground hover:bg-primary/5 hover:border-primary/40'}`}
                            onClick={() => handleAddSection(type)}
                          >
                            {type.replace("_", " ")}
                            {exists && <span className="text-[8px] px-1 bg-secondary text-muted-foreground rounded">Added</span>}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Section List Accordion */}
                <div className="space-y-3">
                  {sections.map((section, index) => {
                    const isExpanded = expandedSection === section.id;
                    return (
                      <Card key={section.id} className={`glass overflow-hidden border transition-all ${isExpanded ? 'border-primary' : 'border-border'}`}>
                        {/* Section Card Header */}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-card/50 cursor-pointer" onClick={() => setExpandedSection(isExpanded ? null : section.id)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                            <span className="text-xs font-bold text-foreground tracking-wide">{section.type.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7" 
                              disabled={index === 0} 
                              onClick={() => handleMoveSection(index, 'up')}
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7" 
                              disabled={index === sections.length - 1} 
                              onClick={() => handleMoveSection(index, 'down')}
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 hover:text-destructive hover:bg-destructive/10" 
                              onClick={() => handleDeleteSection(index)}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary" onClick={() => setExpandedSection(isExpanded ? null : section.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>
                          </div>
                        </div>

                        {/* Section Card Content Forms */}
                        {isExpanded && (
                          <CardContent className="p-4 border-t border-border/50 bg-secondary/10 space-y-4">
                            {/* Dynamic Forms per Section Type */}
                            {section.type === "ANNOUNCEMENT_BAR" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Banner Message</Label>
                                  <Input 
                                    value={section.content.text || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "text", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Link URL (Optional)</Label>
                                  <Input 
                                    value={section.content.link || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "link", e.target.value)} 
                                  />
                                </div>
                              </div>
                            )}

                            {section.type === "HERO" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Headline</Label>
                                  <Input 
                                    value={section.content.headline || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "headline", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Subheadline</Label>
                                  <Input 
                                    value={section.content.subheadline || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "subheadline", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Button Text</Label>
                                  <Input 
                                    value={section.content.buttonText || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "buttonText", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Banner Image URL</Label>
                                  <Input 
                                    value={section.content.imageUrl || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "imageUrl", e.target.value)} 
                                  />
                                </div>
                              </div>
                            )}

                            {section.type === "ABOUT" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Description</Label>
                                  <textarea 
                                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={section.content.description || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "description", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">About Image URL</Label>
                                  <Input 
                                    value={section.content.imageUrl || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "imageUrl", e.target.value)} 
                                  />
                                </div>
                              </div>
                            )}

                            {section.type === "PRODUCTS" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Subtitle</Label>
                                  <Input 
                                    value={section.content.subtitle || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "subtitle", e.target.value)} 
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Products are fetched dynamically from your Product Catalog.</p>
                              </div>
                            )}

                            {section.type === "SERVICES" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Subtitle</Label>
                                  <Input 
                                    value={section.content.subtitle || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "subtitle", e.target.value)} 
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Services are fetched dynamically from your Service Catalog.</p>
                              </div>
                            )}

                            {section.type === "GALLERY" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Gallery Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Image 1 URL</Label>
                                  <Input 
                                    value={section.content.imageUrl1 || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "imageUrl1", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Image 2 URL</Label>
                                  <Input 
                                    value={section.content.imageUrl2 || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "imageUrl2", e.target.value)} 
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] mb-1 block">Image 3 URL</Label>
                                  <Input 
                                    value={section.content.imageUrl3 || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "imageUrl3", e.target.value)} 
                                  />
                                </div>
                              </div>
                            )}

                            {section.type === "TESTIMONIALS" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div className="space-y-2 border-t pt-2 mt-2">
                                  <Label className="text-[10px] font-bold">Quotes List</Label>
                                  {(section.content.testimonials || []).map((t: any, tIndex: number) => (
                                    <div key={tIndex} className="p-2 border rounded bg-background/50 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold">Quote #{tIndex + 1}</span>
                                        <button 
                                          className="text-[9px] text-destructive hover:underline"
                                          onClick={() => {
                                            const updated = [...section.content.testimonials];
                                            updated.splice(tIndex, 1);
                                            handleUpdateSectionContent(index, "testimonials", updated);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                      <Input 
                                        placeholder="Name" 
                                        className="h-8 text-xs"
                                        value={t.name || ""} 
                                        onChange={(e) => {
                                          const updated = [...section.content.testimonials];
                                          updated[tIndex] = { ...updated[tIndex], name: e.target.value };
                                          handleUpdateSectionContent(index, "testimonials", updated);
                                        }}
                                      />
                                      <Input 
                                        placeholder="Role/Title" 
                                        className="h-8 text-xs"
                                        value={t.role || ""} 
                                        onChange={(e) => {
                                          const updated = [...section.content.testimonials];
                                          updated[tIndex] = { ...updated[tIndex], role: e.target.value };
                                          handleUpdateSectionContent(index, "testimonials", updated);
                                        }}
                                      />
                                      <textarea 
                                        placeholder="Quote details..."
                                        className="w-full min-h-[60px] text-xs rounded border bg-transparent p-1.5 focus-visible:outline-none"
                                        value={t.quote || ""} 
                                        onChange={(e) => {
                                          const updated = [...section.content.testimonials];
                                          updated[tIndex] = { ...updated[tIndex], quote: e.target.value };
                                          handleUpdateSectionContent(index, "testimonials", updated);
                                        }}
                                      />
                                    </div>
                                  ))}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full h-7 text-[10px]"
                                    onClick={() => {
                                      const updated = [...(section.content.testimonials || []), { name: "New Client", role: "Manager", quote: "New testimonial quote." }];
                                      handleUpdateSectionContent(index, "testimonials", updated);
                                    }}
                                  >
                                    + Add Quote Item
                                  </Button>
                                </div>
                              </div>
                            )}

                            {section.type === "FAQ" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div className="space-y-2 border-t pt-2 mt-2">
                                  <Label className="text-[10px] font-bold font-mono">FAQ Items</Label>
                                  {(section.content.faqs || []).map((faq: any, fIndex: number) => (
                                    <div key={fIndex} className="p-2 border rounded bg-background/50 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold">FAQ #{fIndex + 1}</span>
                                        <button 
                                          className="text-[9px] text-destructive hover:underline"
                                          onClick={() => {
                                            const updated = [...section.content.faqs];
                                            updated.splice(fIndex, 1);
                                            handleUpdateSectionContent(index, "faqs", updated);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                      <Input 
                                        placeholder="Question" 
                                        className="h-8 text-xs font-semibold"
                                        value={faq.question || ""} 
                                        onChange={(e) => {
                                          const updated = [...section.content.faqs];
                                          updated[fIndex] = { ...updated[fIndex], question: e.target.value };
                                          handleUpdateSectionContent(index, "faqs", updated);
                                        }}
                                      />
                                      <textarea 
                                        placeholder="Answer"
                                        className="w-full min-h-[50px] text-xs rounded border bg-transparent p-1.5 focus-visible:outline-none"
                                        value={faq.answer || ""} 
                                        onChange={(e) => {
                                          const updated = [...section.content.faqs];
                                          updated[fIndex] = { ...updated[fIndex], answer: e.target.value };
                                          handleUpdateSectionContent(index, "faqs", updated);
                                        }}
                                      />
                                    </div>
                                  ))}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full h-7 text-[10px]"
                                    onClick={() => {
                                      const updated = [...(section.content.faqs || []), { question: "What is your return policy?", answer: "Goods can be returned within 7 days." }];
                                      handleUpdateSectionContent(index, "faqs", updated);
                                    }}
                                  >
                                    + Add FAQ Item
                                  </Button>
                                </div>
                              </div>
                            )}

                            {section.type === "CONTACT" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold block mb-1">Show Contact Channels</Label>
                                  <div className="flex flex-col gap-2 bg-card p-2.5 rounded border">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={!!section.content.email} 
                                        onChange={(e) => handleUpdateSectionContent(index, "email", e.target.checked)}
                                        className="rounded border-border bg-transparent text-primary focus:ring-primary w-4 h-4"
                                      />
                                      Display Email Address
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={!!section.content.whatsapp} 
                                        onChange={(e) => handleUpdateSectionContent(index, "whatsapp", e.target.checked)}
                                        className="rounded border-border bg-transparent text-primary focus:ring-primary w-4 h-4"
                                      />
                                      Display WhatsApp Inquiry Button
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={!!section.content.phone} 
                                        onChange={(e) => handleUpdateSectionContent(index, "phone", e.target.checked)}
                                        className="rounded border-border bg-transparent text-primary focus:ring-primary w-4 h-4"
                                      />
                                      Display Phone Number
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {section.type === "SOCIAL_LINKS" && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-[11px] mb-1 block">Section Title</Label>
                                  <Input 
                                    value={section.content.title || ""} 
                                    onChange={(e) => handleUpdateSectionContent(index, "title", e.target.value)} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[11px] mb-1 block">Social URLs</Label>
                                  <div className="space-y-2 bg-card p-3 border rounded">
                                    <div>
                                      <Label className="text-[10px] mb-0.5 block text-muted-foreground">Facebook</Label>
                                      <Input 
                                        className="h-8 text-xs"
                                        placeholder="e.g. https://facebook.com/mybrand"
                                        value={section.content.facebook || ""} 
                                        onChange={(e) => handleUpdateSectionContent(index, "facebook", e.target.value)} 
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] mb-0.5 block text-muted-foreground">Instagram</Label>
                                      <Input 
                                        className="h-8 text-xs"
                                        placeholder="e.g. https://instagram.com/mybrand"
                                        value={section.content.instagram || ""} 
                                        onChange={(e) => handleUpdateSectionContent(index, "instagram", e.target.value)} 
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] mb-0.5 block text-muted-foreground">Twitter / X</Label>
                                      <Input 
                                        className="h-8 text-xs"
                                        placeholder="e.g. https://x.com/mybrand"
                                        value={section.content.twitter || ""} 
                                        onChange={(e) => handleUpdateSectionContent(index, "twitter", e.target.value)} 
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] mb-0.5 block text-muted-foreground">LinkedIn</Label>
                                      <Input 
                                        className="h-8 text-xs"
                                        placeholder="e.g. https://linkedin.com/company/mybrand"
                                        value={section.content.linkedin || ""} 
                                        onChange={(e) => handleUpdateSectionContent(index, "linkedin", e.target.value)} 
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Area (Dynamic Browser Viewport Mockup) */}
        <div className="flex-1 bg-card border border-border rounded-xl shadow-inner overflow-hidden relative hidden lg:flex flex-col min-h-0">
          
          {/* Mock Browser Header */}
          <div className="w-full h-11 bg-secondary flex items-center justify-between px-4 border-b border-border flex-shrink-0 z-10">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            
            <div className="bg-background px-4 py-1.5 rounded-lg text-xs text-muted-foreground w-80 text-center truncate font-mono shadow-sm">
              {customDomain || `${business?.slug || "my-store"}.nexora.ng`}
            </div>

            <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg shadow-sm border border-border">
              <button 
                className={`p-1 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                className={`p-1 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Webpage iframe-like viewport container */}
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-auto min-h-0">
            <div 
              className={`bg-white shadow-2xl transition-all duration-300 overflow-y-auto custom-scrollbar flex flex-col ${previewMode === 'desktop' ? 'w-full h-full' : 'w-[375px] h-[667px] border-8 border-slate-900 rounded-3xl'}`}
              style={{ 
                fontFamily: typography.bodyFont || "sans-serif",
                color: colorPalette.foreground || "#000000"
              }}
            >
              {/* Dynamic Live Rendering of Sections */}
              {sections.map((section, idx) => {
                const colors = {
                  primary: colorPalette.primary || "#4f46e5",
                  primaryForeground: colorPalette.primaryForeground || "#ffffff",
                  secondary: colorPalette.secondary || "#f4f4f5",
                  secondaryForeground: colorPalette.secondaryForeground || "#18181b",
                  accent: colorPalette.accent || "#2563eb",
                  accentForeground: colorPalette.accentForeground || "#ffffff",
                  background: colorPalette.background || "#ffffff",
                  foreground: colorPalette.foreground || "#09090b",
                  muted: colorPalette.muted || "#f4f4f5",
                  mutedForeground: colorPalette.mutedForeground || "#71717a",
                  card: colorPalette.card || "#ffffff",
                  cardForeground: colorPalette.cardForeground || "#09090b",
                  border: colorPalette.border || "#e4e4e7"
                };

                const hStyle = { fontFamily: typography.headingFont || "sans-serif" };

                if (section.type === "ANNOUNCEMENT_BAR") {
                  return (
                    <div 
                      key={section.id} 
                      className="py-2.5 px-4 text-center text-xs font-semibold tracking-wide flex justify-center items-center select-none"
                      style={{ 
                        backgroundColor: section.content.bgColor || colors.primary, 
                        color: colors.primaryForeground
                      }}
                    >
                      {section.content.text || "Announcement Message"}
                    </div>
                  );
                }

                if (section.type === "HERO") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-16 px-8 flex flex-col items-center justify-center text-center relative overflow-hidden border-b"
                      style={{ backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }}
                    >
                      {section.content.imageUrl && (
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-cover bg-center" style={{ backgroundImage: `url(${section.content.imageUrl})` }}></div>
                      )}
                      <h1 className="text-3xl md:text-4xl font-extrabold max-w-2xl leading-tight" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.headline || "Welcome to Our Shop"}
                      </h1>
                      <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-lg leading-relaxed" style={{ color: colors.mutedForeground }}>
                        {section.content.subheadline || "We provide high-quality services and products."}
                      </p>
                      {section.content.buttonText && (
                        <button 
                          className="mt-8 px-6 py-2.5 rounded-full font-bold text-xs shadow-md hover:opacity-95 transition-opacity"
                          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
                        >
                          {section.content.buttonText}
                        </button>
                      )}
                    </section>
                  );
                }

                if (section.type === "ABOUT") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-b"
                      style={{ backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }}
                    >
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold border-b pb-2 inline-block" style={{ ...hStyle, color: colors.foreground, borderColor: colors.primary }}>
                          {section.content.title || "About Us"}
                        </h2>
                        <p className="text-xs md:text-sm leading-relaxed" style={{ color: colors.mutedForeground }}>
                          {section.content.description || "Learn more about what we do and who we are."}
                        </p>
                      </div>
                      {section.content.imageUrl && (
                        <div className="rounded-xl overflow-hidden shadow-md aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${section.content.imageUrl})` }}></div>
                      )}
                    </section>
                  );
                }

                if (section.type === "PRODUCTS") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b text-center"
                      style={{ backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "Our Products"}
                      </h2>
                      {section.content.subtitle && <p className="text-xs text-muted-foreground mt-1" style={{ color: colors.mutedForeground }}>{section.content.subtitle}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                        {[1, 2, 3].map((val) => (
                          <div key={val} className="border rounded-xl p-3 flex flex-col items-center bg-card shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                            <div className="w-full aspect-square rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground mb-3" style={{ backgroundColor: colors.muted }}>
                              Product Placeholder #{val}
                            </div>
                            <span className="text-xs font-bold block">Product Name {val}</span>
                            <span className="text-xs font-bold mt-1" style={{ color: colors.primary }}>₦5,000</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (section.type === "SERVICES") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b text-center"
                      style={{ backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "Our Services"}
                      </h2>
                      {section.content.subtitle && <p className="text-xs text-muted-foreground mt-1" style={{ color: colors.mutedForeground }}>{section.content.subtitle}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        {[1, 2, 3].map((val) => (
                          <div key={val} className="p-4 border rounded-xl bg-background text-left shadow-sm flex flex-col gap-2" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                            <span className="text-xs font-bold" style={{ color: colors.primary }}>Service Title {val}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam elementum sodales.</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (section.type === "GALLERY") {
                  const galleryImages = [section.content.imageUrl1, section.content.imageUrl2, section.content.imageUrl3].filter(Boolean);
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b text-center"
                      style={{ backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold mb-6" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "Gallery"}
                      </h2>
                      <div className="grid grid-cols-3 gap-4">
                        {galleryImages.length > 0 ? (
                          galleryImages.map((img, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm bg-cover bg-center border" style={{ backgroundImage: `url(${img})`, borderColor: colors.border }}></div>
                          ))
                        ) : (
                          [1, 2, 3].map((i) => (
                            <div key={i} className="aspect-square rounded-xl bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground border" style={{ backgroundColor: colors.muted, borderColor: colors.border }}>
                              Placeholder {i}
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  );
                }

                if (section.type === "TESTIMONIALS") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b text-center"
                      style={{ backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold mb-8" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "Testimonials"}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(section.content.testimonials || []).map((t: any, i: number) => (
                          <div key={i} className="p-5 rounded-xl border bg-background text-left shadow-sm space-y-3" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                            <p className="text-xs italic leading-relaxed" style={{ color: colors.mutedForeground }}>"{t.quote || 'Quote details'}"</p>
                            <div>
                              <span className="text-xs font-bold block">{t.name || 'Client Name'}</span>
                              <span className="text-[10px] text-muted-foreground block">{t.role || 'Role'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (section.type === "FAQ") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b"
                      style={{ backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold text-center mb-8" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "FAQ"}
                      </h2>
                      <div className="space-y-4 max-w-xl mx-auto">
                        {(section.content.faqs || []).map((faq: any, i: number) => (
                          <div key={i} className="border-b pb-3" style={{ borderColor: colors.border }}>
                            <h4 className="text-xs font-bold mb-1">{faq.question || "Question"}</h4>
                            <p className="text-xs leading-relaxed" style={{ color: colors.mutedForeground }}>{faq.answer || "Answer details..."}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (section.type === "CONTACT") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-12 px-8 border-b text-center"
                      style={{ backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }}
                    >
                      <h2 className="text-2xl font-bold mb-4" style={{ ...hStyle, color: colors.foreground }}>
                        {section.content.title || "Contact Us"}
                      </h2>
                      <p className="text-xs max-w-md mx-auto text-muted-foreground leading-relaxed" style={{ color: colors.mutedForeground }}>
                        Reach out to us via any of the communication channels below or leave a message.
                      </p>
                      
                      <div className="flex flex-wrap justify-center gap-6 mt-8">
                        {section.content.email && (
                          <span className="text-xs font-semibold px-4 py-2 bg-background border rounded-full shadow-sm flex items-center gap-1.5" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                            📧 {user?.email || "business@email.com"}
                          </span>
                        )}
                        {section.content.phone && (
                          <span className="text-xs font-semibold px-4 py-2 bg-background border rounded-full shadow-sm flex items-center gap-1.5" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                            📞 {user?.firstName ? "+234 800 000 0000" : "+234 800 000 0000"}
                          </span>
                        )}
                        {section.content.whatsapp && (
                          <span className="text-xs font-semibold px-4 py-2 bg-emerald-500 text-white rounded-full shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-emerald-600 transition-colors">
                            💬 WhatsApp Chat
                          </span>
                        )}
                      </div>
                    </section>
                  );
                }

                if (section.type === "SOCIAL_LINKS") {
                  return (
                    <section 
                      key={section.id} 
                      className="py-8 px-8 border-b text-center flex flex-col items-center gap-4"
                      style={{ backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }}
                    >
                      {section.content.title && <h3 className="text-xs font-bold" style={{ color: colors.foreground }}>{section.content.title}</h3>}
                      <div className="flex gap-4">
                        {section.content.facebook && <span className="text-xs font-bold cursor-pointer" style={{ color: colors.primary }}>Facebook</span>}
                        {section.content.instagram && <span className="text-xs font-bold cursor-pointer" style={{ color: colors.primary }}>Instagram</span>}
                        {section.content.twitter && <span className="text-xs font-bold cursor-pointer" style={{ color: colors.primary }}>Twitter</span>}
                        {section.content.linkedin && <span className="text-xs font-bold cursor-pointer" style={{ color: colors.primary }}>LinkedIn</span>}
                      </div>
                    </section>
                  );
                }

                return null;
              })}

              {/* Simple Dynamic Footer */}
              <footer className="mt-auto py-8 text-center text-[10px] text-muted-foreground border-t bg-slate-50 border-slate-100 flex flex-col gap-1 items-center">
                <span>© 2026 {business?.name || "Business Name"}. All rights reserved.</span>
                <span className="text-[8px] tracking-widest text-slate-400 uppercase">Powered by Nexora</span>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
