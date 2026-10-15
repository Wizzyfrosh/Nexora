// ============================================================
// Nexora Shared Interfaces
// Core domain interfaces used across frontend and backend
// ============================================================

import {
  UserRole,
  SubscriptionPlan,
  SubscriptionStatus,
  SectionType,
  ThemeId,
  AnalyticsEventType,
  ProductAvailability,
  MediaType,
  DayOfWeek,
} from './enums';

// ---- Base Entity ----

/** Base fields present on every database entity. */
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt: string | null;
}

// ---- User ----

export interface IUser extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl: string | null;
}

// ---- Business (Tenant) ----

export interface IWorkingHours {
  day: DayOfWeek;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
  isClosed: boolean;
}

export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

export interface IBusiness extends BaseEntity {
  ownerId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  workingHours: IWorkingHours[];
  socialLinks: ISocialLinks;
  isPublished: boolean;
}

// ---- Subscription ----

export interface ISubscription extends BaseEntity {
  businessId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialStartDate: string;
  trialEndDate: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paystackSubscriptionId: string | null;
  paystackCustomerId: string | null;
}

// ---- Product ----

export interface ICategory extends BaseEntity {
  businessId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface IProductImage {
  id: string;
  url: string;
  altText: string | null;
  order: number;
}

export interface IProduct extends BaseEntity {
  businessId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  availability: ProductAvailability;
  isFeatured: boolean;
  images: IProductImage[];
}

// ---- Service ----

export interface IService extends BaseEntity {
  businessId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  priceLabel: string | null; // e.g. "Starting from ₦5,000"
  images: string[];
}

// ---- Website Builder ----

export interface IPage extends BaseEntity {
  businessId: string;
  title: string;
  slug: string;
  isHomepage: boolean;
  sections: ISection[];
}

export interface ISection extends BaseEntity {
  pageId: string;
  type: SectionType;
  order: number;
  isVisible: boolean;
  config: Record<string, unknown>; // JSON-driven configuration
}

// ---- Theme ----

export interface IThemeColorTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  destructive: string;
  destructiveForeground: string;
}

export interface IThemeTypography {
  headingFont: string;
  bodyFont: string;
  baseFontSize: string;
  headingWeight: string;
  bodyWeight: string;
}

export interface IThemeSpacing {
  sectionPaddingY: string;
  sectionPaddingX: string;
  containerMaxWidth: string;
  cardBorderRadius: string;
  buttonBorderRadius: string;
}

export interface ITheme {
  id: ThemeId;
  name: string;
  isPremium: boolean;
  colors: IThemeColorTokens;
  darkColors: IThemeColorTokens;
  typography: IThemeTypography;
  spacing: IThemeSpacing;
  previewImageUrl: string;
}

// ---- Analytics ----

export interface IAnalyticsEvent {
  businessId: string;
  eventType: AnalyticsEventType;
  resourceId: string | null; // productId, serviceId, pageId
  metadata: Record<string, unknown>;
  sessionId: string;
  timestamp: string;
}

export interface IAnalyticsSummary {
  totalPageViews: number;
  totalProductViews: number;
  totalServiceViews: number;
  totalWhatsappClicks: number;
  totalLeadSubmissions: number;
  periodStart: string;
  periodEnd: string;
}

// ---- Lead ----

export interface ILead extends BaseEntity {
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string; // page slug where submission happened
  isRead: boolean;
}

export interface ILeadStats {
  total: number;
  unread: number;
  thisWeek: number;
}

// ---- Media ----

export interface IMedia extends BaseEntity {
  businessId: string;
  type: MediaType;
  url: string;
  publicId: string; // Cloudinary public ID
  altText: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

// ---- API Response ----

export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface IPaginatedResponse<T = unknown> extends IApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
