import type { Metadata } from "next";
import "./globals.css";
import { AccountScope } from "@/components/account-scope";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  title: "Nexora — Your business workspace",
  description:
    "A home for your business, products, services and customer enquiries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem("nexora-theme");var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})();` }} />
        <ThemeProvider><AccountScope>{children}</AccountScope></ThemeProvider>
      </body>
    </html>
  );
}
