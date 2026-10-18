import { describe, expect, test } from "bun:test";
import {
  toBengaliDigits,
  toAsciiDigits,
  formatDigits,
} from "../../src/lib/numbers";
import { createTranslator } from "../../src/i18n/core";

describe("numbers translation system", () => {
  test("toBengaliDigits translates ASCII digits to Bengali digits in all contexts", () => {
    expect(toBengaliDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
    expect(toBengaliDigits(207)).toBe("২০৭");
    expect(toBengaliDigits("RS-118")).toBe("RS-১১৮");
    expect(toBengaliDigits("12/02/2020")).toBe("১২/০২/২০২০");
    expect(toBengaliDigits("20.5")).toBe("২০.৫");
    expect(toBengaliDigits("কজএল-০১৭")).toBe("কজএল-০১৭");
    expect(toBengaliDigits("")).toBe("");
    expect(toBengaliDigits(null)).toBe("");
    expect(toBengaliDigits(undefined)).toBe("");
  });

  test("toAsciiDigits normalizes Bengali digits to standard ASCII digits", () => {
    expect(toAsciiDigits("০১২৩৪৫৬৭৮৯")).toBe("0123456789");
    expect(toAsciiDigits("২০৭")).toBe("207");
    expect(toAsciiDigits("RS-১১৮")).toBe("RS-118");
    expect(toAsciiDigits("১২/০২/২০২০")).toBe("12/02/2020");
    expect(toAsciiDigits("২০.৫")).toBe("20.5");
    expect(toAsciiDigits("")).toBe("");
    expect(toAsciiDigits(null)).toBe("");
  });

  test("formatDigits respects locale", () => {
    expect(formatDigits(207, "bn")).toBe("২০৭");
    expect(formatDigits("২০৭", "en")).toBe("207");
    expect(formatDigits("RS-118", "bn")).toBe("RS-১১৮");
    expect(formatDigits("RS-১১৮", "en")).toBe("RS-118");
  });

  test("i18n translator automatically formats numbers in Bengali mode", () => {
    const { t, tt } = createTranslator("bn");
    expect(t("excess_area", { area: 4 })).toBe("+৪ শতাংশ অতিরিক্ত");
    expect(tt("207")).toBe("২০৭");
    expect(tt("RS-118")).toBe("RS-১১৮");
  });
});
