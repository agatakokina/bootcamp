import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchSettings } from "../api/settings.js";

const SettingsContext = createContext(null);

function resolveTheme(theme) {
  if (theme === "dark" || theme === "light") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return fetchSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!settings) return undefined;

    try {
      localStorage.setItem("theme", settings.theme);
    } catch {
      // localStorage unavailable (e.g. private browsing); the theme just
      // won't be pre-applied on the next reload, no functional impact.
    }

    const apply = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme(settings.theme));
    };
    apply();

    if (settings.theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    return undefined;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, reload, setSettings }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
