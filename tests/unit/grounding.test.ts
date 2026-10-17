import { test, expect } from "bun:test";
import { groundExtraction } from "../../src/lib/extraction-grounding";
test("explicit acreage and labelled khatian correct share/form-number confusion", () => {
  const result = groundExtraction(
    {
      official_number: "5462",
      area_decimals: 1,
      document_date: "2023-04-15",
      parcel: { total_area_decimals: 0.15 },
      source_text:
        "ফরম নং ৫৪৬২\nখতিয়ান নং- ১০৫\nঅংশ ১.০০০\nমোট পরিমাণ ০.১৫ একর\nসাবেক সিএস খতিয়ান নং- ৪২",
    },
    "",
    "KHATIAN",
  );
  expect(result.raw.official_number).toBe("105");
  expect(result.raw.parcel.current_khatian_no).toBe("105");
  expect(result.raw.area_decimals).toBe(15);
  expect(result.raw.parcel.total_area_decimals).toBe(15);
  expect(result.raw.document_date).toBeNull();
});
test("ambiguous areas and deed sale/recorded distinctions are not overridden", () => {
  expect(
    groundExtraction(
      { area_decimals: 12 },
      "Recorded 20 decimals; sold 12 decimals",
      "DEED",
    ).raw.area_decimals,
  ).toBe(12);
  expect(
    groundExtraction(
      { area_decimals: null },
      "20 decimals, 12 decimals",
      "KHATIAN",
    ).raw.area_decimals,
  ).toBeNull();
});
test("native source outranks model transcription and preserves explicit document identities", () => {
  const result = groundExtraction(
    {
      official_number: "নথি-পর্চা-০০১",
      document_date: "2020-02-12",
      source_text: "wrong 2019",
      parcel: {},
    },
    "নথির পরিচিতি নম্বর নথি-পর্চা-০০১\nখতিয়ান নম্বর আরএস-১১৮\nজমির পরিমাণ ২০ শতাংশ\nপ্রদানের তারিখ ১২ ফেব্রুয়ারি ২০২০",
    "PORCHA",
  );
  expect(result.raw.official_number).toBe("নথি-পর্চা-০০১");
  expect(result.raw.document_date).toBe("2020-02-12");
  expect(result.raw.area_decimals).toBe(20);
  expect(result.evidence.source_kind).toBe("native_text");
});

test("fractional/comma quantities and explicit percentage shares are left for review", () => {
  for (const source of [
    "অংশ ৫০ শতাংশ",
    "Area 1/2 acre",
    "Area 0,15 acre",
    "Area -1 acre",
  ]) {
    const result = groundExtraction(
      { area_decimals: null, parcel: { total_area_decimals: null } },
      source,
      "KHATIAN",
    );
    expect(result.raw.area_decimals).toBeNull();
    expect(result.raw.parcel.total_area_decimals).toBeNull();
  }
});

test("literal OCR transcript line breaks are parsed without altering values or accepting truncation", async () => {
  const { parseExtractionJson } = await import("../../src/lib/extraction-json");
  const result = parseExtractionJson(
    '{"source_text":"জেলা: নরসিংদী\nমৌজা: নমুনা\tমৌজা","official_number":"001"}',
  );
  expect(result.source_text).toBe("জেলা: নরসিংদী\nমৌজা: নমুনা\tমৌজা");
  expect(result.official_number).toBe("001");
  expect(
    parseExtractionJson('```json\n{"source_text":"quote \\\" and \\\\"}\n```')
      .source_text,
  ).toBe('quote " and \\');
  expect(() => parseExtractionJson('{"source_text":"truncated')).toThrow();
});
