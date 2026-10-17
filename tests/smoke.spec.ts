import { test, expect } from "@playwright/test";
test("app and health endpoint are reachable", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Clear records. Better land decisions." })).toBeVisible();
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: "ok", service: "bhumisetu" });
});
