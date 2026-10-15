"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Store, 
  Settings, 
  ShoppingBag, 
  Briefcase,
  MessageSquare, 
  BarChart,
  LogOut,
  Menu,
  X,
  CreditCard,
  Palette
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/contexts/AuthContext";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Website", href: "/dashboard/website", icon: Store },
  { name: "Products", href: "/dashboard/products", icon: ShoppingBag },
  { name: "Services", href: "/dashboard/services", icon: Briefcase },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart },
  { name: "Leads", href: "/dashboard/subscribers", icon: MessageSquare },
  { name: "Appearance", href: "/dashboard/appearance", icon: Palette },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const businessName = user?.businesses?.[0]?.name || `${user?.firstName || 'My'}'s Store`;
  const userEmail = user?.email || "";
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || 'Felix'}`;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Mobile Navbar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border glass sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold tracking-tight">Nexora</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          <div className="hidden md:flex items-center gap-2 p-6">
            <div className="w-8 h-8 rounded gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Nexora NG</span>
          </div>

          <nav className="p-4 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }
                  `}>
                    <link.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {link.name}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                <img src={avatarUrl} alt="Avatar" />
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium truncate">{businessName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive mt-2" 
              size="sm"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
}

