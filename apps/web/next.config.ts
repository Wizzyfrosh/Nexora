import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/api/v1/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
    }];
  },
  async rewrites() {
    const upstream = process.env.API_UPSTREAM_URL;
    if (!upstream) return [];
    const url = new URL(upstream);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/api/v1"
    ) throw new Error("API_UPSTREAM_URL must be an HTTPS API base ending in /api/v1");
    return {
      beforeFiles: [{ source: "/api/v1/:path*", destination: `${upstream}/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
