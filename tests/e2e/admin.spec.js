import { expect, test } from "@playwright/test";

const adminSession = { token: "test", viewRole: "staff", user: { id: "admin-1", role: "admin", name: "HICM Administrator", position: "Platform Administrator", phone: "000", forumAccess: true, moderationAccess: true } };

test("administrator can inspect metrics and issue access codes", async ({ page }) => {
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: adminSession, candidates: [], channels: ["General"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST" && path.endsWith("staff-codes")) return route.fulfill({ status: 201, json: { id: "code-1", code: "STF-ABCD-2345", expiresInHours: 24 } });
    if (path.endsWith("overview")) return route.fulfill({ json: { metrics: { users: 12, students: 9, staff: 3, openComplaints: 2, pendingPayments: 1, queuedAnalysis: 0, openForumReports: 0 } } });
    if (path.endsWith("users")) return route.fulfill({ json: { users: [] } });
    if (path.endsWith("staff-codes")) return route.fulfill({ json: { codes: [] } });
    if (path.endsWith("forum/reports")) return route.fulfill({ json: { reports: [] } });
    if (path.endsWith("analysis")) return route.fulfill({ json: { jobs: [] } });
    return route.fulfill({ json: { logs: [] } });
  });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  await expect(page.getByText("12", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Staff Codes" }).click();
  await expect(page.getByText("Issue a single-use registration code")).toBeVisible();
  await page.getByRole("button", { name: "24 hours" }).click();
});
