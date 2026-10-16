"use client";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/contexts/AuthContext";
export function AccountScope({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // Public storefront visitors do not probe owner sessions or send auth cookies.
  return /^\/(?:@|%40)/i.test(path) ? (
    children
  ) : (
    <AuthProvider>{children}</AuthProvider>
  );
}
