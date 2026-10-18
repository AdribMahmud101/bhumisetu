import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
for (const [category, subtype] of [
  ["KHATIAN", "RS"],
  ["PORCHA", "GENERAL"],
  ["DEED", "OTHER"],
  ["MUTATION", "PURCHASE"],
]) {
  test(`${category} blank extraction fields are editable, preserved on language/focus changes and audited`, async ({
    page,
  }) => {
    expect(
      (
        await page.request.post("/api/service/login", { data: credentials })
      ).ok(),
    ).toBeTruthy();
    const uploaded = await page.request.post("/api/service/intake", {
      multipart: {
        category,
        subtype,
        file: {
          name: "synthetic-manual-review.pdf",
          mimeType: "application/pdf",
          buffer: readFileSync(".local/fixtures/DOC-KH-001.pdf"),
        },
      },
    });
    expect(uploaded.ok()).toBeTruthy();
    const intake = await uploaded.json();
    await page.goto("/admin");
    await page.getByTestId("locale-en").click();
    await page.evaluate(
      (id) => sessionStorage.setItem("bs-intake-id", id),
      intake.id,
    );
    await page.getByRole("button", { name: "Create land record" }).click();
    await page
      .getByRole("button", { name: "Enter parcel details manually" })
      .click();
    const expectedCount = ["KHATIAN", "PORCHA"].includes(category) ? 7 : 9;
    await expect(
      page.locator('[data-testid^="intake-edit-field-"]'),
    ).toHaveCount(expectedCount);
    await page
      .getByTestId("intake-edit-field-official_number")
      .fill("REVIEW-" + category);
    await page
      .getByTestId("intake-edit-field-buyer_or_current_owner")
      .fill("নমুনা মালিক");
    await page.getByTestId("intake-edit-field-area_decimals").fill("12");
    await page.getByTestId("dialog-locale-bn").click();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByTestId("intake-edit-field-official_number"),
    ).toHaveValue("REVIEW-" + category);
    await page.getByTestId("dialog-locale-en").click();
    for (const [key, value] of Object.entries({
      district: "Synthetic District",
      upazila: "Synthetic Upazila",
      mouza: "Synthetic Mouza",
      dag_number: "207",
      total_area_decimals: "20",
    }))
      await page.locator(`input[name=${key}]`).fill(value);
    const reason = "Officer confirmed land and document fields during source intake";
    await expect(page.locator("textarea[name=reason]")).toHaveCount(0);
    const confirmedPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/intake-confirm/") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Confirm details and review document" })
      .click();
    const confirmed = await confirmedPromise;
    expect(confirmed.ok(), await confirmed.text()).toBeTruthy();
    const result = await confirmed.json();
    const bundle = await (
      await page.request.get("/api/service/land/" + result.unique_land_id)
    ).json();
    expect(bundle.documents[0].official_number).toBe("REVIEW-" + category);
    expect(bundle.documents[0].buyer_or_current_owner).toBe("নমুনা মালিক");
    expect(bundle.documents[0].area_decimals).toBe(12);
    expect(bundle.documents[0].verification_status).toBe("PENDING");
    expect(bundle.land.is_finalized).toBe(false);
    const logs = await (
      await page.request.get("/api/service/audit/" + result.document_id)
    ).json();
    expect(
      logs.some(
        (entry: any) =>
          entry.field_name === "official_number" &&
          entry.new_value === "REVIEW-" + category &&
          entry.reason === reason,
      ),
    ).toBe(true);
  });
}
test("preprocessing runs automatically, bounds image payloads and records what changed", async ({
  page,
}) => {
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  await page.getByTestId("locale-en").click();
  await page.getByRole("button", { name: "Create land record" }).click();
  const content = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 700;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "white";
    c.fillRect(0, 0, 1000, 700);
    c.fillStyle = "black";
    c.font = "30px sans-serif";
    c.fillText("FICTIONAL KHATIAN RS-118", 40, 70);
    c.fillText("Dag 207, recorded area 20 decimals", 40, 140);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.route("**/api/service/intake-extract/*", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.preprocessing.enhanced).toBe(true);
    expect(body.preprocessing.pages).toHaveLength(1);
    expect(body.preprocessing.pages[0].rotation).toBe(0);
    expect(body.pages[0].length).toBeLessThan(2500000);
    await route.fulfill({
      status: 400,
      json: { error: "Synthetic extraction interception" },
    });
  });
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "preprocessing.png",
      mimeType: "image/png",
      buffer: Buffer.from(content, "base64"),
    });
  const intercepted = page.waitForResponse(
    (r) =>
      r.url().includes("/intake-extract/") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Upload and extract" }).click();
  await intercepted;
  await page.getByText("Preview images sent to OCR", { exact: true }).click();
  await expect(page.locator(".ocr-preview img")).toBeVisible();
});
