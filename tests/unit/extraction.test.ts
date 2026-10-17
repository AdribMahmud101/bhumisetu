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

test("boolean model flags become unknown without dropping valid deed data", () => {
  const result = parseExtractionResult(
    {
      based_on_deed: false,
      share_identity: true,
      area_decimals: 12,
      official_number: "502/2021",
      parcel: { district: false, dag_number: "207" },
    },
    "DEED",
    true,
  );
  expect(result.fields.based_on_deed).toBeNull();
  expect(result.fields.share_identity).toBeNull();
  expect(result.fields.area_decimals).toBe(12);
  expect(result.fields.official_number).toBe("502/2021");
  expect(result.parcel?.district).toBeNull();
  expect(result.parcel?.dag_number).toBe("207");
});
test("real deed references are retained and malformed objects stay invalid", () => {
  expect(
    parseExtractionResult({ based_on_deed: "502/2021" }, "MUTATION").fields
      .based_on_deed,
  ).toBe("502/2021");
  expect(() =>
    parseExtractionResult(
      { based_on_deed: { reference: "invented" } },
      "MUTATION",
    ),
  ).toThrow();
});

test("unsupported dates stay unknown while valid date digits normalize", () => {
  const result = parseExtractionResult(
    {
      document_date: "12/05/2021",
      execution_date: "২০২১-০৫-১২",
      official_number: "502/2021",
    },
    "DEED",
  );
  expect(result.fields.document_date).toBeNull();
  expect(result.fields.execution_date).toBe("2021-05-12");
  expect(result.fields.official_number).toBe("502/2021");
  expect(
    parseExtractionResult(
      { document_date: "2021-02-30", execution_date: "" },
      "DEED",
    ).fields.document_date,
  ).toBeNull();
});
