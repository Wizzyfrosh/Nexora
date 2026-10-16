"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RELEASED_THEMES } from "@nexora/shared-types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { WebsiteService } from "@/lib/api/website";
export default function AppearanceManager() {
  const businessId = useAuth().user?.businesses?.[0]?.id;
  const [theme, setTheme] = useState<string>("DEFAULT");
  const [primary, setPrimary] = useState("#8044b6");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    WebsiteService.getWebsiteConfig(businessId)
      .then((c) => {
        if (cancelled) return;
        setTheme(c.theme);
        if (/^#[a-fA-F0-9]{6}$/.test(c.colorPalette.primary))
          setPrimary(c.colorPalette.primary);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load appearance. Reload to retry.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);
  if (loading) return <p role="status">Loading appearance…</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Appearance</h1>
        <p className="mt-2 text-sm text-slate-600">
          Released catalogue presets. Custom domains and premium layouts are not
          available in this release.
        </p>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {RELEASED_THEMES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            disabled={busy}
            onClick={() => {
              setTheme(t);
              setPrimary(t === "BUSINESS_GREEN" ? "#26664c" : "#8044b6");
            }}
            className={`rounded-2xl border-2 bg-white p-6 text-left ${theme === t ? "border-violet-600" : "border-slate-200"}`}
          >
            <span
              className="mb-4 block h-3 w-12 rounded-full"
              style={{
                background: t === "BUSINESS_GREEN" ? "#26664c" : "#8044b6",
              }}
            />
            <strong>{t.replaceAll("_", " ").toLowerCase()}</strong>
            <p className="mt-2 text-xs text-slate-600">
              {t === "PORTFOLIO_LITE"
                ? "Editorial headings with a clean catalogue."
                : "Clean catalogue with your business identity."}
            </p>
          </button>
        ))}
      </div>
      <label className="block text-sm">
        Brand accent
        <input
          type="color"
          className="ml-4 h-10 w-14"
          value={primary}
          disabled={busy}
          onChange={(e) => setPrimary(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={
          busy ||
          !RELEASED_THEMES.includes(theme as (typeof RELEASED_THEMES)[number])
        }
        className="rounded-xl bg-violet-700 px-5 py-3 text-white disabled:opacity-40"
        onClick={async () => {
          if (!businessId) return;
          setBusy(true);
          setNotice("");
          setError("");
          try {
            await WebsiteService.updateTheme(businessId, {
              theme,
              colorPalette: { primary },
              typography: { heading: "Inter", body: "Inter" },
            });
            setNotice("Appearance saved. Preview uses these saved settings.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Save appearance
      </button>
      <p>
        <Link className="text-violet-700 underline" href="/dashboard/website">
          Edit sections and preview →
        </Link>
      </p>
    </div>
  );
}
