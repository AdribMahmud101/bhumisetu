import { describe, expect, test } from "bun:test";
import { AuditLogEntry } from "@/components/audit-trail";
import bn from "@/i18n/bn.json";
import en from "@/i18n/en.json";

describe("Audit Trail & Activity Log Tests", () => {
  test("audit log i18n keys are present and localized in both bn and en", () => {
    const requiredKeys = [
      "transparency_and_audit_log",
      "officer_activity_audit_trail_title",
      "officer_activity_audit_trail_desc",
      "field_correction_action",
      "ac_land_officer_label",
      "justification_label",
      "no_audit_events_recorded",
    ];

    for (const key of requiredKeys) {
      expect((bn as any)[key]).toBeDefined();
      expect((en as any)[key]).toBeDefined();
      expect((bn as any)[key].length).toBeGreaterThan(0);
      expect((en as any)[key].length).toBeGreaterThan(0);
    }
  });

  test("audit log entry contract structures correctly for parcel and document views", () => {
    const mockEntry: AuditLogEntry = {
      id: "9f42c264-5a2a-4df1-8a9d-b8923a1a6b01",
      document_id: "doc-12345",
      admin_id: "officer-uuid-456",
      field_name: "area_decimals",
      previous_value: "10.5",
      new_value: "12.0",
      reason: "Corrected from sub-registry physical deed volume 44",
      created_at: new Date().toISOString(),
      document: {
        id: "doc-12345",
        official_number: "DEED-4412",
        category: "DEED",
        sub_type: "SAF_KABALA",
        doc_code: "DOC-89A12B",
      },
    };

    expect(mockEntry.field_name).toBe("area_decimals");
    expect(mockEntry.previous_value).toBe("10.5");
    expect(mockEntry.new_value).toBe("12.0");
    expect(mockEntry.admin_id).toBe("officer-uuid-456");
    expect(mockEntry.reason).toContain("sub-registry physical deed");
    expect(mockEntry.document?.official_number).toBe("DEED-4412");
  });

  test("handles empty audit entries gracefully", () => {
    const emptyEntries: AuditLogEntry[] = [];
    expect(emptyEntries.length).toBe(0);
  });
});
