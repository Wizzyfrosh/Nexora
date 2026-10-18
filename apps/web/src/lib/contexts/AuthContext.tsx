"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService, type AuthUser } from "@/lib/api/auth";
import type { LoginDto, SignupDto } from "@nexora/shared-types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  signup: (dto: SignupDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const revision = useRef(0);
  const router = useRouter();

  const refreshUser = async () => {
    const current = ++revision.current;
    try {
      const profile = await AuthService.getCurrentUser();
      if (current === revision.current) setUser(profile);
    } catch {
      if (current === revision.current) setUser(null);
    } finally {
      if (current === revision.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const login = async (dto: LoginDto) => {
    const current = ++revision.current;
    setIsLoading(true);
    try {
      const profile = await AuthService.login(dto);
      if (current === revision.current) {
        setUser(profile);
        router.replace(profile.emailVerified ? "/dashboard" : "/verify-email");
      }
    } finally {
      if (current === revision.current) setIsLoading(false);
    }
  };

  const signup = async (dto: SignupDto) => {
    const current = ++revision.current;
    setIsLoading(true);
    try {
      const profile = await AuthService.signup(dto);
      if (current === revision.current) {
        setUser(profile);
        router.replace(profile.emailVerified ? "/dashboard" : "/verify-email");
      }
    } finally {
      if (current === revision.current) setIsLoading(false);
    }
  };

  const logout = async () => {
    const current = ++revision.current;
    setIsLoading(true);
    try {
      await AuthService.logout();
      if (current === revision.current) {
        setUser(null);
        router.replace("/login");
      }
    } finally {
      if (current === revision.current) setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
