import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: null, candidates: [], channels: ["General"] } }));
  await page.route("**/api/announcements", async (route) => route.fulfill({ json: { announcements: [{ id: "ann-1", title: "Registration week", body: "Course registration opens Monday.", author: "Academic Affairs", status: "published", created_at: "2026-07-19T08:00:00.000Z" }] } }));
  await page.route("**/api/auth/resolve", async (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({ json: { mode: String(body.credential || "").startsWith("STF-") ? "staff-registration" : "student" } });
  });
});

test("signed-out users see announcements but no feature navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "HICM Portal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "School Announcements" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Registration week" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary mobile navigation" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Academics" })).toHaveCount(0);
});

test("protected feature URLs return signed-out users to the login screen", async ({ page }) => {
  await page.goto("/notes");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "School Announcements" })).toBeVisible();
});

test("staff code pasted in student login opens dedicated registration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Login or register" }).click();
  await expect(page.getByRole("heading", { name: "Student access" })).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Uba23C001 or staff code")).toBeVisible();
  await expect(page.getByPlaceholder("e.g. 6XX XXX XXX")).toBeVisible();
  await page.getByLabel("Full Name").fill("New Lecturer");
  await page.getByLabel("Matricule").fill("STF-ABCD-2345");
  await expect(page).toHaveURL("/staff-register?code=STF-ABCD-2345");
  await expect(page.getByRole("heading", { name: "Staff Registration" })).toBeVisible();
  await expect(page.getByLabel("Position")).toBeVisible();
  await expect(page.getByLabel("Confirm Password")).toBeVisible();
});
