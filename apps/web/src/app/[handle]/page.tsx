import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront, siteOrigin } from "@/lib/storefront-server";
import { StorefrontView } from "@/components/storefront/view";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ page?: string }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { handle } = await params;
  const raw = (await searchParams).page;
  const page = raw === undefined ? 1 : Number(raw);
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    return { robots: { index: false, follow: false } };
  const site = await getStorefront(handle, page);
  const origin = siteOrigin();
  if (!site)
    return {
      title: "Website unavailable",
      robots: { index: false, follow: false },
    };
  return {
    title: site.business.name,
    description: site.business.description?.slice(0, 160),
    alternates: origin
      ? { canonical: `${origin}/@${site.business.slug}` }
      : undefined,
    robots: { index: !!origin, follow: !!origin },
  };
}
export default async function BusinessWebsite({ params, searchParams }: Props) {
  const rawPage = (await searchParams).page;
  const page = rawPage === undefined ? 1 : Number(rawPage);
  if (!Number.isInteger(page) || page < 1 || page > 10000) notFound();
  const site = await getStorefront((await params).handle, page);
  if (!site) notFound();
  return <StorefrontView site={site} />;
}
