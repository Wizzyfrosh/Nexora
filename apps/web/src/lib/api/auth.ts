// ============================================================
// Nexora Web — Auth API Client
// Typed methods for authentication endpoints
// ============================================================

import { SignupDto, LoginDto, IUser } from '@nexora/shared-types';
import { apiFetch } from './client';

export interface AuthUser extends Omit<IUser, 'createdAt' | 'updatedAt' | 'deletedAt'> {
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    subscription: {
      plan: string;
      status: string;
      trialStartDate: string;
      trialEndDate: string;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
    } | null;
  }>;
}

export class AuthService {
  /**
   * Register a new user and create their initial business profile.
   */
  static async signup(dto: SignupDto): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Log in an existing user.
   */
  static async login(dto: LoginDto): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Log out the current user. Clears HTTP-only cookies server-side.
   */
  static async logout(): Promise<void> {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Get the current authenticated user profile.
   * Returns null if not authenticated (instead of throwing).
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      return await apiFetch<AuthUser>('/auth/me');
    } catch {
      return null;
    }
  }
}
