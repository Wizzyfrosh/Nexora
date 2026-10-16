"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  releasedSections,
  RELEASED_SECTIONS,
  type StorefrontSection,
  type PublicationState,
} from "@nexora/shared-types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
import { WebsiteService } from "@/lib/api/website";
import { MediaPicker } from "@/components/media-picker";
const initial: StorefrontSection[] = [
  {
    type: "HERO",
    content: {
      headline: "",
      subheadline: "",
      buttonText: "Get in touch",
      buttonLink: "#contact",
    },
  },
  { type: "ABOUT", content: { title: "Our story", description: "" } },
  { type: "PRODUCTS", content: { title: "Our products" } },
  { type: "SERVICES", content: { title: "Our services" } },
  {
    type: "CONTACT",
    content: { title: "Get in touch", email: true, whatsapp: true },
  },
];
const textFields: Record<string, string[]> = {
  HERO: ["headline", "subheadline", "buttonText"],
  ABOUT: ["title", "description"],
  PRODUCTS: ["title", "subtitle"],
  SERVICES: ["title", "subtitle"],
  CONTACT: ["title"],
};
export default function WebsiteManager() {
  const { user } = useAuth();
  const businessId = user?.businesses?.[0]?.id;
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [state, setState] = useState<PublicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    Promise.all([
      WebsiteService.getWebsiteConfig(businessId),
      apiFetch<PublicationState>(
        `/businesses/${businessId}/storefront/publication`,
      ),
    ])
      .then(([config, publication]) => {
        if (cancelled) return;
        setState(publication);
        try {
          setSections(releasedSections(config.sections));
        } catch {
          setLegacy(true);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Website settings could not be loaded",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);
  function change(index: number, key: string, value: string) {
    setSections((items) =>
      items.map((s, i) =>
        i === index ? { ...s, content: { ...s.content, [key]: value } } : s,
      ),
    );
  }
  async function save() {
    if (!businessId || busy || legacy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const validated = releasedSections(sections);
      await WebsiteService.saveSections(businessId, validated);
      setState(
        await apiFetch<PublicationState>(
          `/businesses/${businessId}/storefront/publication`,
        ),
      );
      setNotice(
        "Sections saved. Preview uses saved content. Changes are visible on a published website immediately.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!businessId || !state || busy) return;
    if (
      !window.confirm(
        state.isPublished
          ? "Unpublish this website now?"
          : "Publish the saved website for public visitors?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/businesses/${businessId}/storefront/publication`, {
        method: "PUT",
        body: JSON.stringify({ published: !state.isPublished }),
      });
      setState(
        await apiFetch<PublicationState>(
          `/businesses/${businessId}/storefront/publication`,
        ),
      );
      setNotice(
        "Publication setting updated. Public access still depends on current entitlement.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication failed");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Loading website settings…</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-violet-700">
          YOUR BUSINESS, ONLINE
        </p>
        <h1 className="mt-2 text-3xl font-bold">My website</h1>
        <p className="mt-2 text-sm text-slate-600">
          Edit the story, arrange your sections, then preview the saved website.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-violet-50 p-4">
          {notice}
        </p>
      )}
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Preview and publication</h2>
        <p className="text-sm">
          Publication setting:{" "}
          {state?.isPublished ? "Published" : "Unpublished"}. Expiry, suspension
          or invalid content can still make a published site unavailable.
        </p>
        {state?.reasons.length ? (
          <ul className="list-disc pl-5 text-sm text-amber-900">
            {state.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            className="text-violet-700 underline"
            href="/dashboard/website/preview"
            target="_blank"
          >
            Preview saved website ↗
          </Link>
          <Link
            className="text-violet-700 underline"
            href="/dashboard/appearance"
          >
            Choose a released theme
          </Link>
          <Link
            className="text-violet-700 underline"
            href="/dashboard/settings"
          >
            Business details
          </Link>
          {state?.isPublished && (
            <Link
              href={`/@${state.slug}`}
              target="_blank"
              className="underline"
            >
              Open public URL ↗
            </Link>
          )}
        </div>
        <button
          type="button"
          className="rounded-xl bg-violet-700 px-5 py-3 text-sm text-white disabled:opacity-40"
          disabled={
            busy || !state || (!state.isPublished && state.reasons.length > 0)
          }
          onClick={() => void publish()}
        >
          {state?.isPublished ? "Unpublish website" : "Publish saved website"}
        </button>
        <p className="text-xs text-slate-500">
          {state?.publishingEnabled
            ? "Publication requires a verified account, valid content and current entitlement."
            : "Publishing is disabled by the operator until launch approval."}{" "}
          Unpublishing remains available.
        </p>
      </section>
      {legacy ? (
        <section className="rounded-2xl border border-amber-200 bg-white p-5">
          <h2 className="font-bold">Existing sections need review</h2>
          <p className="my-3 text-sm">
            This layout contains unsupported fields or sections. Nothing has
            been deleted. You can replace it with the released layout;
            replacement only happens when you save.
          </p>
          <button
            className="text-violet-700 underline"
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Prepare a replacement layout? Saving will replace the existing section content.",
                )
              ) {
                setSections(initial);
                setLegacy(false);
              }
            }}
          >
            Prepare released layout
          </button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {RELEASED_SECTIONS.filter(
              (t) => !sections.some((s) => s.type === t),
            ).map((type) => (
              <button
                type="button"
                className="rounded-full border bg-white px-4 py-2 text-sm"
                key={type}
                disabled={busy}
                onClick={() =>
                  setSections((items) => [
                    ...items,
                    initial.find((s) => s.type === type)!,
                  ])
                }
              >
                Add {type.toLowerCase()}
              </button>
            ))}
          </div>
          {sections.map((section, index) => (
            <section
              key={section.type}
              className="space-y-4 rounded-2xl border bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold capitalize">
                  {section.type.toLowerCase()}
                </h2>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Move ${section.type} up`}
                    onClick={() =>
                      setSections((items) => {
                        const v = [...items];
                        [v[index - 1], v[index]] = [v[index], v[index - 1]];
                        return v;
                      })
                    }
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === sections.length - 1}
                    aria-label={`Move ${section.type} down`}
                    onClick={() =>
                      setSections((items) => {
                        const v = [...items];
                        [v[index], v[index + 1]] = [v[index + 1], v[index]];
                        return v;
                      })
                    }
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Remove ${section.type}`}
                    onClick={() =>
                      setSections((items) =>
                        items.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
              {textFields[section.type].map((key) => (
                <label className="block text-sm capitalize" key={key}>
                  {key.replace(/([A-Z])/g, " $1")}
                  <textarea
                    className="mt-2 block w-full rounded-lg border p-3"
                    rows={key === "description" ? 5 : 2}
                    maxLength={
                      key === "description"
                        ? 5000
                        : key === "headline" || key === "title"
                          ? 160
                          : key === "buttonText"
                            ? 60
                            : 600
                    }
                    disabled={busy}
                    value={String(
                      section.content[key as keyof typeof section.content] ||
                        "",
                    )}
                    onChange={(e) => change(index, key, e.target.value)}
                  />
                </label>
              ))}
              {section.type === "HERO" && (
                <label className="block text-sm">
                  Button destination
                  <select
                    className="ml-3 rounded-lg border p-2"
                    value={section.content.buttonLink || "#contact"}
                    disabled={busy}
                    onChange={(e) =>
                      change(index, "buttonLink", e.target.value)
                    }
                  >
                    {["contact", "about", "products", "services"].map((s) => (
                      <option key={s} value={`#${s}`}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {["HERO", "ABOUT"].includes(section.type) && (
                <MediaPicker
                  max={1}
                  value={
                    section.content.imageUrl ? [section.content.imageUrl] : []
                  }
                  onChange={(urls) => change(index, "imageUrl", urls[0] || "")}
                />
              )}
            </section>
          ))}
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Working…" : "Save sections"}
          </button>
        </>
      )}
    </div>
  );
}
