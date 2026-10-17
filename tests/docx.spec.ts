import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { strToU8 } from "fflate";
import { fixtureDocx, fixtureText, DOCX_TYPE } from "./fixtures/docx";
const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
const parcel = {
  district: "Synthetic District",
  upazila: "Synthetic Upazila",
  mouza: "Synthetic Mouza",
  jl_number: "12",
  dag_number: "207",
  current_khatian_no: "RS-118",
  total_area_decimals: 20,
};
test("DOCX intake extracts real text, confirms privately and previews the original safely", async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  await page.getByTestId("locale-en").click();
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(page.locator("input[type=file]")).toHaveAttribute(
    "accept",
    /\.docx/,
  );
  const buffer = Buffer.from(fixtureDocx(fixtureText));
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "synthetic-record.docx",
      mimeType: DOCX_TYPE,
      buffer,
    });
  await page.getByRole("button", { name: "Upload and extract" }).click();
  await expect(
    page.getByText("Extraction complete — review the results below", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 100000 });
  await expect(page.getByRole("dialog")).toContainText("RS-118");
  for (const [key, value] of Object.entries(parcel))
    await page.locator(`input[name=${key}]`).fill(String(value));
  await page
    .locator("textarea[name=reason]")
    .fill("Confirmed against synthetic DOCX source");
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/intake-confirm/") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirm details and review document" })
    .click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
  const result = await response.json();
  await expect(page).toHaveURL(new RegExp(result.unique_land_id));
  const bundle = await (
    await page.request.get("/api/service/land/" + result.unique_land_id)
  ).json();
  const doc = bundle.documents[0];
  expect(doc.mime_type).toBe(DOCX_TYPE);
  expect(doc.file_path).toMatch(/\.docx$/);
  expect(doc.official_number).toBe("RS-118");
  expect(doc.area_decimals).toBe(20);
  expect(doc.verification_status).toBe("PENDING");
  expect(bundle.land.is_finalized).toBe(false);
  expect((await request.get("/api/service/document/" + doc.id)).status()).toBe(
    404,
  );
  const original = await page.request.get("/api/service/document/" + doc.id);
  expect(original.headers()["content-type"]).toContain(DOCX_TYPE);
  expect(await original.body()).toEqual(buffer);
  await page.getByTestId("review-doc-" + doc.doc_code).click();
  await expect(page.getByTestId("docx-preview")).toContainText(
    "Recorded owner: Abdul Karim",
    { timeout: 20000 },
  );
  await expect(page.getByTestId("docx-preview").locator("pre")).toContainText(
    "RS-118",
  );
  await page.screenshot({ path: ".local/docx-review.png", fullPage: true });
});
test("image-only DOCX uses embedded scans for AI in the existing parcel uploader", async ({
  page,
}) => {
  test.setTimeout(150000);
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  const created = await page.request.post("/api/service/create", {
    data: parcel,
  });
  const land = await created.json();
  await page.goto("/admin/land/" + land.unique_land_id);
  await page.getByTestId("locale-en").click();
  const imageData = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 700;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1000, 700);
    ctx.fillStyle = "black";
    ctx.font = "30px sans-serif";
    [
      "FICTIONAL LAND RECORD — TEST ONLY",
      "RS Khatian: RS-118",
      "Dag number: 207",
      "Recorded land area: 20 decimals",
      "Recorded owner: Abdul Karim",
      "Document date: 2018-01-01",
    ].forEach((line, index) => ctx.fillText(line, 40, 80 + index * 80));
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const buffer = Buffer.from(
    fixtureDocx('<w:p><w:r><a:blip r:embed="rId2"/></w:r></w:p>', {
      "word/_rels/document.xml.rels": strToU8(
        '<Relationships><Relationship Id="rId2" Type="image" Target="media/scan.png"/></Relationships>',
      ),
      "word/media/scan.png": new Uint8Array(Buffer.from(imageData, "base64")),
    }),
  );
  const extractionPromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/service/extract/") &&
      r.request().method() === "POST",
    { timeout: 120000 },
  );
  await page
    .getByLabel("Upload documents")
    .setInputFiles({ name: "embedded-scan.docx", mimeType: DOCX_TYPE, buffer });
  const extraction = await extractionPromise;
  expect(extraction.ok(), await extraction.text()).toBeTruthy();
  const result = await extraction.json();
  expect(result.fields.official_number).toBe("RS-118");
  expect(result.fields.area_decimals).toBe(20);
  const stored = await (
    await page.request.get("/api/service/land/" + land.unique_land_id)
  ).json();
  expect(stored.documents[0].mime_type).toBe(DOCX_TYPE);
  await page.getByTestId("review-doc-" + stored.documents[0].doc_code).click();
  await expect(page.getByTestId("docx-preview").locator("img")).toBeVisible({
    timeout: 20000,
  });
});
test("server rejects malformed DOCX uploads before storage", async ({
  page,
}) => {
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  for (const [name, buffer] of [
    ["fake.docx", Buffer.from("not a zip")],
    ["empty.docx", Buffer.from(fixtureDocx(""))],
  ] as const) {
    const response = await page.request.post("/api/service/intake", {
      multipart: {
        category: "KHATIAN",
        subtype: "RS",
        file: { name, mimeType: DOCX_TYPE, buffer },
      },
    });
    expect(response.status()).toBe(400);
  }
});
