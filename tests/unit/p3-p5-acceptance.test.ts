import { describe, expect, test } from "bun:test";
import {
  runVerificationEngineWithData,
} from "../../src/lib/verification-engine";
import { emptyFields, Land, LandDocument } from "../../src/lib/domain";

// Exact replica of the seed data fixture for LND-MOCK-001
const mockLand: Land = {
  id: "00000000-0000-0000-0000-000000000001",
  unique_land_id: "LND-MOCK-001",
  district: "Narsingdi",
  upazila: "Shibpur",
  mouza: "Kaliganj (fictional)",
  jl_number: "25",
  dag_number: "207",
  current_khatian_no: "RS-118",
  total_area_decimals: 20,
  is_finalized: true,
  created_at: "2026-01-01T00:00:00Z",
};

function createDoc(id: string, values: Partial<LandDocument>): LandDocument {
  return {
    ...emptyFields,
    id,
    master_land_id: mockLand.id,
    sha256: id,
    doc_code: id,
    category: "DEED",
    sub_type: "SAF_KABALA",
    verification_status: "VERIFIED",
    extraction_status: "READY",
    extraction_error: null,
    file_path: "",
    file_name: `${id}.pdf`,
    mime_type: "application/pdf",
    created_at: "2026-01-01T00:00:00Z",
    extracted_json: {},
    dag_number: "207",
    ...values,
  };
}

const docKhatian = createDoc("DOC-KH-001", {
  category: "KHATIAN",
  sub_type: "RS",
  official_number: "RS-118",
  document_date: "2018-01-10",
  buyer_or_current_owner: "Abdul Karim",
  area_decimals: 20,
  khatian_ref: "RS-118",
});

const docPorcha = createDoc("DOC-POR-001", {
  category: "PORCHA",
  sub_type: "CERTIFIED",
  official_number: "POR-118",
  document_date: "2018-01-10",
  buyer_or_current_owner: "Abdul Karim",
  area_decimals: 20,
  khatian_ref: "RS-118",
});

const docDeed1 = createDoc("DOC-DEED-001", {
  category: "DEED",
  sub_type: "SAF_KABALA",
  official_number: "502/2021",
  document_date: "2021-03-15",
  execution_date: "2021-03-14",
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Rahima Begum",
  area_decimals: 12,
  share_identity: "NORTH-12-DAG207",
});

const docDeed2 = createDoc("DOC-DEED-002", {
  category: "DEED",
  sub_type: "SAF_KABALA",
  official_number: "889/2022",
  document_date: "2022-08-20",
  execution_date: "2022-08-19",
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Karim Uddin",
  area_decimals: 12,
  share_identity: "NORTH-12-DAG207",
});

const docMutation = createDoc("DOC-MUT-001", {
  category: "MUTATION",
  sub_type: "PURCHASE",
  official_number: "MUT-2022-991",
  document_date: "2022-10-05",
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Karim Uddin",
  area_decimals: 12,
  based_on_deed: "889/2022",
  share_identity: "NORTH-12-DAG207",
});

describe("P3 and P5 Acceptance Test Suite (Specification Section 4)", () => {
  const result = runVerificationEngineWithData(mockLand, [
    docKhatian,
    docPorcha,
    docDeed1,
    docDeed2,
    docMutation,
  ]);

  test("1. Engine Score strictly equals 65/100 with deduplication", () => {
    expect(result.riskScore).toBe(65);
    expect(result.maxScore).toBe(100);

    const doubleSaleAlert = result.triggeredAlerts.find(
      (a) => a.ruleId === "RULE_DOUBLE_SALE",
    );
    expect(doubleSaleAlert).toBeDefined();
    expect(doubleSaleAlert?.weight).toBe(40);

    const ownershipAlert = result.triggeredAlerts.find(
      (a) => a.ruleId === "RULE_OWNERSHIP_CONFLICT",
    );
    expect(ownershipAlert).toBeDefined();
    expect(ownershipAlert?.weight).toBe(25);

    // Namjari alert is present but deduplicated to 0 points
    const namjariAlert = result.triggeredAlerts.find(
      (a) => a.ruleId === "RULE_RECORD_MISMATCH",
    );
    expect(namjariAlert).toBeDefined();
    expect(namjariAlert?.weight).toBe(0);

    // Sum of weights is exactly 65
    const totalWeight = result.triggeredAlerts.reduce((s, a) => s + a.weight, 0);
    expect(totalWeight).toBe(65);
  });

  test("2. Severity level is elevated", () => {
    expect(result.severityLevel).toBe("elevated");
    expect(result.riskLabel).toBe("Elevated Risk Indicator");
  });

  test("3. P3 Administrative Status is Potential Conflict Detected", () => {
    expect(result.overallStatus).toBe("Potential Conflict Detected");
  });

  test("4. P5 Citizen Buyer Status requires further verification before purchase", () => {
    expect(result.buyerVerdict).toBe(
      "Further Verification Required before purchase",
    );
  });

  test("5. Double-Selling Alert explicitly identifies 12 decimals sold twice to Rahima Begum & Karim Uddin", () => {
    const doubleSale = result.triggeredAlerts.find(
      (a) => a.ruleId === "RULE_DOUBLE_SALE",
    );
    expect(doubleSale?.shortReason).toContain("12");
    expect(doubleSale?.shortReason).toContain("Rahima Begum");
    expect(doubleSale?.shortReason).toContain("Karim Uddin");
    expect(doubleSale?.shortReason).toContain("2021");
    expect(doubleSale?.shortReason).toContain("2022");
    expect(doubleSale?.evidenceDocs).toContain("DOC-DEED-001");
    expect(doubleSale?.evidenceDocs).toContain("DOC-DEED-002");
  });

  test("6. Namjari Alert identifies conflict between Karim Uddin's mutation and Rahima Begum's prior deed", () => {
    const namjari = result.triggeredAlerts.find(
      (a) => a.ruleId === "RULE_RECORD_MISMATCH",
    );
    expect(namjari?.shortReason).toContain("Karim Uddin");
    expect(namjari?.shortReason).toContain("Rahima Begum");
    expect(namjari?.evidenceDocs).toContain("DOC-MUT-001");
    expect(namjari?.evidenceDocs).toContain("DOC-DEED-001");
  });

  test("7. External Records explicitly list Court Litigation and Khas Land acquisition as Not checked / Data unavailable", () => {
    const court = result.coverage.missingOrExternalSources.find((s) =>
      s.name.includes("Court Litigation"),
    );
    expect(court).toBeDefined();
    expect(court?.status).toBe("Not checked / Data unavailable");

    const khas = result.coverage.missingOrExternalSources.find((s) =>
      s.name.includes("Khas & Land Acquisition"),
    );
    expect(khas).toBeDefined();
    expect(khas?.status).toBe("Not checked / Data unavailable");
  });

  test("8. Clean record achieves 0 risk score and Low Risk Indicator", () => {
    const cleanResult = runVerificationEngineWithData(mockLand, [
      docKhatian,
      docPorcha,
      docDeed1, // Single sale of 12 out of 20 decimals
    ]);
    expect(cleanResult.riskScore).toBe(0);
    expect(cleanResult.severityLevel).toBe("low");
    expect(cleanResult.riskLabel).toBe("Low Risk Indicator");
    expect(cleanResult.overallStatus).toBe("No conflict found in available records");
    expect(cleanResult.buyerVerdict).toBe("No conflict found in available records");
  });
});
