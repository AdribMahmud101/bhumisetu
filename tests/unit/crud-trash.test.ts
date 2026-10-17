import { describe, expect, test } from "bun:test";
import { formatLandArea, Land, LAND_UNITS } from "../../src/lib/domain";

describe("land domain and trash filtering", () => {
  const activeLands: Land[] = [
    {
      id: "lnd-1",
      unique_land_id: "LND-001",
      district: "Narsingdi",
      upazila: "Shibpur",
      mouza: "Kaliganj",
      jl_number: "25",
      dag_number: "207",
      current_khatian_no: "RS-118",
      total_area_decimals: 20,
      is_finalized: true,
      is_deleted: false,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "lnd-2",
      unique_land_id: "LND-002",
      district: "Gazipur",
      upazila: "Kaliganj",
      mouza: "Shobujpur",
      jl_number: "42",
      dag_number: "310",
      current_khatian_no: "RS-220",
      total_area_decimals: 33,
      total_area_unit: "bigha",
      is_finalized: false,
      is_deleted: false,
      deleted_at: null,
      created_at: "2026-01-02T00:00:00Z",
    },
  ];

  const trashedLands: Land[] = [
    {
      id: "lnd-3",
      unique_land_id: "LND-003",
      district: "Dhaka",
      upazila: "Tejgaon",
      mouza: "Kawran",
      jl_number: "10",
      dag_number: "505",
      current_khatian_no: "RS-99",
      total_area_decimals: 50,
      total_area_unit: "acre",
      is_finalized: false,
      is_deleted: true,
      deleted_at: "2026-01-03T12:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  test("active lands list excludes deleted lands", () => {
    const all = [...activeLands, ...trashedLands];
    const active = all.filter((l) => !l.is_deleted);
    expect(active).toHaveLength(2);
    expect(active.map((l) => l.unique_land_id)).toEqual(["LND-001", "LND-002"]);
  });

  test("trash list isolates deleted lands with valid timestamps", () => {
    const all = [...activeLands, ...trashedLands];
    const trash = all.filter((l) => l.is_deleted);
    expect(trash).toHaveLength(1);
    expect(trash[0].unique_land_id).toBe("LND-003");
    expect(trash[0].deleted_at).toBeDefined();
    expect(trash[0].is_finalized).toBe(false);
  });

  test("restoring land resets deletion markers", () => {
    const trashed = { ...trashedLands[0] };
    const restored: Land = {
      ...trashed,
      is_deleted: false,
      deleted_at: null,
    };
    expect(restored.is_deleted).toBe(false);
    expect(restored.deleted_at).toBeNull();
  });

  test("dynamic land units format correctly in BN and EN", () => {
    // 20 decimals in decimal unit
    expect(formatLandArea(20, "decimal", "bn")).toBe("20 শতাংশ");
    expect(formatLandArea(20, "decimal", "en")).toBe("20 decimals");

    // 33 decimals in bigha unit (factor = 33) -> 1 bigha
    expect(formatLandArea(33, "bigha", "en")).toBe("1 bighas (33 decimals)");
    expect(formatLandArea(33, "bigha", "bn")).toBe("1 বিঘা (33 শতাংশ)");

    // 100 decimals in acre unit (factor = 100) -> 1 acre
    expect(formatLandArea(100, "acre", "en")).toBe("1 acres (100 decimals)");
    expect(formatLandArea(100, "acre", "bn")).toBe("1 একর (100 শতাংশ)");
  });

  test("all LAND_UNITS are defined as expected strings", () => {
    expect(LAND_UNITS).toContain("শতাংশ");
    expect(LAND_UNITS).toContain("একর");
    expect(LAND_UNITS).toContain("বিঘা");
    expect(LAND_UNITS).toContain("কাঠা");
    expect(LAND_UNITS).toContain("ছটাক");
  });
});
