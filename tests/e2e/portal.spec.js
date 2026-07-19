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

test("login is the default auth flow and registration is student-only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Login" }).first().click();
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await expect(page.getByLabel("Matricule / Staff Name")).toHaveAttribute("placeholder", "e.g. Uba23C001");
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByLabel("Remember me on this device")).toBeVisible();
  await page.getByRole("link", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Student Registration" })).toBeVisible();
  await expect(page.getByLabel("Department")).toContainText("Accounting and Finance");
  await expect(page.getByText("staff code", { exact: false })).toHaveCount(0);
});

test("a valid hidden staff code entered at login opens dedicated registration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Login" }).first().click();
  await page.getByLabel("Matricule / Staff Name").fill("STF-ABCD-2345");
  await page.getByLabel("Password").fill("TemporaryPass1");
  await page.getByRole("button", { name: "Login" }).last().click();
  await expect(page).toHaveURL("/staff-register?code=STF-ABCD-2345");
  await expect(page.getByRole("heading", { name: "Staff Registration" })).toBeVisible();
  await expect(page.getByLabel("Position")).toBeVisible();
  await expect(page.getByLabel("Confirm Password")).toBeVisible();
});

test("students can choose a forum username and optionally mark media view once", async ({ page }) => {
  const studentSession = { token: "test", viewRole: "student", user: { id: "student-1", role: "student", name: "Aisha Khan", matricule: "Uba23C001", department: "Marketing", forumAlias: null } };
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: studentSession, candidates: [], channels: ["General", "Marketing"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/forums/profile", async (route) => route.fulfill({ json: { session: { ...studentSession, user: { ...studentSession.user, forumAlias: "LedgerLion" } }, candidates: [], channels: ["General", "Marketing"] } }));
  await page.route("**/api/forums/**/messages", async (route) => route.fulfill({ json: { channel: "General", messages: [], settings: { links_enabled: 0, images_enabled: 1, audio_enabled: 1, suspended: 0 }, profile: { alias: "", usingAlias: false } } }));

  await page.goto("/forums");
  await page.getByRole("button", { name: "Forum identity" }).click();
  await page.getByLabel("Use another username").check();
  await page.getByLabel("Forum username").fill("LedgerLion");
  await page.getByRole("button", { name: "Save identity" }).click();

  await page.locator('input[type="file"][accept^="image/"]').setInputFiles({ name: "notice.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });
  await expect(page.getByText("notice.png", { exact: true })).toBeVisible();
  await expect(page.getByLabel("View once")).not.toBeChecked();
});

test("a student can mark their missing item as found", async ({ page }) => {
  const studentSession = { token: "test", viewRole: "student", user: { id: "student-1", role: "student", name: "Aisha Khan", matricule: "Uba23C001", department: "Marketing" } };
  const active = { id: "item-1", type: "LOST", title: "Black Calculator", location: "Amphi B", description: "Casio calculator", contact: "681000111", contact_preference: "phone", status: "active", user_id: "student-1", owner_name: "Aisha Khan" };
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: studentSession, candidates: [], channels: ["General", "Marketing"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/lost-found", async (route) => route.fulfill({ json: { items: [active] } }));
  await page.route("**/api/lost-found/item-1", async (route) => route.fulfill({ json: { items: [{ ...active, status: "resolved", expires_at: new Date(Date.now() + 3600000).toISOString() }] } }));

  await page.goto("/lost-found");
  await page.getByRole("button", { name: "Mark as Found" }).click();
  await expect(page.getByText(/Removes in/)).toBeVisible();
  await page.getByRole("button", { name: "Add Item" }).click();
  await expect(page.getByLabel("Report type")).toContainText("Missing item");
});

test("the portal publishes installable PWA metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  await expect(manifest.json()).resolves.toMatchObject({ name: "HICM Portal", display: "standalone", start_url: "/" });
});
