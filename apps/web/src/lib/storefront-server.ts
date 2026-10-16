import { cache } from "react";
import {
  normalizeStorefrontHandle,
  type Storefront,
} from "@nexora/shared-types";
export const storefrontApi =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
export function siteOrigin() {
  try {
    const u = new URL(process.env.SITE_URL || "");
    return u.origin === process.env.SITE_URL &&
      ["https:", "http:"].includes(u.protocol)
      ? u.origin
      : undefined;
  } catch {
    return undefined;
  }
}
const fetchStorefront = cache(
  async (handle: string, page = 1): Promise<Storefront | null> => {
    if (!/^@[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle) || handle.length > 101)
      return null;
    const response = await fetch(
      `${storefrontApi}/storefronts/${encodeURIComponent(handle.slice(1))}?page=${page}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Business website could not be loaded");
    return ((await response.json()) as { data: Storefront }).data;
  },
);
export async function getStorefront(input: string, page = 1) {
  const handle = normalizeStorefrontHandle(input);
  return handle ? fetchStorefront(handle, page) : null;
}
