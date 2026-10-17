import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("legacy failed intake retries on open, displays extracted data and can start a new upload", async ({
  page,
}) => {
  test.setTimeout(150000);
  const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  const upload = await page.request.post("/api/service/intake", {
    multipart: {
      category: "KHATIAN",
      subtype: "RS",
      file: {
        name: "resume-fixture.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync(".local/fixtures/DOC-KH-001.pdf"),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const intake = await upload.json();
  await page.goto("/admin");
  await page.getByTestId("locale-en").click();
  await page.evaluate(
    (id) => sessionStorage.setItem("bs-intake-id", id),
    intake.id,
  );
  // Simulate the saved legacy failure response; retry uses real stored source and AI.
  await page.route(
    "**/api/service/intake/" + intake.id,
    async (route) => {
      await route.fulfill({
        json: {
          ...intake,
          status: "FAILED",
          retry_recommended: true,
          extraction_error:
            '[{"code":"invalid_type","path":["based_on_deed"]}]',
        },
      });
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(
    page.getByRole("link", { name: "View original document" }),
  ).toBeVisible();
  await expect(page.locator("input[name=district]")).toHaveCount(0);
  await expect(
    page.getByText("Extraction complete — review the results below", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 100000 });
  await expect(
    page.getByTestId("intake-edit-field-official_number"),
  ).toHaveValue("RS-118");
  await page.locator("input[name=district]").fill("Preserved officer input");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("input[name=district]")).toHaveValue(
    "Preserved officer input",
  );
  await page
    .getByRole("button", { name: "Upload a different document" })
    .click();
  await expect(page.locator("input[type=file]")).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("bs-intake-id")),
  ).toBeNull();
});
