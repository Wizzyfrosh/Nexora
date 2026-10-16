"use client";
import { useEffect, useState } from "react";
import type { Storefront } from "@nexora/shared-types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
import { StorefrontView } from "@/components/storefront/view";
export default function PreviewPage() {
  const id = useAuth().user?.businesses?.[0]?.id;
  const [site, setSite] = useState<Storefront | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiFetch<Storefront>(`/businesses/${id}/storefront/preview`)
      .then((s) => {
        if (!cancelled) setSite(s);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Preview failed");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return (
    <div>
      <p className="mb-5 rounded-xl bg-violet-100 p-4 text-sm">
        Owner-only preview of saved content. This does not publish your website.
        Enquiries are disabled.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : site ? (
        <StorefrontView site={site} preview />
      ) : (
        <p role="status">Loading preview…</p>
      )}
    </div>
  );
}
