import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const accounts = JSON.parse(readFileSync(".local/demo-accounts.json", "utf8"));
test("citizen one-click login creates citizen session without officer access", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("demo-citizen-login").click();
  await expect(page).toHaveURL(/\/verify$/);
  const session = await (await page.request.get("/api/service/session")).json();
  expect(session.authenticated).toBe(true);
  expect(session.role).toBe("citizen");
  expect(session.demo).toBe(true);
  expect((await page.request.get("/api/service/mutations")).status()).toBe(401);
  expect(
    (await page.request.post("/api/service/create", { data: {} })).status(),
  ).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.screenshot({
    path: ".local/citizen-login-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("officer one-click login opens administrative workspace", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByTestId("demo-officer-login").click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "ভূমি রেকর্ড ব্যবস্থাপনা" }),
  ).toBeVisible();
  const session = await (await page.request.get("/api/service/session")).json();
  expect(session.role).toBe("officer");
  expect(session.demo).toBe(true);
  expect((await page.request.get("/api/service/mutations")).ok()).toBeTruthy();
});
test("normal citizen password login works and cannot use officer entry", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("input[name=email]").fill(accounts.citizen.email);
  await page.locator("input[name=password]").fill(accounts.citizen.password);
  await page
    .getByRole("button", { name: "ইমেইল দিয়ে লগইন", exact: true })
    .click();
  await expect(page).toHaveURL(/\/verify$/);
  const denied = await page.request.post("/api/service/login", {
    data: { ...accounts.citizen, role: "officer" },
  });
  expect(denied.ok()).toBeFalsy();
});
test("normal officer password login remains available", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("input[name=email]").fill(accounts.officer.email);
  await page.locator("input[name=password]").fill(accounts.officer.password);
  await page
    .getByRole("button", { name: "ইমেইল দিয়ে লগইন", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
});
test("registration form validates confirmation and server blocks officer self-registration", async ({
  page,
}) => {
  await page.goto("/register");
  await page.locator("input[name=name]").fill("Synthetic Citizen");
  await page.locator("input[name=email]").fill("registration-test@example.com");
  await page.locator("input[name=password]").fill("ExamplePass123!");
  await page.locator("input[name=confirm]").fill("DifferentPass123!");
  await page.getByRole("button", { name: "নিবন্ধন করুন", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "পাসওয়ার্ড দুটি মিলছে না" }),
  ).toContainText("পাসওয়ার্ড দুটি মিলছে না");
  const denied = await page.request.post("/api/service/register", {
    data: {
      name: "Synthetic Citizen",
      email: "registration-test@example.com",
      password: "ExamplePass123!",
      role: "officer",
    },
  });
  expect(denied.ok()).toBeFalsy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local/registration-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
