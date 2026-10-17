import { test, expect } from "@playwright/test";
test("Bangla is default and English selection persists across navigation, reload and server render", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(
    page.getByRole("link", { name: "নাগরিক সেবা", exact: true }),
  ).toBeVisible();
  await page.getByTestId("locale-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      name: "Keep land records clear. Make informed decisions.",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Citizen services", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify before you buy" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("locale-en")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const cookie = (await context.cookies()).find((c) => c.name === "bs-locale");
  expect(cookie?.value).toBe("en");
  const response = await page.request.get("/verify");
  expect(await response.text()).toContain('<html lang="en">');
  expect(errors).toEqual([]);
});
test("switching language preserves form inputs and translates an existing validation message", async ({
  page,
}) => {
  await page.goto("/register");
  await page.locator("input[name=name]").fill("রহিমা বেগম");
  await page.locator("input[name=email]").fill("synthetic@example.com");
  await page.locator("input[name=password]").fill("ExamplePass123!");
  await page.locator("input[name=confirm]").fill("DifferentPass123!");
  await page.getByRole("button", { name: "নিবন্ধন করুন", exact: true }).click();
  await expect(page.locator(".auth-wrap .alert.error")).toHaveText(
    "পাসওয়ার্ড দুটি মিলছে না",
  );
  await page.getByTestId("locale-en").click();
  await expect(
    page.getByRole("heading", { name: "Create a citizen account" }),
  ).toBeVisible();
  await expect(page.locator(".auth-wrap .alert.error")).toHaveText(
    "Passwords do not match",
  );
  await expect(page.locator("input[name=name]")).toHaveValue("রহিমা বেগম");
  await expect(page.locator("input[name=email]")).toHaveValue(
    "synthetic@example.com",
  );
  await expect(page.locator("input[name=password]")).toHaveValue(
    "ExamplePass123!",
  );
  await page.getByTestId("locale-bn").click();
  await expect(page.locator(".auth-wrap .alert.error")).toHaveText(
    "পাসওয়ার্ড দুটি মিলছে না",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("English reports translate evidence, history, document labels and print view while preserving record data", async ({
  page,
}) => {
  await page.goto("/verify/LND-MOCK-001");
  await expect(page.getByTestId("risk-indicator-score")).toHaveText("60");
  await page.getByTestId("locale-en").click();
  await expect(
    page.getByRole("heading", { name: "Integrated land record", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("risk-indicator-score")).toHaveText("60");
  await expect(page.getByTestId("evidence-panel")).toContainText(
    "Excess or overlapping sale",
  );
  await expect(page.getByTestId("evidence-panel")).toContainText("502/2021");
  await expect(page.getByTestId("evidence-panel")).toContainText(
    "Rahima Begum",
  );
  await expect(page.getByTestId("external-checks-panel")).toContainText(
    "Not Checked / Data Unavailable",
  );
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(page.getByTestId("category-khatian")).toContainText("Khatian");
  await page.getByRole("tab", { name: "Land history", exact: true }).click();
  await expect(page.getByTestId("timeline-event-card")).toHaveCount(5);
  await expect(
    page.getByText("Latest recorded party:", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Verify document", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Compare your copy of a deed" }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Analysis and evidence", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("risk-indicator-score")).toBeVisible();
  await expect(
    page.getByText("Estimated Risk Score (Rule-Based Indicator)", {
      exact: true,
    }),
  ).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: ".local/report-en-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/report-en-mobile.png",
    fullPage: true,
  });
});
test("officer actions, review fields and mutation statuses use the chosen locale", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByTestId("locale-en").click();
  await page.getByTestId("demo-officer-login").click();
  await expect(
    page.getByRole("heading", { name: "Land record management" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create land record" }).click();
  await page.locator("input[name=mouza]").fill("অপরিবর্তিত নমুনা");
  await page.getByTestId("dialog-locale-bn").click();
  await expect(page.locator("input[name=mouza]")).toHaveValue(
    "অপরিবর্তিত নমুনা",
  );
  await page.getByRole("button", { name: "বন্ধ করুন", exact: true }).click();
  await page.getByTestId("locale-en").click();
  await page.goto("/admin/land/LND-MOCK-001");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByTestId("review-doc-DOC-KH-001").click();
  await expect(
    page.getByText("Review the extracted fields", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("[data-testid=edit-field-official_number]"),
  ).toHaveValue("RS-118");
  await page.getByRole("button", { name: "Close review", exact: true }).click();
  await page.goto("/admin/mutations");
  await expect(
    page.getByText("Hearing required", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Deed–mutation conflict", { exact: false }).first(),
  ).toBeVisible();
  await page.getByTestId("locale-bn").click();
  await expect(
    page.getByText("শুনানি প্রয়োজন", { exact: true }).first(),
  ).toBeVisible();
});
