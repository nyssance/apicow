import zhCN from "./locales/zh-CN.json";

export type Locale = "en" | "zh-CN";
export const localeStorageKey = "apicow.locale";

export function resolveLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === "en" || saved === "zh-CN") return saved;
  return languages[0]?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function getLocale(): Locale {
  let saved: string | null = null;
  try {
    saved = globalThis.localStorage?.getItem(localeStorageKey) ?? null;
  } catch {
    /* Storage may be unavailable in an embedded view. */
  }
  return resolveLocale(saved, typeof navigator === "undefined" ? [] : navigator.languages);
}

const englishBranding: Record<string, string> = {
  Yaak: "ApiCow",
  "Yaak Settings": "ApiCow Settings",
  "Yaak v{{p0}}": "ApiCow v{{p0}}",
  "Font used for Yaak interface controls.": "Font used for ApiCow interface controls.",
  "Plugins extend the functionality of Yaak.": "Plugins extend the functionality of ApiCow.",
  "Relaunch Yaak": "Relaunch ApiCow",
  "Try Yaak with a real API": "Try ApiCow with a real API",
  "Yaak response preview": "ApiCow response preview",
};

/** Translate explicit UI copy only. Request payloads, IDs and user text never pass through this API. */
export function translate(
  locale: Locale,
  source: string,
  values: Record<string, string | number> = {},
): string {
  const translated = locale === "zh-CN" ? (zhCN as Record<string, string>)[source] : undefined;
  return (translated ?? englishBranding[source] ?? source).replace(
    /\{\{(\w+)\}\}/g,
    (match, name: string) => String(values[name] ?? match),
  );
}

export function t(source: string, values?: Record<string, string | number>): string {
  return translate(getLocale(), source, values);
}
