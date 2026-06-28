"use client";

import { useEffect, useState } from "react";

const PREFS_KEY = "oklch-ramp:prefs";

export type Theme = "light" | "dark";

/** Theme state synced to <html>.dark and persisted in localStorage prefs. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const prefs = localStorage.getItem(PREFS_KEY);
      if (prefs) {
        const p = JSON.parse(prefs) as { theme?: Theme };
        if (p.theme) setTheme(p.theme);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ theme }));
    } catch {
      /* ignore */
    }
  }, [theme, hydrated]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggle };
}
