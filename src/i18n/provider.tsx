"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createTranslator,
  dateFormatter,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./core";
import { toBengaliDigits, toAsciiDigits, formatDigits } from "@/lib/numbers";

type Context = ReturnType<typeof createTranslator> & {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  formatDate: (date: string | number | Date, includeTime?: boolean) => string;
  formatNumber: (val: unknown) => string;
  toBengaliDigits: (val: unknown) => string;
  toAsciiDigits: (val: unknown) => string;
};
const LanguageContext = createContext<Context | null>(null);
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const value = useMemo<Context>(
    () => ({
      ...createTranslator(locale),
      locale,
      setLocale(next) {
        if (!isLocale(next)) return;
        updateLocale(next);
        document.documentElement.lang = next;
        document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      },
      formatDate: (date, time = false) => dateFormatter(locale, date, time),
      formatNumber: (val) => formatDigits(val, locale),
      toBengaliDigits,
      toAsciiDigits,
    }),
    [locale],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}

export function LanguageSwitch({ idPrefix = "locale" }: { idPrefix?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <span
      className="language-switch"
      role="group"
      aria-label={t("language_label")}
    >
      <button
        type="button"
        data-testid={`${idPrefix}-bn`}
        lang="bn"
        aria-pressed={locale === "bn"}
        onClick={() => setLocale("bn")}
      >
        বাংলা
      </button>
      <button
        type="button"
        data-testid={`${idPrefix}-en`}
        lang="en"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        English
      </button>
    </span>
  );
}
