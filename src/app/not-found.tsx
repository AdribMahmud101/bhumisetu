"use client";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
export default function NotFound() {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  return (
    <main style={{ padding: "80px", textAlign: "center" }}>
      <h1>{t("record_or_page_not_found_54fbf")}</h1>
      <p>{t("please_check_that_the_link_is_correct_eabb1")}</p>
      <Link href="/verify">{t("search_land_records_11b4c")}</Link>
    </main>
  );
}
