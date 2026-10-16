export const RELEASED_THEMES = [
  "DEFAULT",
  "MODERN_WHITE",
  "BUSINESS_GREEN",
  "PORTFOLIO_LITE",
] as const;
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
