import en from "./en.json";
import bn from "./bn.json";
import sourceKeys from "./sources.json";
export type Locale = "bn" | "en";
export type MessageKey = keyof typeof en;
export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "bs-locale";
export const catalogs = { bn, en };
export function isLocale(value: unknown): value is Locale {
  return value === "bn" || value === "en";
}
export function createTranslator(locale: Locale) {
  const t = (key: MessageKey, values: Record<string, string | number> = {}) =>
    catalogs[locale][key].replace(/\{(\w+)\}/g, (match, key) =>
      values[key] === undefined ? match : String(values[key]),
    );
  const tt = (text: unknown) => {
    if (text == null) return "";
    const raw = String(text);
    const key = (sourceKeys as Record<string, MessageKey>)[raw];
    return key ? t(key) : raw;
  };
  return { t, tt };
}
export function dateFormatter(
  locale: Locale,
  value: string | number | Date,
  includeTime = false,
) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
