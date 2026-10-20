"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  return <div role="group" aria-label="Appearance mode" className="theme-selector">
    {options.map(({value,label,Icon})=><button type="button" key={value}
      aria-pressed={preference===value}
      className={preference===value ? "is-active" : ""}
      onClick={()=>setPreference(value as ThemePreference)}>
      <Icon size={17} aria-hidden="true" />{label}
    </button>)}
  </div>;
}

export function ThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  const dark = resolvedTheme === "dark";
  return <button type="button" className="theme-quick-toggle"
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    title={dark ? "Light mode" : "Dark mode"}
    onClick={()=>setPreference(dark?"light":"dark")}>
    {dark ? <Sun size={19} aria-hidden="true"/> : <Moon size={19} aria-hidden="true"/>}
  </button>;
}
