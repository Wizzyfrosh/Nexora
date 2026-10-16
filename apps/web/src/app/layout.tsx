import type { Metadata } from "next";
import "./globals.css";
import { AccountScope } from "@/components/account-scope";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AccountScope>{children}</AccountScope>
      </body>
    </html>
  );
}
