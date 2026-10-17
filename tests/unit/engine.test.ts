import { describe, expect, test } from "bun:test";
import { analyzeRecords } from "../../src/lib/verification-engine";
import { emptyFields, Land, LandDocument } from "../../src/lib/domain";
const land = {
  id: "land",
  unique_land_id: "TEST",
  dag_number: "207",
  total_area_decimals: 20,
} as Land;
function doc(id: string, values: Partial<LandDocument>): LandDocument {
  return {
    ...emptyFields,
    id,
    master_land_id: "land",
    sha256: id,
    doc_code: id,
    category: "DEED",
    sub_type: "SAF_KABALA",
    verification_status: "VERIFIED",
    extraction_status: "READY",
    extraction_error: null,
    file_path: "",
    file_name: "test.pdf",
    mime_type: "application/pdf",
    created_at: "",
    extracted_json: {},
    dag_number: "207",
    ...values,
  };
}
const base = doc("kh", {
  category: "KHATIAN",
  sub_type: "RS",
  area_decimals: 20,
  buyer_or_current_owner: "Abdul Karim",
  document_date: "2018-01-01",
});
const first = doc("d1", {
  official_number: "502/2021",
  area_decimals: 12,
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Rahima Begum",
  document_date: "2021-03-15",
  execution_date: "2021-03-14",
  share_identity: "NORTH",
});
const second = doc("d2", {
  official_number: "889/2022",
  area_decimals: 12,
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Karim Uddin",
  document_date: "2022-08-20",
  execution_date: "2022-08-19",
  share_identity: "NORTH",
});
const mutation = doc("mut", {
  category: "MUTATION",
  sub_type: "PURCHASE",
  official_number: "MUT-991",
  based_on_deed: "889/2022",
  document_date: "2022-10-05",
  buyer_or_current_owner: "Karim Uddin",
  area_decimals: 12,
});
describe("evidence engine", () => {
  test("canonical conflict computes 60 with both deeds and mutation", () => {
    const r = analyzeRecords(land, [base, first, second, mutation]);
    expect(r.score).toBe(60);
    expect(r.excess).toBe(4);
    expect(r.signals.map((s) => s.id)).toEqual(["OVERLAP", "MUTATION"]);
    expect(r.signals[1].evidence).toContain("mut");
  });
  test("one transfer is not a conflict", () => {
    expect(analyzeRecords(land, [base, first]).score).toBe(0);
  });
  test("missing baseline is uncertainty, not fraud", () => {
    const r = analyzeRecords(land, [first]);
    expect(r.score).toBe(0);
    expect(r.status).toBe("Further verification required");
  });
  test("identical file import is not counted twice", () => {
    expect(
      analyzeRecords(land, [base, first, { ...first, id: "duplicate" }]).score,
    ).toBe(0);
  });
  test("Porcha and Khatian do not double entitlement", () => {
    expect(
      analyzeRecords(land, [
        base,
        { ...base, id: "por", sha256: "por", category: "PORCHA" },
        first,
        second,
      ]).score,
    ).toBe(40);
  });
  test("equal areas do not alone imply overlapping shares", () => {
    const r = analyzeRecords({ ...land, total_area_decimals: 30 }, [
      { ...base, area_decimals: 30 },
      { ...first, share_identity: "EAST" },
      { ...second, share_identity: "WEST" },
    ]);
    expect(r.score).toBe(0);
  });
  test("unrelated dag and pending sale are excluded", () => {
    expect(
      analyzeRecords(land, [base, first, { ...second, dag_number: "999" }])
        .score,
    ).toBe(0);
    expect(
      analyzeRecords(land, [
        base,
        first,
        { ...second, verification_status: "PENDING" },
      ]).score,
    ).toBe(0);
  });
  test("Bangla dag digits and whitespace normalize", () => {
    expect(
      analyzeRecords(land, [base, first, { ...second, dag_number: " ২০৭ " }])
        .score,
    ).toBe(40);
  });
  test("unknown seller with prior baseline triggers chain signal", () => {
    expect(
      analyzeRecords(land, [
        base,
        { ...first, seller_or_prior_owner: "Another Seller" },
      ]).score,
    ).toBe(25);
  });
  test("registration before execution triggers timeline signal", () => {
    expect(
      analyzeRecords(land, [base, { ...first, execution_date: "2021-04-01" }])
        .score,
    ).toBe(15);
  });
  test("fractional areas use hundredth-decimal arithmetic", () => {
    const r = analyzeRecords({ ...land, total_area_decimals: 0.3 }, [
      { ...base, area_decimals: 0.3 },
      { ...first, area_decimals: 0.1, share_identity: "A" },
      { ...second, area_decimals: 0.2, share_identity: "B" },
    ]);
    expect(r.score).toBe(0);
  });
});
