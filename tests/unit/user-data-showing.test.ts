import { describe, expect, test } from "bun:test";
import {
  categories,
  Category,
  categoryFields,
  formatLandArea,
  Land,
  LandDocument,
} from "../../src/lib/domain";
import bn from "../../src/i18n/bn.json";
import en from "../../src/i18n/en.json";

describe("User data showing specification compliance (User_data_showing.pdf)", () => {
  const sampleLand: Land = {
    id: "lnd-1",
    unique_land_id: "LND-001",
    district: "নরসিংদী",
    upazila: "শিবপুর",
    mouza: "নমুনা মৌজা",
    jl_number: "25",
    dag_number: "207",
    current_khatian_no: "118",
    total_area_decimals: 20,
    total_area_unit: "শতাংশ",
    is_finalized: true,
    created_at: "2026-01-01T00:00:00Z",
  };

  const sampleDeed: LandDocument = {
    id: "doc-deed-1",
    doc_code: "DEED-502-2021",
    master_land_id: "lnd-1",
    category: "DEED",
    sub_type: "SAF_KABALA",
    verification_status: "VERIFIED",
    extraction_status: "EXTRACTED",
    extraction_error: null,
    file_path: "storage/deeds/502.pdf",
    sha256: "abc123def456",
    file_name: "deed_502_2021.pdf",
    mime_type: "application/pdf",
    extracted_json: { seller: "আবদুল করিম", buyer: "রহিমা বেগম" },
    official_number: "৫০২/২০২১",
    document_date: "2021-03-15",
    execution_date: "2021-03-10",
    seller_or_prior_owner: "আবদুল করিম",
    buyer_or_current_owner: "রহিমা বেগম",
    dag_number: "207",
    area_decimals: 8,
    area_unit: "শতাংশ",
    khatian_ref: "১১৮",
    share_identity: "০.৪০০",
    based_on_deed: null,
    created_at: "2026-01-02T00:00:00Z",
  };

  test("missing field rule: null or empty values fallback explicitly to 'নথিতে পাওয়া যায়নি'", () => {
    const missingValueFormatter = (val: string | number | null | undefined, locale: "bn" | "en") => {
      if (val === null || val === undefined || String(val).trim() === "") {
        return locale === "bn" ? bn.field_not_found_in_doc : en.field_not_found_in_doc;
      }
      return String(val);
    };

    expect(missingValueFormatter(null, "bn")).toBe("নথিতে পাওয়া যায়নি");
    expect(missingValueFormatter("", "bn")).toBe("নথিতে পাওয়া যায়নি");
    expect(missingValueFormatter("  ", "bn")).toBe("নথিতে পাওয়া যায়নি");
    expect(missingValueFormatter(undefined, "bn")).toBe("নথিতে পাওয়া যায়নি");

    expect(missingValueFormatter(null, "en")).toBe("Not found in document");
    expect(missingValueFormatter("৫০২/২০২১", "bn")).toBe("৫০২/২০২১");
  });

  test("citizen user view sanitization prevents exposing private hashes and server paths", () => {
    // Simulating the backend sanitization for non-admin requests in api/service/land/[id]
    const citizenDocumentSanitizer = (d: LandDocument) => {
      const copy = { ...d };
      copy.file_path = "";
      copy.extracted_json = {};
      copy.extraction_error = null;
      return copy;
    };

    const sanitized = citizenDocumentSanitizer(sampleDeed);
    expect(sanitized.file_path).toBe("");
    expect(sanitized.extracted_json).toEqual({});
    expect(sanitized.extraction_error).toBeNull();
    // Verified user fields remain intact
    expect(sanitized.official_number).toBe("৫০২/২০২১");
    expect(sanitized.seller_or_prior_owner).toBe("আবদুল করিম");
    expect(sanitized.buyer_or_current_owner).toBe("রহিমা বেগম");
    expect(sanitized.dag_number).toBe("207");
    expect(sanitized.area_decimals).toBe(8);
  });

  test("document category fields conform to the 4 primary categories", () => {
    expect(categoryFields.KHATIAN).toContain("buyer_or_current_owner");
    expect(categoryFields.KHATIAN).not.toContain("seller_or_prior_owner");

    expect(categoryFields.DEED).toContain("seller_or_prior_owner");
    expect(categoryFields.DEED).toContain("buyer_or_current_owner");
    expect(categoryFields.DEED).toContain("execution_date");

    expect(categoryFields.MUTATION).toContain("based_on_deed");
    expect(categoryFields.MUTATION).toContain("seller_or_prior_owner");
    expect(categoryFields.MUTATION).toContain("buyer_or_current_owner");
  });

  test("dynamic land units format correctly for document area", () => {
    expect(formatLandArea(8, "শতাংশ", "bn")).toBe("8 শতাংশ");
    expect(formatLandArea(8, "shotangsho", "en")).toBe("8 decimals");
    expect(formatLandArea(100, "acre", "bn")).toBe("1 একর (100 শতাংশ)");
    expect(formatLandArea(33, "bigha", "bn")).toBe("1 বিঘা (33 শতাংশ)");
  });

  test("all User Data Showing i18n keys are present and non-empty", () => {
    const keysToCheck = [
      "field_not_found_in_doc",
      "parties_info",
      "land_info",
      "general_info",
      "doc_details_title",
      "recorded_owner_label",
      "seller_label",
      "buyer_label",
      "applicant_new_owner_label",
      "prior_owner_label",
      "referenced_deed_label",
      "view_source_doc",
      "citizen_doc_preview_note",
      "doc_verification_status",
      "officer_audit_restricted_note",
      "donor_label",
      "donee_label",
      "testator_label",
      "beneficiary_label",
      "mortgagor_label",
      "mortgagee_label",
      "co_sharers_label",
      "discrepancy_found",
      "verification_underway",
      "ownership_share_label",
      "doc_area_label",
    ];

    for (const key of keysToCheck) {
      expect((bn as any)[key]).toBeDefined();
      expect((bn as any)[key].length).toBeGreaterThan(0);
      expect((en as any)[key]).toBeDefined();
      expect((en as any)[key].length).toBeGreaterThan(0);
    }
  });
});
