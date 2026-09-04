import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "quickmark-theme";

let memoryThemePreference: ThemePreference | undefined;
let themeLoadingPromise: Promise<ThemePreference> | undefined;

export async function ensureThemePreferenceLoaded(): Promise<ThemePreference> {
  if (memoryThemePreference !== undefined) return memoryThemePreference;
  themeLoadingPromise ??= (async () => {
    let preference: ThemePreference = "system";
    try {
      const result = await chrome.storage.local.get(THEME_KEY);
      const raw = result[THEME_KEY];
      if (raw === "light" || raw === "dark" || raw === "system") {
        preference = raw;
      }
    } catch {
      /* 保留默认值 */
    }
    memoryThemePreference = preference;
    return preference;
  })();
  return themeLoadingPromise;
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  memoryThemePreference = theme;
  try {
    await chrome.storage.local.set({ [THEME_KEY]: theme });
  } catch {
    /* 忽略持久化失败，内存中的主题仍然有效 */
  }
}

export function getEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => getEffectiveTheme("system"));

  useEffect(() => {
    let cancelled = false;
    ensureThemePreferenceLoaded().then((preference) => {
      if (!cancelled) setThemePref(preference);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setEffectiveTheme(getEffectiveTheme(themePref));
  }, [themePref]);

  useEffect(() => {
    if (themePref !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setEffectiveTheme(getEffectiveTheme("system"));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [themePref]);

  const cycleTheme = () => {
    const next: ThemePreference =
      themePref === "system" ? "light" : themePref === "light" ? "dark" : "system";
    setThemePref(next);
    void saveThemePreference(next);
  };

  return {
    themePref,
    effectiveTheme,
    setThemePref,
    cycleTheme,
  };
}
