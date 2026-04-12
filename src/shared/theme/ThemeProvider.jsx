// src/shared/theme/ThemeProvider.jsx
// Dark/light mode provider. Persists preference to localStorage.
// Applies "dark" class to <html> element for Tailwind dark: variants.

import { createContext, useContext, useEffect, useState } from "react";
import { KEYS } from "@/shared/storage/keys";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(KEYS.THEME);
      if (stored === "dark" || stored === "light") return stored;
    } catch {}
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark-mode");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark-mode");
    }
    try { localStorage.setItem(KEYS.THEME, theme); } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
