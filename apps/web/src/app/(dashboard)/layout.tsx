"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Settings,
  ShoppingBag,
  Briefcase,
  MessageSquare,
  LogOut,
  Menu,
  X,
  CreditCard,
  Palette,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Brand } from "@/components/brand";
import "../workspace.css";

const links = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My website", href: "/dashboard/website", icon: Store },
  { name: "Products", href: "/dashboard/products", icon: ShoppingBag },
  { name: "Services", href: "/dashboard/services", icon: Briefcase },
  { name: "Enquiries", href: "/dashboard/subscribers", icon: MessageSquare },
  { name: "Appearance", href: "/dashboard/appearance", icon: Palette },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { user, logout } = useAuth();
  const businessName = user?.businesses?.[0]?.name || "Your workspace";
  return (
    <AuthGuard>
      <div className="workspace-shell">
        <header className="workspace-mobile-header">
          <Brand />
          <button
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="workspace-sidebar"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </header>
        {open && (
          <button
            className="workspace-backdrop"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          id="workspace-sidebar"
          className={`workspace-sidebar ${open ? "is-open" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="workspace-logo">
            <Brand />
          </div>
          <div className="workspace-business">
            <span>{businessName.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{businessName}</strong>
              <small>Business workspace</small>
            </div>
          </div>
          <p className="workspace-nav-label">YOUR WORKSPACE</p>
          <nav aria-label="Workspace navigation">
            {links.map(({ name, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {name}
                {pathname === href && <span className="active-nav-dot" />}
              </Link>
            ))}
          </nav>
          <div className="workspace-sidebar-bottom">
            <Link href="/" className="workspace-home-link">
              Explore Nexora <ArrowUpRight size={15} />
            </Link>
            <div className="workspace-account">
              <span>{user?.firstName?.charAt(0) || "N"}</span>
              <div>
                <strong>{user?.firstName || "Your account"}</strong>
                <small>{user?.email}</small>
              </div>
              <button
                title="Log out"
                aria-label="Log out"
                onClick={() => {
                  setLogoutError("");
                  void logout().catch(() =>
                    setLogoutError("Sign out failed. Please try again."),
                  );
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
            {logoutError && (
              <p role="alert" className="text-xs text-destructive mt-2">
                {logoutError}
              </p>
            )}
          </div>
        </aside>
        <div className="workspace-main">
          <header className="workspace-topbar">
            <span>
              Workspace <span>/</span>{" "}
              <strong>
                {links.find((l) => l.href === pathname)?.name || "Overview"}
              </strong>
            </span>
            <span className="workspace-status">
              <i /> Your business, in focus
            </span>
          </header>
          <main className="workspace-content">
            {user && !user.emailVerified && <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">Your email is not verified. <Link href="/verify-email" className="font-semibold text-violet-700 underline">Verify your email</Link></div>}
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
