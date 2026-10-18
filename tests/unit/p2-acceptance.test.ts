import { describe, expect, test } from "bun:test";
import {
  compareDeedWithRecord,
  ExtractedDeedFields,
} from "../../src/lib/deed-comparison-engine";
import { emptyFields, Land, LandDocument } from "../../src/lib/domain";

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
  buyer_or_current_owner: "Abdul Karim",
  area_decimals: 20,
});

const docPorcha = createDoc("DOC-POR-001", {
  category: "PORCHA",
  sub_type: "CERTIFIED",
  official_number: "POR-118",
  buyer_or_current_owner: "Abdul Karim",
  area_decimals: 20,
});

const docDeed502 = createDoc("DOC-DEED-502", {
  category: "DEED",
  sub_type: "SAF_KABALA",
  official_number: "502/2021",
  document_date: "2021-03-15",
  seller_or_prior_owner: "Abdul Karim",
  buyer_or_current_owner: "Rahima Begum",
  area_decimals: 12,
  dag_number: "207",
});

const docMutation = createDoc("DOC-MUT-001", {
  category: "MUTATION",
  sub_type: "PURCHASE",
  official_number: "MUT-2021-502",
  based_on_deed: "502/2021",
  buyer_or_current_owner: "Rahima Begum",
  area_decimals: 12,
});

const storedDocuments = [docKhatian, docPorcha, docDeed502, docMutation];

describe("P2 Deed & Ownership Verification Acceptance Suite", () => {
  test("Test Case 1: Area Mismatch (Stored 15/12 Decimals vs Uploaded 25 Decimals)", () => {
    const uploadedDeed: ExtractedDeedFields = {
      deedNumber: "502/2021",
      deedDate: "2021-03-15",
      sellerName: "Abdul Karim",
      buyerName: "Rahima Begum",
      dagNumber: "207",
      landAreaDecimals: 25, // Conflicting with stored 12 decimals
    };

    const result = compareDeedWithRecord(uploadedDeed, storedDocuments, mockLand);

    expect(result.outcome).toBe("mismatch");
    expect(result.headlineMessageBn).toContain("দলিলের তথ্যে অমিল পাওয়া গেছে");
    expect(result.discrepanciesCount).toBeGreaterThanOrEqual(1);

    const areaComparison = result.fieldsComparison.find(
      (f) => f.fieldName === "landAreaDecimals",
    );
    expect(areaComparison).toBeDefined();
    expect(areaComparison?.isMatch).toBe(false);
    expect(areaComparison?.severity).toBe("critical");
    expect(areaComparison?.storedValue).toBe(12);
    expect(areaComparison?.uploadedValue).toBe(25);

    expect(result.nextStepsBn.some((s) => s.includes("সাব-রেজিস্ট্রি"))).toBe(true);
  });

  test("Test Case 2: Exact Match", () => {
    const uploadedDeed: ExtractedDeedFields = {
      deedNumber: "502/2021",
      deedDate: "2021-03-15",
      sellerName: "Abdul Karim",
      buyerName: "Rahima Begum",
      dagNumber: "207",
      landAreaDecimals: 12,
    };

    const result = compareDeedWithRecord(uploadedDeed, storedDocuments, mockLand);

    expect(result.outcome).toBe("matched");
    expect(result.headlineMessageBn).toContain("দলিলের তথ্য সংরক্ষিত রেকর্ডের সঙ্গে মিলেছে");
    expect(result.discrepanciesCount).toBe(0);

    // All core fields match
    for (const field of result.fieldsComparison) {
      expect(field.isMatch).toBe(true);
      expect(field.severity).toBe("none");
    }

    expect(result.crossChecks.khatianMatch).toBe(true);
    expect(result.crossChecks.porchaMatch).toBe(true);
    expect(result.crossChecks.namjariMatch).toBe(true);
  });

  test("Test Case 3: Record Not Found / Illegible", () => {
    const unknownDeed: ExtractedDeedFields = {
      deedNumber: "999/9999",
      landAreaDecimals: 10,
    };

    const result = compareDeedWithRecord(unknownDeed, storedDocuments, mockLand);

    expect(result.outcome).toBe("inconclusive");
    expect(result.headlineMessageBn).toContain("দলিলের সত্যতা নিশ্চিত করা যায়নি");
    expect(result.nextStepsBn.some((s) => s.includes("তল্লাশি"))).toBe(true);
  });

  test("QR Code Payload Resolution", () => {
    const qrDeed: ExtractedDeedFields = {
      qrPayload: "https://bhumisetu.gov.bd/verify/LND-MOCK-001?deed=502/2021",
      sellerName: "Abdul Karim",
      buyerName: "Rahima Begum",
      landAreaDecimals: 12,
      dagNumber: "207",
      deedDate: "2021-03-15",
    };

    const result = compareDeedWithRecord(qrDeed, storedDocuments, mockLand);
    expect(result.outcome).toBe("matched");
  });

  test("Test Case 4: Manually Corrected Fields (Fixing OCR imperfections before submission)", () => {
    // Simulated scenario: OCR initially had a slight misspelling or unparsed area,
    // citizen/officer manually corrected to 'Abdul Karim' and 12 decimals
    const manuallyCorrectedDeed: ExtractedDeedFields = {
      deedNumber: "502/2021",
      deedDate: "2021-03-15",
      sellerName: "Abdul Karim", // Manually corrected from OCR artifact
      buyerName: "Rahima Begum",
      dagNumber: "207",
      landAreaDecimals: 12, // Confirmed 12 decimals
      khatianNumber: "RS-118",
    };

    const result = compareDeedWithRecord(manuallyCorrectedDeed, storedDocuments, mockLand);
    expect(result.outcome).toBe("matched");
    expect(result.discrepanciesCount).toBe(0);
    expect(result.crossChecks.khatianMatch).toBe(true);
  });

  test("Test Case 5: Verification with Bengali numeral inputs from edit screen", () => {
    // In Bangladesh, citizens or officers often type Bengali numerals into the form
    const bnInputDeed: ExtractedDeedFields = {
      deedNumber: "502/2021",
      deedDate: "2021-03-15",
      sellerName: "Abdul Karim",
      buyerName: "Rahima Begum",
      dagNumber: "207",
      landAreaDecimals: 12, // normalized from Bengali '১২'
      khatianNumber: "RS-118",
    };

    const result = compareDeedWithRecord(bnInputDeed, storedDocuments, mockLand);
    expect(result.outcome).toBe("matched");
    expect(result.discrepanciesCount).toBe(0);
  });
});
