/** One source of truth shared by selection UI, API mutations and public rendering. */
export const TEMPLATE_CATALOG = [
  { id: "DEFAULT", name: "Nexora Signature", category: "All businesses", tier: "BASIC", tone: "#8150b1", surface: "#faf5ff", description: "A polished, adaptable business introduction.", layout: "classic" },
  { id: "MODERN_WHITE", name: "Atelier Minimal", category: "Retail & Services", tier: "BASIC", tone: "#27272a", surface: "#f4f4f5", description: "Clean editorial spacing and refined product cards.", layout: "minimal" },
  { id: "BUSINESS_GREEN", name: "Botanical Studio", category: "Wellness & Lifestyle", tier: "BASIC", tone: "#285c46", surface: "#edf4eb", description: "Soft organic forms for growing local brands.", layout: "organic" },
  { id: "PORTFOLIO_LITE", name: "The Editorial", category: "Portfolio & Creative", tier: "BASIC", tone: "#8d6046", surface: "#f8f2e9", description: "Typography-led storytelling with gallery-style imagery.", layout: "editorial" },
  { id: "LUXURY_GOLD", name: "Maison Luxe", category: "Luxury & Jewellery", tier: "PREMIUM", tone: "#c9a15a", surface: "#151311", description: "Dark luxury, gold detailing and generous whitespace.", layout: "luxury" },
  { id: "FASHION_BLACK", name: "Mode Noir", category: "Fashion & Beauty", tier: "PREMIUM", tone: "#f0eeee", surface: "#171717", description: "Bold fashion-editorial composition and immersive photography.", layout: "fashion" },
  { id: "RESTAURANT_RED", name: "The Table", category: "Food & Hospitality", tier: "PREMIUM", tone: "#a84230", surface: "#fcf3e7", description: "Warm restaurant storytelling with a curated menu feel.", layout: "hospitality" },
  { id: "TECH_STARTUP", name: "Orbit Digital", category: "Technology & Agencies", tier: "PREMIUM", tone: "#65b4ff", surface: "#0d1429", description: "Structured product-focused visuals and confident contrast.", layout: "technology" },
  { id: "CREATIVE_STUDIO", name: "Mosaic Works", category: "Design & Studios", tier: "PREMIUM", tone: "#9b4c81", surface: "#fff0ed", description: "Expressive typography and a vibrant creative portfolio.", layout: "creative" },
] as const;

export type TemplateId = (typeof TEMPLATE_CATALOG)[number]["id"];
export type TemplateTier = "BASIC" | "PREMIUM";
export const RELEASED_THEMES = TEMPLATE_CATALOG.map((template) => template.id);
export function templateTier(id: string): TemplateTier | null {
  return TEMPLATE_CATALOG.find((template) => template.id === id)?.tier ?? null;
}

/** Paid premium access is checked at the point of each write AND each public read. */
export function isTemplateEntitled(
  id: string,
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd?: Date | string | null;
  } | null | undefined,
  now = new Date(),
): boolean {
  const tier = templateTier(id);
  if (!tier) return false;
  if (tier === "BASIC") return true;
  if (subscription?.plan !== "PREMIUM" || subscription.status !== "ACTIVE")
    return false;
  const end = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  return !!end && Number.isFinite(end.getTime()) && end > now;
}
/** Next may pass a percent-encoded route segment; decode once and allow only canonical handles. */
export function normalizeStorefrontHandle(input: string): string | null {
  try {
    const handle = decodeURIComponent(input);
    return handle.length <= 101 && /^@[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)
      ? handle
      : null;
  } catch {
    return null;
  }
}
export const RELEASED_SECTIONS = [
  "HERO",
  "ABOUT",
  "PRODUCTS",
  "SERVICES",
  "CONTACT",
] as const;
export type ReleasedSectionType = (typeof RELEASED_SECTIONS)[number];
export interface StorefrontSection {
  id?: string;
  type: ReleasedSectionType;
  content: {
    headline?: string;
    subheadline?: string;
    title?: string;
    description?: string;
    subtitle?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonLink?: string;
    email?: boolean;
    whatsapp?: boolean;
  };
}
export interface Storefront {
  analyticsEnabled: boolean;
  business: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  };
  theme: string;
  primary: string;
  sections: StorefrontSection[];
  products: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    availability: string;
    images: { url: string; altText: string | null }[];
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    priceLabel: string | null;
    images: string[];
  }[];
  page: number;
  pageSize: number;
  productsTotal: number;
  servicesTotal: number;
}
export interface PublicationState {
  isPublished: boolean;
  publishingEnabled: boolean;
  slug: string;
  reasons: string[];
}
const fields: Record<ReleasedSectionType, Record<string, number>> = {
  HERO: {
    headline: 160,
    subheadline: 600,
    imageUrl: 2048,
    buttonText: 60,
    buttonLink: 60,
  },
  ABOUT: { title: 160, description: 5000, imageUrl: 2048 },
  PRODUCTS: { title: 160, subtitle: 600 },
  SERVICES: { title: 160, subtitle: 600 },
  CONTACT: { title: 160, email: 0, whatsapp: 0 },
};
export function releasedSections(input: unknown): StorefrontSection[] {
  if (!Array.isArray(input) || input.length > 5)
    throw new Error("Use up to five released sections");
  const seen = new Set<string>();
  return input.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid section");
    const s = value as Record<string, unknown>;
    if (
      typeof s.type !== "string" ||
      !RELEASED_SECTIONS.includes(s.type as ReleasedSectionType) ||
      seen.has(s.type)
    )
      throw new Error("Unsupported or duplicate section");
    seen.add(s.type);
    if (!s.content || typeof s.content !== "object" || Array.isArray(s.content))
      throw new Error("Invalid section content");
    const type = s.type as ReleasedSectionType;
    for (const [key, v] of Object.entries(s.content)) {
      const max = Object.prototype.hasOwnProperty.call(fields[type], key)
        ? fields[type][key]
        : undefined;
      if (
        max === undefined ||
        (max === 0
          ? typeof v !== "boolean"
          : typeof v !== "string" || v.length > max)
      )
        throw new Error(`Unsupported ${type} content field: ${key}`);
      if (
        key === "buttonLink" &&
        v &&
        !/^#(?:about|products|services|contact)$/.test(String(v))
      )
        throw new Error("Hero buttons must link to a site section");
      if (key === "imageUrl" && v && !/^https:\/\//.test(String(v)))
        throw new Error("Images must use a verified HTTPS upload");
    }
    return {
      ...(typeof s.id === "string" ? { id: s.id } : {}),
      type,
      content: s.content as StorefrontSection["content"],
    };
  });
}
