import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
test("citizen can search the real conflict, inspect history, and open source PDF", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "জমির নথি হোক স্বচ্ছ। সিদ্ধান্ত হোক নিশ্চিন্ত।",
    }),
  ).toBeVisible();
  await page.goto("/verify");
  await page.getByTestId("land-search-input").fill("LND-MOCK-001");
  await page.getByTestId("land-search-btn").click();
  await expect(page.getByTestId("risk-indicator-score")).toHaveText("60", {
    timeout: 30000,
  });
  await expect(page.getByTestId("evidence-panel")).toContainText("502/2021");
  await expect(page.getByTestId("evidence-panel")).toContainText("889/2022");
  await expect(page.getByTestId("external-checks-panel")).toContainText(
    "তথ্য অনুপস্থিত",
  );
  await page.getByRole("tab", { name: "জমির ইতিহাস" }).click();
  await expect(page.getByTestId("timeline-event-card")).toHaveCount(5);
  const bundle = await (
    await request.get("/api/service/land/LND-MOCK-001")
  ).json();
  const source = await request.get(
    "/api/service/document/" + bundle.documents[0].id,
  );
  expect(source.status()).toBe(200);
  expect(source.headers()["content-type"]).toContain("application/pdf");
  await page.getByRole("tab", { name: "বিশ্লেষণ ও প্রমাণ" }).click();
  await page.screenshot({ path: ".local/record-desktop.png", fullPage: true });
});
test("private records and officer writes reject anonymous access", async ({
  request,
}) => {
  expect((await request.get("/api/service/land/LND-DRAFT-003")).status()).toBe(
    404,
  );
  expect((await request.get("/api/service/mutations")).status()).toBe(401);
  expect(
    (await request.post("/api/service/create", { data: {} })).status(),
  ).toBe(401);
});
test("clean record computes zero without claiming legal clearance", async ({
  page,
}) => {
  await page.goto("/verify/LND-CLEAN-002");
  await expect(page.getByTestId("risk-indicator-score")).toHaveText("0");
  await expect(page.getByTestId("external-checks-panel")).toContainText(
    "তথ্য অনুপস্থিত",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".local/record-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("officer correction persists with audit, re-verification stays idempotent and approval is blocked", async ({
  page,
}) => {
  const request = page.request;
  const login = await request.post("/api/service/login", { data: credentials });
  expect(login.ok()).toBeTruthy();
  const bundle = await (
    await request.get("/api/service/land/LND-MOCK-001")
  ).json();
  const doc = bundle.documents.find((d: any) => d.doc_code === "DOC-DEED-002");
  const keys = [
    "official_number",
    "document_date",
    "execution_date",
    "seller_or_prior_owner",
    "buyer_or_current_owner",
    "dag_number",
    "area_decimals",
    "khatian_ref",
    "share_identity",
    "based_on_deed",
  ];
  const fields = Object.fromEntries(keys.map((k) => [k, doc[k]]));
  const reason = "E2E source review " + Date.now();
  for (let i = 0; i < 2; i++) {
    const r = await request.post("/api/service/review/" + doc.id, {
      data: { fields, reason, status: "VERIFIED" },
    });
    expect(r.ok()).toBeTruthy();
  }
  let cases = await (await request.get("/api/service/mutations")).json();
  expect(cases.filter((c: any) => c.source_deed_id === doc.id)).toHaveLength(1);
  const c = cases.find((c: any) => c.source_deed_id === doc.id);
  expect(c.display_status).toBe("HEARING_REQUIRED");
  const approve = await request.post("/api/service/decision/" + c.id, {
    data: { status: "APPROVED", reason: "E2E approval attempt" },
  });
  expect(approve.ok()).toBeFalsy();
  const changed = { ...fields, dag_number: "207-A" };
  expect(
    (
      await request.post("/api/service/review/" + doc.id, {
        data: { fields: changed, reason, status: "PENDING" },
      })
    ).ok(),
  ).toBeTruthy();
  const audit = await (
    await request.get("/api/service/audit/" + doc.id)
  ).json();
  expect(
    audit.some(
      (a: any) =>
        a.field_name === "dag_number" &&
        a.previous_value === "207" &&
        a.new_value === "207-A" &&
        a.reason === reason,
    ),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/service/review/" + doc.id, {
        data: {
          fields,
          reason: "Restore canonical synthetic fixture after E2E",
          status: "VERIFIED",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/service/publish/LND-MOCK-001", { data: {} })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "ভূমি রেকর্ড ব্যবস্থাপনা" }),
  ).toBeVisible();
  await page.goto("/admin/mutations");
  await expect(page.getByText("শুনানি প্রয়োজন").first()).toBeVisible();
});
test("real PDF upload calls DeepInfra and stores extracted fields for review", async ({
  page,
}) => {
  const request = page.request;
  test.setTimeout(150000);
  expect(
    (await request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  const created = await request.post("/api/service/create", {
    data: {
      district: "Synthetic test",
      upazila: "Demo",
      mouza: "OCR validation (fictional)",
      jl_number: "25",
      dag_number: "207",
      current_khatian_no: "RS-118",
      total_area_decimals: 20,
    },
  });
  expect(created.ok()).toBeTruthy();
  const land = await created.json();
  await page.goto("/admin/land/" + land.unique_land_id);
  await page.getByRole("tab", { name: "নথিসমূহ" }).click();
  await page.locator("select").first().selectOption("DEED");
  const extraction = page.waitForResponse(
    (r) =>
      r.url().includes("/api/service/extract/") &&
      r.request().method() === "POST",
    { timeout: 120000 },
  );
  await page
    .getByLabel("নথি আপলোড")
    .setInputFiles(".local/fixtures/DOC-DEED-001.pdf");
  const result = await extraction;
  const data = await result.json();
  expect(result.ok(), JSON.stringify(data)).toBeTruthy();
  expect(data.fields.official_number).toBe("502/2021");
  expect(data.fields.area_decimals).toBe(12);
  const stored = await (
    await request.get("/api/service/land/" + land.unique_land_id)
  ).json();
  expect(stored.documents).toHaveLength(1);
  expect(stored.documents[0].verification_status).toBe("PENDING");
  expect(stored.documents[0].extraction_status).toBe("READY");
});
test("copy integrity matches original bytes and altered PDF produces an area mismatch", async ({
  page,
}) => {
  test.setTimeout(150000);
  const request = page.request;
  const bundle = await (
    await request.get("/api/service/land/LND-MOCK-001")
  ).json();
  const deed = bundle.documents.find((d: any) => d.doc_code === "DOC-DEED-001");
  const source = await request.get("/api/service/document/" + deed.id);
  const exact = await request.post("/api/service/compare/LND-MOCK-001", {
    multipart: {
      file: {
        name: "original.pdf",
        mimeType: "application/pdf",
        buffer: await source.body(),
      },
    },
  });
  expect(exact.ok()).toBeTruthy();
  expect((await exact.json()).mode).toBe("SHA-256 exact copy");
  await page.goto("/verify/LND-MOCK-001");
  await page.getByRole("tab", { name: "দলিল যাচাই" }).click();
  const comparison = page.waitForResponse(
    (r) =>
      r.url().includes("/api/service/compare/") &&
      r.request().method() === "POST",
    { timeout: 120000 },
  );
  await page
    .getByLabel("দলিলের তুলনা")
    .setInputFiles(".local/fixtures/TAMPERED-DEED-502.pdf");
  const response = await comparison;
  const report = await response.json();
  expect(response.ok(), JSON.stringify(report)).toBeTruthy();
  expect(report.status).toBe("Mismatch found");
  expect(report.rows.find((r: any) => r.key === "area_decimals").uploaded).toBe(
    25,
  );
  await expect(
    page.getByText("অমিল পাওয়া গেছে", { exact: true }),
  ).toBeVisible();
});
