import type { MetadataRoute } from "next";
import { siteOrigin, storefrontApi } from "@/lib/storefront-server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];
  const response = await fetch(`${storefrontApi}/storefronts/sitemap`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Sitemap is temporarily unavailable");
  const { data } = (await response.json()) as { data: string[] };
  return [
    { url: origin },
    ...data
      .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      .map((slug) => ({ url: `${origin}/@${slug}` })),
  ];
}
