// ============================================================
// Nexora Shared DTOs
// Data Transfer Objects for API requests and responses
// ============================================================

import {
  SubscriptionPlan,
  ProductAvailability,
  DayOfWeek,
} from './enums';

// ---- Auth DTOs ----

export interface SignupDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ---- Business DTOs ----

export interface CreateBusinessDto {
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
}

export interface UpdateBusinessDto {
  name?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  workingHours?: Array<{
    day: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
  isPublished?: boolean;
  logoUrl?: string;
  bannerUrl?: string;
}

// ---- Product DTOs ----

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  categoryId?: string;
  availability?: ProductAvailability;
  isFeatured?: boolean;
  images?: Array<{
    url: string;
    altText?: string;
    order: number;
  }>;
}

export interface UpdateProductDto {
  images?: CreateProductDto['images'];
  name?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  categoryId?: string;
  availability?: ProductAvailability;
  isFeatured?: boolean;
}

// ---- Category DTOs ----

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
}

// ---- Service DTOs ----

export interface CreateServiceDto {
  name: string;
  description?: string;
  price?: number;
  priceLabel?: string;
  categoryId?: string;
  images?: string[];
  isFeatured?: boolean;
}

export interface UpdateServiceDto {
  images?: string[];
  name?: string;
  description?: string;
  price?: number;
  priceLabel?: string;
  categoryId?: string;
  isFeatured?: boolean;
}

// ---- Subscription DTOs ----

export interface InitiateSubscriptionDto {
  plan: SubscriptionPlan;
  callbackUrl: string;
}

// ---- Lead DTOs ----

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source: string;
}

// ---- Page DTOs ----

export interface CreatePageDto {
  title: string;
  slug: string;
  isHomepage?: boolean;
}

export interface UpdatePageDto {
  title?: string;
  isHomepage?: boolean;
}

// ---- Section DTOs ----

export interface CreateSectionDto {
  type: string;
  order: number;
  isVisible?: boolean;
  config: Record<string, unknown>;
}

export interface UpdateSectionDto {
  order?: number;
  isVisible?: boolean;
  config?: Record<string, unknown>;
}

export interface ReorderSectionsDto {
  sections: Array<{ id: string; order: number }>;
}

// ---- Pagination DTOs ----

export interface PaginationDto {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
