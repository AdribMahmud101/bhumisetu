import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/i18n/provider";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/core";
export const metadata: Metadata = {
  title: "BhumiSetu | LandArchive BD",
  description:
    "Digital land records and evidence-based verification for Bangladesh.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
