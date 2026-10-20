"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
};

const KEY = "nexora-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);
const valid = (v: string | null): v is ThemePreference =>
  v === "light" || v === "dark" || v === "system";

function getStoredPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return valid(value) ? value : "system";
  } catch {
    return "system";
  }
}

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = preference === "system" ? (systemIsDark() ? "dark" : "light") : preference;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

/** Theme choice is per-device UI preference; published storefront themes are independent. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Match server HTML on hydration. The tiny inline bootstrap script applies the
  // saved theme before the browser paints, avoiding a light-mode flash.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = getStoredPreference();
    setPreferenceState(stored);
    setResolvedTheme(applyTheme(stored));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => setResolvedTheme(applyTheme(getStoredPreference()));
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      const next = getStoredPreference();
      setPreferenceState(next);
      setResolvedTheme(applyTheme(next));
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    if (!valid(value)) return;
    setPreferenceState(value);
    setResolvedTheme(applyTheme(value));
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // Browsing in private/restricted contexts still allows this session to switch.
    }
  }, []);

  const context = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
