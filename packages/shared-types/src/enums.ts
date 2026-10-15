// ============================================================
// Nexora Shared Enums
// Centralized enum definitions used across frontend and backend
// ============================================================

/**
 * User roles for role-based access control (RBAC).
 * SUPER_ADMIN: Platform-level administrator
 * BUSINESS_OWNER: Owns and manages a business tenant
 * STAFF: Limited access, permissions controlled by BUSINESS_OWNER
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  STAFF = 'STAFF',
}

/**
 * Subscription plan tiers.
 */
export enum SubscriptionPlan {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
}

/**
 * Subscription lifecycle states.
 * TRIAL: Initial 7-day free trial
 * ACTIVE: Paid and active subscription
 * PAST_DUE: Payment failed, grace period
 * SUSPENDED: Access restricted, awaiting payment
 * EXPIRED: Subscription fully expired
 */
export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

/**
 * Website section types for the structured section builder.
 */
export enum SectionType {
  HERO = 'HERO',
  ABOUT = 'ABOUT',
  PRODUCTS = 'PRODUCTS',
  SERVICES = 'SERVICES',
  GALLERY = 'GALLERY',
  TESTIMONIALS = 'TESTIMONIALS',
  FAQ = 'FAQ',
  CONTACT = 'CONTACT',
  SOCIAL_LINKS = 'SOCIAL_LINKS',
  ANNOUNCEMENT_BAR = 'ANNOUNCEMENT_BAR',
}

/**
 * Theme identifiers. Free themes are available on all plans.
 * Premium themes require BASIC or PREMIUM subscription.
 */
export enum ThemeId {
  // Free Themes
  MODERN_WHITE = 'MODERN_WHITE',
  BUSINESS_GREEN = 'BUSINESS_GREEN',
  PORTFOLIO_LITE = 'PORTFOLIO_LITE',
  // Premium Themes
  LUXURY_GOLD = 'LUXURY_GOLD',
  FASHION_BLACK = 'FASHION_BLACK',
  RESTAURANT_RED = 'RESTAURANT_RED',
  TECH_STARTUP = 'TECH_STARTUP',
  CREATIVE_STUDIO = 'CREATIVE_STUDIO',
}

/**
 * Analytics event types tracked by the platform.
 */
export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  SERVICE_VIEW = 'SERVICE_VIEW',
  WHATSAPP_CLICK = 'WHATSAPP_CLICK',
  LEAD_FORM_SUBMISSION = 'LEAD_FORM_SUBMISSION',
}

/**
 * Product availability status.
 */
export enum ProductAvailability {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  COMING_SOON = 'COMING_SOON',
}

/**
 * Media asset types for Cloudinary uploads.
 */
export enum MediaType {
  LOGO = 'LOGO',
  BANNER = 'BANNER',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  GALLERY_IMAGE = 'GALLERY_IMAGE',
  SERVICE_IMAGE = 'SERVICE_IMAGE',
}

/**
 * Days of the week for business working hours.
 */
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}
