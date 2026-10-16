"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PublicAnalyticsEvent } from "@nexora/shared-types";
import { API_URL } from "@/lib/api/client";
type Choice = "loading" | "ask" | "allow" | "deny" | "restricted";
function restricted() {
  return (
    navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}
export function AnalyticsConsent({ businessId }: { businessId: string }) {
  const key = `nexora-counts:v1:${businessId}`;
  const [choice, setChoice] = useState<Choice>("loading"),
    [error, setError] = useState("");
  const viewId = useRef<string | null>(null);
  const allowed = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      allowed.current = false;
      if (restricted()) return setChoice("restricted");
      try {
        const value = localStorage.getItem(key);
        allowed.current = value === "allow";
        setChoice(
          value === "allow" ? "allow" : value === "deny" ? "deny" : "ask",
        );
      } catch {
        setChoice("ask");
      }
    };
    queueMicrotask(load);
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) load();
    };
    window.addEventListener("storage", storage);
    return () => {
      cancelled = true;
      allowed.current = false;
      window.removeEventListener("storage", storage);
    };
  }, [key]);
  const send = useCallback(
    async (eventType: PublicAnalyticsEvent, eventId: string) => {
      if (!allowed.current || restricted()) return;
      try {
        const response = await fetch(
          `${API_URL}/businesses/${businessId}/analytics/events`,
          {
            method: "POST",
            credentials: "omit",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({ eventId, eventType, consent: true }),
          },
        );
        if (!response.ok) throw new Error();
        setError("");
      } catch {
        setError(
          "Optional visit counting is unavailable. You can keep browsing and contacting this business.",
        );
      }
    },
    [businessId],
  );
  useEffect(() => {
    if (choice !== "allow" || restricted()) return;
    viewId.current ??= crypto.randomUUID();
    void send("PAGE_VIEW", viewId.current);
    const click = (event: MouseEvent) => {
      const target = event.target;
      if (
        !restricted() &&
        target instanceof Element &&
        target.closest("[data-store-whatsapp]")
      )
        void send("WHATSAPP_CLICK", crypto.randomUUID());
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [choice, send]);
  function choose(value: "allow" | "deny") {
    if (restricted()) return setChoice("restricted");
    allowed.current = value === "allow";
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Applies to this page only when storage is unavailable. */
    }
    setError("");
    setChoice(value);
  }
  if (choice === "loading") return null;
  return (
    <aside className="store-privacy" aria-label="Optional visit counts">
      <strong>Optional visit counts</strong>
      {choice === "ask" ? (
        <>
          <p>
            Allow this business to count page views and WhatsApp clicks? No
            visitor profiles, tracking cookies or stored IP addresses. Your
            choice is saved for this business on this device.
          </p>
          <div>
            <button type="button" onClick={() => choose("allow")}>
              Allow visit counts
            </button>
            <button type="button" onClick={() => choose("deny")}>
              No thanks
            </button>
          </div>
        </>
      ) : choice === "restricted" ? (
        <p>Your browser’s privacy signal keeps optional visit counts off.</p>
      ) : (
        <>
          <p>
            Optional visit counts are {choice === "allow" ? "on" : "off"}.
            Withdrawing stops future counts; totals already collected remain.
          </p>
          <button
            type="button"
            onClick={() => choose(choice === "allow" ? "deny" : "allow")}
          >
            {choice === "allow"
              ? "Turn off visit counts"
              : "Allow visit counts"}
          </button>
        </>
      )}
      {error && <p role="status">{error}</p>}
    </aside>
  );
}
