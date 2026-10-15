"use client";
import { useEffect, useId, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetch, API_URL } from "@/lib/api/client";
import { MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, type MediaAsset } from "@nexora/shared-types";

export function MediaPicker({ value, onChange, max = 20 }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const { user } = useAuth();
  const businessId = user?.businesses?.[0]?.id;
  const id = useId();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!businessId) return;
    setLoading(true); setError("");
    try { setAssets(await apiFetch<MediaAsset[]>(`/businesses/${businessId}/media`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load images"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    apiFetch<MediaAsset[]>(`/businesses/${businessId}/media`).then(items => { if (!cancelled) setAssets(items); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load images"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);
  async function upload(file: File) {
    if (!businessId || busy) return;
    setError(""); setNotice("");
    if (file.size > MEDIA_MAX_BYTES || !MEDIA_MIME_TYPES.includes(file.type as typeof MEDIA_MIME_TYPES[number])) {
      setError("Choose a JPEG, PNG or WebP up to 5 MiB."); return;
    }
    setBusy(true);
    try {
      const form = new FormData(); form.append("file", file);
      // Refresh before streaming a multipart body; never silently replay a file upload.
      await apiFetch("/auth/me");
      const response = await fetch(`${API_URL}/businesses/${businessId}/media`, { method: "POST", body: form, credentials: "include", signal: AbortSignal.timeout(45_000) });
      const body = await response.json() as { data: MediaAsset; message?: string };
      if (!response.ok) throw new Error(body.message || "Upload failed");
      const asset = body.data as MediaAsset;
      setAssets(items => [asset, ...items]);
      onChange(max === 1 ? [asset.url] : [...new Set([...value, asset.url])].slice(0, max));
      setNotice("Image uploaded and verified. Save this form to attach it.");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Reload the library before retrying."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
    <p className="text-xs text-slate-600">Public catalogue images only. JPEG, PNG or WebP; 5 MiB / 12 megapixels. SVG, animation and documents are not supported.</p>
    <label htmlFor={id} className="block text-sm font-medium">Upload image</label>
    <input id={id} type="file" accept={MEDIA_MIME_TYPES.join(",")} disabled={busy || !user?.emailVerified || (max !== 1 && value.length >= max)}
      onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} className="block w-full min-w-0 text-sm" />
    {!user?.emailVerified && <p className="text-xs">Verify your email before uploading.</p>}
    <p role="status" className="text-xs">{busy ? "Uploading and verifying…" : notice}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" onClick={() => void load()} disabled={busy || loading} className="text-sm text-violet-700 underline">{loading ? "Loading images…" : "Reload image library"}</button>
    <div className="flex flex-wrap gap-2" aria-label="Selected images">{value.map((url, i) => <div key={`${url}-${i}`} className="space-y-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Selected image ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
      <button type="button" disabled={busy} aria-label={`Remove selected image ${i + 1}`} onClick={() => onChange(value.filter((_, n) => n !== i))} className="text-xs underline">Remove</button>
    </div>)}</div>
    <details><summary className="cursor-pointer text-sm">Choose from verified library ({assets.length})</summary>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{assets.map(asset => <div key={asset.id} className="rounded-lg bg-white p-2">
        <button type="button" disabled={busy || value.includes(asset.url) || (max !== 1 && value.length >= max)} aria-label={`Select image ${asset.id}`} onClick={() => onChange(max === 1 ? [asset.url] : [...value, asset.url])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.url} alt="Verified catalogue image" className="h-16 w-20 rounded object-cover" />
        </button>
        <button type="button" disabled={busy || value.includes(asset.url)} className="block text-xs text-red-700 underline" onClick={async () => {
          if (!businessId || !window.confirm("Delete this image from storage? Images in use cannot be deleted.")) return;
          setBusy(true); setError("");
          try { await apiFetch(`/businesses/${businessId}/media/${asset.id}`, { method: "DELETE" }); setAssets(items => items.filter(a => a.id !== asset.id)); setNotice("Deletion queued. CDN copies may take time to disappear."); }
          catch(e) { setError(e instanceof Error ? e.message : "Deletion failed"); }
          finally { setBusy(false); }
        }}>Delete from library</button>
      </div>)}</div>
    </details>
  </div>;
}
