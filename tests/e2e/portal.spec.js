import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: null, candidates: [], channels: ["General", "Level-200 (Year 1)", "Level-300 (Year 2)", "Level-400 (Year 3)"] } }));
});

test("renders the portal and responsive navigation without overlap", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "HICM Portal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Login or register" })).toBeVisible();
  if (testInfo.project.name === "mobile") await expect(page.getByRole("navigation", { name: "Primary mobile navigation" })).toBeVisible();
  else await expect(page.getByRole("navigation", { name: "Primary mobile navigation" })).toBeHidden();
});

test("supports student and staff authentication modes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Login or register" }).click();
  await expect(page.getByRole("heading", { name: "Login / Register" })).toBeVisible();
  await expect(page.getByText("Matricule", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "staff", exact: true }).click();
  await expect(page.getByText("Staff Access Code", { exact: false })).toBeVisible();
  await expect(page.getByPlaceholder("STF-XXXX-XXXX")).toBeVisible();
});

