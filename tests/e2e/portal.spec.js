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
  await expect(page.locator("header").first()).toHaveCSS("position", "sticky");
  await expect(page.locator("header").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
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
  await expect(page.getByLabel("Matricule")).toHaveAttribute("placeholder", "e.g. Uba23C001");
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
  await page.getByLabel("Matricule").fill("STF-ABCD-2345");
  await page.getByLabel("Password").fill("TemporaryPass1");
  await page.getByRole("button", { name: "Login" }).last().click();
  await expect(page).toHaveURL("/staff-register?code=STF-ABCD-2345");
  await expect(page.getByRole("heading", { name: "Staff Registration" })).toBeVisible();
  await expect(page.getByLabel("Position")).toBeVisible();
  await expect(page.getByLabel("Confirm Password")).toBeVisible();
});

test("students can resize and search chats, open long-press actions, and delete their messages", async ({ page }) => {
  const studentSession = { token: "test", viewRole: "student", user: { id: "student-1", role: "student", name: "Aisha Khan", matricule: "Uba23C001", department: "Marketing", forumAlias: null, forumDensity: "compact" } };
  const ownMessage = { id: "msg-1", channel: "General", user_id: "student-1", author: "Aisha Khan", body: "Budget meeting is at noon", message_type: "text", created_at: "2026-07-19T09:00:00.000Z" };
  let messageDeleted = false;
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: studentSession, candidates: [], channels: ["General", "Marketing"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/forums/profile", async (route) => route.fulfill({ json: { session: { ...studentSession, user: { ...studentSession.user, forumAlias: "LedgerLion" } }, candidates: [], channels: ["General", "Marketing"] } }));
  await page.route("**/api/forums/messages/msg-1", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    messageDeleted = true;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/forums/*/messages*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q")?.toLowerCase() || "";
    const messages = !messageDeleted && (!query || ownMessage.body.toLowerCase().includes(query)) ? [ownMessage] : [];
    return route.fulfill({ json: { channel: "General", messages, settings: { links_enabled: 0, images_enabled: 1, audio_enabled: 1, suspended: 0 }, profile: { alias: "", usingAlias: false } } });
  });

  await page.goto("/forums");
  await expect(page.getByLabel("Search messages")).toBeVisible();
  await page.getByLabel("Search messages").fill("budget");
  await expect(page.getByText("Budget meeting is at noon")).toBeVisible();
  await page.getByLabel("Search messages").fill("library");
  await expect(page.getByText("No messages match your search.")).toBeVisible();
  await page.getByRole("button", { name: "Clear message search" }).click();
  await expect(page.getByText("Budget meeting is at noon")).toBeVisible();
  const ownBubble = page.locator("article").filter({ hasText: "Budget meeting is at noon" });
  await expect(ownBubble.locator("time")).toBeVisible();
  await ownBubble.getByRole("button", { name: "Message actions" }).click();
  await ownBubble.getByRole("button", { name: "Delete message" }).click();
  await expect(page.getByText("Budget meeting is at noon")).toHaveCount(0);

  await page.getByRole("button", { name: "Forum settings" }).click();
  await expect(page.getByText("Administrators can still identify", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Standard" }).click();
  await page.getByLabel("Use another username").check();
  await page.getByLabel("Forum username").fill("LedgerLion");
  await page.getByRole("button", { name: "Save", exact: true }).click();

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

test("staff can publish and manage notes and set an MCQ duration", async ({ page }) => {
  const staffSession = { token: "test", viewRole: "staff", user: { id: "staff-1", role: "staff", name: "Dr. Daniel Okoro", position: "Lecturer", forumAccess: true } };
  const note = { id: "note-1", owner_id: "staff-1", course_code: "ACC 204", course_title: "Financial Accounting", department: "Accounting and Finance", level: "Level 200", semester: "First Semester", academic_year: "2026/2027", lecturer_name: "Dr. Daniel Okoro", original_name: "accounting.pdf", status: "published", file_url: "/api/files/note/note-1", download_url: "/api/files/note/note-1?download=1" };
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: staffSession, candidates: [], channels: ["General"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/ai/ping", async (route) => route.fulfill({ json: { ok: true, status: 200, model: "openai/gpt-oss-120b" } }));
  await page.route("**/api/quizzes", async (route) => route.fulfill({ json: { quizzes: [] } }));
  await page.route("**/api/notes", async (route) => route.fulfill({ json: { notes: route.request().method() === "POST" ? [note] : [] } }));

  await page.goto("/quiz");
  await expect(page.getByText("Groq connected: openai/gpt-oss-120b")).toBeVisible();
  await page.getByLabel("Course Code").fill("ACC 204");
  await page.getByLabel("Course Title").fill("Financial Accounting");
  await page.getByLabel("Department").selectOption("Accounting and Finance");
  await page.getByLabel("Level").selectOption("Level 200");
  await page.getByLabel("Semester").selectOption("First Semester");
  await page.getByLabel("Academic Year").fill("2026/2027");
  await page.locator('input[name="note"]').setInputFiles({ name: "accounting.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") });
  await page.getByRole("button", { name: "Publish Notes" }).click();
  await expect(page.getByText("ACC 204 - Financial Accounting")).toBeVisible();
  await expect(page.getByRole("button", { name: "Overwrite ACC 204" })).toBeVisible();

  await page.getByRole("button", { name: "Create MCQ Evaluation" }).click();
  await expect(page.getByLabel("Test Duration (minutes)")).toHaveValue("30");
  await page.getByLabel("Test Duration (minutes)").fill("45");
  await expect(page.getByLabel("Test Duration (minutes)")).toHaveValue("45");
});

test("a student evaluation starts a server-backed countdown and returns a score", async ({ page }) => {
  const studentSession = { token: "test", viewRole: "student", user: { id: "student-1", role: "student", name: "Aisha Khan", matricule: "Uba23C001", department: "Accounting and Finance" } };
  const activeAttempt = { id: "attempt-1", evaluationId: "quiz-1", title: "Accounting Test", courseCode: "ACC 204", status: "active", remainingSeconds: 120, score: null, totalMarks: null, questions: [{ id: "question-1", prompt: "Which statement balances?", options: ["Income", "Assets = Liabilities + Equity", "Cash only", "Expenses"], selectedOptionIndex: null }] };
  await page.route("**/api/session", async (route) => route.fulfill({ json: { session: studentSession, candidates: [], channels: ["General", "Accounting and Finance"] } }));
  await page.route("**/api/notifications", async (route) => route.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/quizzes?*", async (route) => route.fulfill({ json: { quizzes: [{ id: "quiz-1", title: "Accounting Test", course_code: "ACC 204", question_count: 1, duration_seconds: 120 }] } }));
  await page.route("**/api/evaluations/quiz-1/start", async (route) => route.fulfill({ json: { attempt: activeAttempt } }));
  await page.route("**/api/evaluation-attempts/attempt-1/answers", async (route) => route.fulfill({ json: { saved: true } }));
  await page.route("**/api/evaluation-attempts/attempt-1/submit", async (route) => route.fulfill({ json: { attempt: { ...activeAttempt, status: "submitted", remainingSeconds: 0, score: 1, totalMarks: 1, questions: [{ ...activeAttempt.questions[0], selectedOptionIndex: 1, correctOptionIndex: 1, explanation: "The accounting equation must balance." }] } } }));

  await page.goto("/quiz");
  await page.getByLabel("Course code").fill("ACC 204");
  await page.getByRole("button", { name: "Find Evaluation" }).click();
  await page.getByRole("button", { name: /Accounting Test/ }).click();
  await expect(page.getByText("02:00")).toBeVisible();
  await page.getByLabel("Assets = Liabilities + Equity").check();
  await page.getByRole("button", { name: "Submit Evaluation" }).click();
  await expect(page.getByText("Final score")).toBeVisible();
  await expect(page.getByText("1/1")).toBeVisible();
});

test("the portal publishes installable PWA metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  await expect(manifest.json()).resolves.toMatchObject({ name: "HICM Portal", display: "standalone", start_url: "/" });
});
