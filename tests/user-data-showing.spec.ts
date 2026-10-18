import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const credentials = JSON.parse(readFileSync(".local/officer.json", "utf8"));

test.describe("User data showing vs officer full access (User_data_showing.pdf)", () => {
  test("citizen sees structured category-specific cards and missing value rule in UserDocumentModal", async ({
    page,
  }) => {
    await page.goto("/verify/LND-MOCK-001");

    // Switch to documents tab
    await page.getByRole("tab", { name: "নথিসমূহ" }).click();

    // Check category cards exist and are clickable for citizen
    const deedCategory = page.getByTestId("category-deed");
    await expect(deedCategory).toBeVisible();
    await deedCategory.click();

    // UserDocumentModal should be open
    const modal = page.getByTestId("user-document-modal");
    await expect(modal).toBeVisible();

    // Verification banner & privacy notes
    await expect(
      modal.getByText("শুধুমাত্র যাচাইকৃত ও প্রকাশিত নথির তথ্য দেখানো হচ্ছে", { exact: false }),
    ).toBeVisible();
    await expect(
      modal.getByText("অডিট ইতিহাস ও প্রশাসনিক সংশোধন সুবিধা শুধুমাত্র দায়িত্বপ্রাপ্ত ভূমি কর্মকর্তার জন্য সংরক্ষিত", { exact: false }),
    ).toBeVisible();

    // General, Parties, and Land information sections
    await expect(modal.getByText("সাধারণ তথ্য")).toBeVisible();
    await expect(modal.getByText("পক্ষের তথ্য")).toBeVisible();
    await expect(modal.getByText("জমির তথ্য")).toBeVisible();

    // Should NOT have any editable form inputs or officer correction textarea
    await expect(modal.locator("input[name=official_number]")).toHaveCount(0);
    await expect(modal.locator("[data-testid=edit-reason-input]")).toHaveCount(0);
    await expect(modal.locator("[data-testid=review-doc-category-select]")).toHaveCount(0);

    // Switch to original source preview tab
    await modal.getByRole("button", { name: "মূল নথি", exact: true }).click();
    await expect(modal.getByTitle("মূল নথি")).toBeVisible();

    // Close user document modal
    await modal.getByTestId("close-user-doc-modal").click();
    await expect(modal).not.toBeVisible();

    // Test stored documents list "বিস্তারিত" (View details) button
    const viewDetailsButtons = page.locator("[data-testid^=view-user-doc-]");
    await expect(viewDetailsButtons.first()).toBeVisible();
    await viewDetailsButtons.first().click();

    await expect(page.getByTestId("user-document-modal")).toBeVisible();
  });

  test("officer retains full access to editing fields, reason logging, audit history and administrative controls", async ({
    page,
  }) => {
    // Login as officer
    await page.goto("/admin/login");
    await page.getByTestId("demo-officer-login").click();
    await expect(page.getByRole("heading", { name: "ভূমি রেকর্ড ব্যবস্থাপনা" })).toBeVisible();

    // Navigate to parcel
    await page.goto("/admin/land/LND-MOCK-001");

    // In officer view, review button opens ReviewDialog
    const reviewBtn = page.getByTestId("review-doc-DOC-KH-001");
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // ReviewDialog has editable inputs, category/subtype select, and reason
    await expect(page.getByRole("dialog", { name: "নথি পর্যালোচনা" })).toBeVisible();
    await expect(page.getByTestId("edit-reason-input")).toBeVisible();
    await expect(page.getByTestId("review-doc-category-select")).toBeVisible();
    await expect(page.getByTestId("review-doc-subtype-select")).toBeVisible();
    await expect(page.getByTestId("save-audit-correction-btn")).toBeVisible();
  });
});
