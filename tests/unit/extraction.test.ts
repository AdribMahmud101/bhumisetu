import { expect, test } from "bun:test";
import { parseExtractionResult } from "../../src/lib/extraction-result";
test("missing source details remain null, never invented", () => {
  const result = parseExtractionResult({}, "KHATIAN", true);
  expect(result.parcel?.district).toBeNull();
  expect(result.parcel?.total_area_decimals).toBeNull();
  expect(Object.values(result.fields).every((value) => value === null)).toBe(
    true,
  );
});
test("recorded area and numeric identifiers normalize for confirmation", () => {
  const result = parseExtractionResult(
    {
      official_number: 118,
      dag_number: 207,
      area_decimals: "২০",
      parcel: { total_area_decimals: "২০", jl_number: 12 },
    },
    "KHATIAN",
    true,
  );
  expect(result.parcel).toMatchObject({
    dag_number: "207",
    current_khatian_no: "118",
    total_area_decimals: 20,
    jl_number: "12",
    district: null,
  });
  expect(result.fields.area_decimals).toBe(20);
});
test("a sold or mutated area cannot become the parcel baseline", () => {
  for (const category of ["DEED", "MUTATION"]) {
    const result = parseExtractionResult(
      { area_decimals: 12, parcel: { total_area_decimals: 12 } },
      category,
      true,
    );
    expect(result.fields.area_decimals).toBe(12);
    expect(result.parcel?.total_area_decimals).toBeNull();
  }
});
