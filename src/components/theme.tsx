"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";
const ThemeContext = createContext({ theme: "light" as Theme, resolved: "light" as "light" | "dark", setTheme: (_theme: Theme) => {} });
const storageKey = "deems-appearance";
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${storageKey}')||'light';document.documentElement.dataset.theme=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setPreference] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      let preference: Theme = "light";
      try { const value = localStorage.getItem(storageKey); if (value === "dark" || value === "system") preference = value; } catch {}
      const value = preference === "system" ? media.matches ? "dark" : "light" : preference;
      setPreference(preference); setResolved(value); document.documentElement.dataset.theme = value;
    }
    const receive = (event: StorageEvent) => { if (event.key === storageKey) apply(); };
    apply(); media.addEventListener("change", apply); window.addEventListener("storage", receive);
    return () => { media.removeEventListener("change", apply); window.removeEventListener("storage", receive); };
  }, []);
  function setTheme(value: Theme) {
    setPreference(value);
    const next = value === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : value;
    setResolved(next); document.documentElement.dataset.theme = next;
    try { localStorage.setItem(storageKey, value); } catch {}
  }
  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
export function ThemeControl() {
  const { theme, resolved, setTheme } = useTheme();
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  return <label className="theme-control"><Icon size={17} aria-hidden="true" /><select aria-label="Color theme" value={theme} onChange={event => setTheme(event.target.value as Theme)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>;
}
