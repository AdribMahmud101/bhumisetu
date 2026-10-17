import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("abort clears manual details and prevents a late upload from restoring the abandoned draft", async ({
  page,
}) => {
  const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));
  expect(
    (await page.request.post("/api/service/login", { data: credentials })).ok(),
  ).toBeTruthy();
  await page.goto("/admin");
  await page.getByTestId("locale-en").click();
  await page.getByRole("button", { name: "Create land record" }).click();
  await page
    .getByRole("button", { name: "Enter parcel details manually" })
    .click();
  await page.locator("input[name=district]").fill("Abandoned details");
  for (const [key, value] of Object.entries({
    upazila: "Test",
    mouza: "Test",
    dag_number: "207",
    total_area_decimals: "20",
  }))
    await page.locator(`input[name=${key}]`).fill(value);
  await page.route("**/api/service/create", (route) =>
    route.fulfill({ status: 400, json: { error: "Test save rejection" } }),
  );
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Test save rejection");
  await expect(page.getByTestId("abort-intake")).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("abort-intake")).toBeInViewport();
  await page.getByTestId("abort-intake").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(page.locator("input[type=file]")).toBeVisible();
  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/service/intake", async (route) => {
    await paused;
    await route.fulfill({
      json: { id: "00000000-0000-4000-8000-000000000001", status: "UPLOADED" },
    });
  });
  await page
    .locator("input[type=file]")
    .setInputFiles(".local/fixtures/DOC-KH-001.pdf");
  const uploading = page.waitForRequest(
    (r) => r.url().endsWith("/api/service/intake") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Upload and extract" }).click();
  await uploading;
  await expect(page.getByTestId("abort-intake")).toBeEnabled();
  await page.getByTestId("abort-intake").click();
  const completed = page.waitForResponse((r) =>
    r.url().endsWith("/api/service/intake"),
  );
  release();
  await completed;
  await page.getByRole("button", { name: "Create land record" }).click();
  await expect(page.locator("input[type=file]")).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("bs-intake-id")),
  ).toBeNull();
  await page.getByTestId("dialog-locale-bn").click();
  await expect(page.getByTestId("abort-intake")).toHaveText("বাতিল করুন");
});
