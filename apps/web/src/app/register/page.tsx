"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { user, signup } = useAuth();
  const router = useRouter();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signup({ firstName, lastName, email, password });
    } catch (err: any) {
      setError(err.message || "Failed to create account");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left side - Marketing/Branding */}
      <div className="hidden md:flex w-[40%] gradient-hero text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 rounded bg-white text-primary flex items-center justify-center font-bold">N</div>
            <span className="font-bold text-xl tracking-tight">Nexora</span>
          </Link>

          <h2 className="text-4xl font-bold tracking-tight leading-tight mb-6">
            Grow your business with a professional online presence.
          </h2>
          <p className="text-white/80 text-lg max-w-sm">
            Join thousands of small businesses capturing leads and selling products across Africa.
          </p>
        </div>

        <div className="relative z-10 space-y-4 text-sm font-medium">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-accent w-5 h-5" />
            <span>Setup in under 5 minutes</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-accent w-5 h-5" />
            <span>Optimized for mobile viewing</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-accent w-5 h-5" />
            <span>Built-in WhatsApp integration</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
        <div className="absolute top-0 right-0 w-full h-full gradient-mesh opacity-30 z-0 md:hidden"></div>
        
        <div className="w-full max-w-md relative z-10">
          <Link 
            href="/" 
            className="md:hidden inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center md:text-left mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Create your account</h1>
              <p className="text-muted-foreground">Start your 7-day free trial. No credit card required.</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-4 text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="John" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Doe" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required 
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@business.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-11"
                  placeholder="At least 8 characters"
                />
                <p className="text-xs text-muted-foreground mt-1">Must contain an uppercase letter, lowercase letter, and number.</p>
              </div>
              
              <Button 
                type="submit" 
                variant="gradient" 
                size="lg" 
                className="w-full h-12 mt-6 font-semibold shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Start Free Trial"}
              </Button>
            </form>

            <div className="mt-8 text-center md:text-left text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline transition-colors">
                Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
