"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Background decorations matching the theme */}
        <div className="absolute top-0 left-0 w-full h-full gradient-mesh opacity-30 z-0"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[100px] rounded-full -z-10 animate-pulse-glow"></div>
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-spin">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading your experience...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
