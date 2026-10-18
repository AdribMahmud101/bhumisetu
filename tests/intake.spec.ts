import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
test("upload first extracts a real PDF, confirms a private draft once and opens document review", async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  expect(
    (await request.post("/api/service/intake", { data: {} })).status(),
  ).toBe(401);
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  await page.getByTestId("locale-en").click();
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(page.locator("input[name=district]")).toHaveCount(0);
  await page.screenshot({ path: ".local/intake-upload.png", fullPage: true });
  await page
    .locator("input[type=file]")
    .setInputFiles(".local/fixtures/DOC-KH-001.pdf");
  const uploaded = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/service/intake") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Upload and extract" }).click();
  const intake = await (await uploaded).json();
  expect(intake.status).toBe("UPLOADED");
  expect(intake.master_land_id).toBeNull();
  await expect(
    page.getByRole("button", { name: "Confirm details and review document" }),
  ).toBeEnabled({ timeout: 100000 });
  const extracted = await (
    await page.request.get("/api/service/intake/" + intake.id)
  ).json();
  expect(extracted.status).toBe("READY");
  expect(extracted.extracted_fields.official_number).toBe("RS-118");
  expect(extracted.extracted_fields.area_decimals).toBe(20);
  const land = {
    district: "Synthetic District",
    upazila: "Synthetic Upazila",
    mouza: "Synthetic Mouza",
    jl_number: "1",
    dag_number: "207",
    current_khatian_no: "RS-118",
    total_area_decimals: "20",
  };
  for (const [key, value] of Object.entries(land))
    await page.locator(`input[name=${key}]`).fill(value);
  await expect(
    page.getByTestId("intake-edit-field-official_number"),
  ).toHaveValue("RS-118");
  await page
    .getByTestId("intake-edit-field-official_number")
    .fill("RS-118-CORRECTED");
  const shareField = page.getByTestId("intake-edit-field-share_identity");
  if (await shareField.count()) {
    await shareField.fill("Synthetic reviewed share");
  }
  const reason = "Officer confirmed land and document fields during source intake";
  await expect(page.locator("textarea[name=reason]")).toHaveCount(0);
  await page.getByTestId("dialog-locale-bn").click();
  await expect(page.locator("input[name=district]")).toHaveValue(land.district);
  await page.getByTestId("dialog-locale-en").click();
  await page.screenshot({ path: ".local/intake-confirm.png", fullPage: true });
  const confirmed = page.waitForResponse(
    (r) =>
      r.url().includes("/intake-confirm/") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirm details and review document" })
    .click();
  const response = await confirmed;
  expect(response.ok(), await response.text()).toBeTruthy();
  const result = await response.json();
  await expect(page).toHaveURL(
    new RegExp("/admin/land/" + result.unique_land_id),
  );
  await expect(
    page.getByRole("tab", { name: "Documents", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const bundle = await (
    await page.request.get("/api/service/land/" + result.unique_land_id)
  ).json();
  expect(bundle.documents).toHaveLength(1);
  expect(bundle.documents[0].verification_status).toBe("PENDING");
  expect(bundle.documents[0].official_number).toBe("RS-118-CORRECTED");
  expect(
    bundle.documents[0].extracted_json.original_extracted_fields
      .official_number,
  ).toBe("RS-118");
  expect(bundle.documents[0].extracted_json.preprocessing.version).toBe(
    "scan-v1",
  );
  expect(bundle.land.is_finalized).toBe(false);
  const repeat = await page.request.post(
    "/api/service/intake-confirm/" + intake.id,
    { data: { land, reason } },
  );
  expect(await repeat.json()).toEqual(result);
  expect(
    (await request.get("/api/service/land/" + result.unique_land_id)).status(),
  ).toBe(404);
  expect(
    (await request.get("/api/service/intake-document/" + intake.id)).status(),
  ).toBe(401);
  const logs = await (
    await page.request.get("/api/service/audit/" + result.document_id)
  ).json();
  expect(
    logs.some(
      (entry: any) =>
        entry.field_name === "parcel.district" && entry.reason === reason,
    ),
  ).toBe(true);
  expect(
    logs.some(
      (entry: any) =>
        entry.field_name === "official_number" &&
        entry.previous_value === "RS-118" &&
        entry.new_value === "RS-118-CORRECTED" &&
        entry.reason === reason,
    ),
  ).toBe(true);
  const source = await page.request.get(
    "/api/service/document/" + result.document_id,
  );
  expect(source.headers()["content-type"]).toContain("application/pdf");
  const removed = await page.request.post(
    "/api/service/delete-document/" + result.document_id,
    { data: {} },
  );
  expect(removed.ok(), await removed.text()).toBeTruthy();
  const afterRemoval = await (
    await page.request.get("/api/service/land/" + result.unique_land_id)
  ).json();
  expect(afterRemoval.documents).toHaveLength(0);
  expect(afterRemoval.land.is_finalized).toBe(false);
  expect(
    (await page.request.get("/api/service/document/" + result.document_id))
      .status(),
  ).toBe(404);
  const retainedAudit = await (
    await page.request.get("/api/service/audit/" + result.document_id)
  ).json();
  expect(retainedAudit.length).toBeGreaterThan(logs.length);
  expect(
    retainedAudit.some((entry: any) => entry.field_name === "document_removed"),
  ).toBe(true);
  expect(
    (
      await page.request.post(
        "/api/service/delete-document/" + result.document_id,
        { data: {} },
      )
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post("/api/service/demo-login", {
        data: { role: "citizen" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await request.post("/api/service/intake", { data: {} })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/service/intake-confirm/" + intake.id, {
        data: { land, reason },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/service/demo-login", {
        data: { role: "officer" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.get("/api/service/intake/" + intake.id)).status()).toBe(
    404,
  );
  expect(
    (await request.get("/api/service/intake-document/" + intake.id)).status(),
  ).toBe(404);
});

test("saved intake survives extraction failure and permits audited manual continuation", async ({
  page,
}) => {
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  const response = await page.request.post("/api/service/intake", {
    multipart: {
      category: "DEED",
      subtype: "SAF_KABALA",
      file: {
        name: "synthetic.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync(".local/fixtures/DOC-KH-001.pdf"),
      },
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const intake = await response.json();
  const invalid = await page.request.post(
    "/api/service/intake-extract/" + intake.id,
    { data: { pages: [], text: "" } },
  );
  expect(invalid.status()).toBe(400);
  await page.goto("/admin");
  await page.evaluate(
    (id) => sessionStorage.setItem("bs-intake-id", id),
    intake.id,
  );
  await page.getByTestId("locale-en").click();
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(
    page.getByRole("link", { name: "View original document" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry extraction" }),
  ).toBeEnabled();
  const saved = await (
    await page.request.get("/api/service/intake/" + intake.id)
  ).json();
  expect(saved.status).toBe("UPLOADED");
  const confirmed = await page.request.post(
    "/api/service/intake-confirm/" + intake.id,
    {
      data: {
        land: {
          district: "Synthetic District",
          upazila: "Synthetic Upazila",
          mouza: "Synthetic Mouza",
          jl_number: "",
          dag_number: "207",
          current_khatian_no: "",
          total_area_decimals: 20,
        },
        reason: "Manual confirmation after invalid extraction input",
      },
    },
  );
  expect(confirmed.ok(), await confirmed.text()).toBeTruthy();
  const result = await confirmed.json();
  const bundle = await (
    await page.request.get("/api/service/land/" + result.unique_land_id)
  ).json();
  expect(bundle.documents[0].verification_status).toBe("PENDING");
  expect(bundle.documents[0].official_number).toBeNull();
});
