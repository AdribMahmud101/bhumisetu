import { describe, test, expect } from "bun:test";
import {
  createTranslator,
  dateFormatter,
  isLocale,
  catalogs,
  type MessageKey,
} from "../../src/i18n/core";
import { explainSignal } from "../../src/i18n/evidence";
describe("shared localization", () => {
  test("catalogs have identical, non-empty keys and parameter sets", () => {
    expect(Object.keys(catalogs.bn).sort()).toEqual(
      Object.keys(catalogs.en).sort(),
    );
    for (const key of Object.keys(catalogs.en) as MessageKey[]) {
      for (const locale of ["bn", "en"] as const)
        expect(catalogs[locale][key].trim().length).toBeGreaterThan(0);
      const slots = (s: string) => s.match(/\{\w+\}/g)?.sort() || [];
      expect(slots(catalogs.bn[key])).toEqual(slots(catalogs.en[key]));
    }
  });
  test("unknown locale cannot become an HTML language", () => {
    expect(isLocale("bn")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
  test("parameters and untranslated record contents are preserved", () => {
    const { t, tt } = createTranslator("en");
    expect(t("excess_area", { area: 4 })).toBe("+4 decimals excess");
    expect(tt("LND-MOCK-001")).toBe("LND-MOCK-001");
    expect(tt("রহিমা বেগম")).toBe("রহিমা বেগম");
    expect(tt("502/2021")).toBe("502/2021");
  });
  test("known server statuses, errors and existing field labels localize", () => {
    expect(createTranslator("bn").tt("HEARING_REQUIRED")).toBe(
      "শুনানি প্রয়োজন",
    );
    expect(createTranslator("en").tt("নথি নম্বর / Document number")).toBe(
      "Document number",
    );
    expect(createTranslator("bn").tt("Invalid login credentials")).toContain(
      "ইমেইল",
    );
  });
  test("date formatting uses explicit locale and time zone", () => {
    expect(dateFormatter("en", "2026-10-17")).toContain("Oct");
    expect(dateFormatter("bn", "2026-10-17")).toContain("অক্টো");
    expect(dateFormatter("en", "invalid")).toBe("invalid");
  });
  test("signal localization uses existing evidence IDs without changing the signal", () => {
    const signal = {
      id: "OVERLAP",
      title: "test",
      points: 40,
      detail: "source explanation",
      evidence: ["d"],
    };
    const original = JSON.stringify(signal);
    const docs = [{ id: "d", official_number: "502/2021" }] as any;
    expect(explainSignal(signal, docs, createTranslator("en").t)).toContain(
      "502/2021",
    );
    expect(JSON.stringify(signal)).toBe(original);
  });
});
