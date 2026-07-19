import { processAnalysisJob } from "../lib/analysis-job.js";

const CHANNELS = ["General", "Level-200 (Year 1)", "Level-300 (Year 2)", "Level-400 (Year 3)"];

const CANDIDATES = [
  { id: "ngalle", name: "Ngalle Prisca", post: "Student Union President", vision: "Transparent grants, safer transport, and faster academic support." },
  { id: "tambi", name: "Tambi Roland", post: "Student Union President", vision: "Reliable class reps, campus sports renewal, and open budget reports." },
  { id: "mina", name: "Mina Celeste", post: "Student Union President", vision: "Better lecture resources, mentorship circles, and inclusive student services." },
];

const sampleQuestions = [
  {
    question: "Which academic practice best reduces plagiarism risk?",
    options: ["Copying trusted sources", "Citing and paraphrasing correctly", "Submitting without references", "Using only one article"],
    answer: 1,
  },
  {
    question: "What is the first step in a formal research project?",
    options: ["Printing questionnaires", "Choosing a topic and problem statement", "Writing acknowledgements", "Designing the cover page"],
    answer: 1,
  },
  {
    question: "Which section usually explains how data was collected?",
    options: ["Methodology", "Dedication", "Bibliography", "Appendix"],
    answer: 0,
  },
  {
    question: "A valid MCQ should normally have:",
    options: ["Only one plausible option", "A clear stem and one best answer", "No feedback", "Answers hidden in the question"],
    answer: 1,
  },
  {
    question: "Continuous assessment is mainly used to:",
    options: ["Replace attendance", "Track progress during the course", "Avoid final exams", "Assign matricule numbers"],
    answer: 1,
  },
  {
    question: "Bio-data corrections usually concern:",
    options: ["Exam hall paint", "Student identity records", "Library shelves", "Lecture projector cables"],
    answer: 1,
  },
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "");

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is not configured." }, 500);
    await ensureSchema(env.DB);
    await seedData(env.DB);

    if (route === "session" && request.method === "GET") return await getSessionResponse(request, env);
    if (route === "auth" && request.method === "POST") return await authenticate(request, env);
    if (route === "logout" && request.method === "POST") return await logout(request, env);
    if (route === "session/role" && request.method === "PATCH") return await updateViewRole(request, env);
    if (route === "account/password" && request.method === "PATCH") return await changePassword(request, env);
    if (route === "admin/bootstrap" && request.method === "POST") return await bootstrapAdmin(request, env);
    if (route === "admin/overview" && request.method === "GET") return await adminOverview(request, env);
    if (route === "admin/users" && request.method === "GET") return await adminUsers(request, env);
    if (route === "admin/staff-codes" && request.method === "GET") return await listStaffCodes(request, env);
    if (route === "admin/staff-codes" && request.method === "POST") return await createStaffCode(request, env);
    if (/^admin\/staff-codes\/[^/]+$/.test(route) && request.method === "PATCH") return await revokeStaffCode(route, request, env);
    if (/^admin\/users\/[^/]+$/.test(route) && request.method === "PATCH") return await updateUserAdmin(route, request, env);
    if (route === "admin/forum/settings" && request.method === "PATCH") return await updateForumSettings(request, env);
    if (route === "admin/forum/reports" && request.method === "GET") return await listForumReports(request, env);
    if (/^admin\/forum\/reports\/[^/]+$/.test(route) && request.method === "PATCH") return await reviewForumReport(route, request, env);
    if (route === "admin/audit" && request.method === "GET") return await listAuditLogs(request, env);
    if (route === "admin/analysis" && request.method === "GET") return await listAnalysisAdmin(request, env);

    if (route === "notifications" && request.method === "GET") return await listNotifications(request, env);
    if (route === "notifications/read-all" && request.method === "POST") return await readAllNotifications(request, env);
    if (/^notifications\/[^/]+$/.test(route) && request.method === "PATCH") return await readNotification(route, request, env);

    if (route === "announcements" && request.method === "GET") return await listAnnouncements(env);
    if (route === "announcements" && request.method === "POST") return await createAnnouncement(request, env);

    if (route === "complaints" && request.method === "GET") return await listComplaints(request, env);
    if (route === "complaints" && request.method === "POST") return await createComplaint(request, env);
    if (route.startsWith("complaints/") && request.method === "PATCH") return await updateComplaint(route, request, env);

    if (route === "quizzes" && request.method === "GET") return await listQuizzes(request, env);
    if (route === "ai/ping" && request.method === "GET") return await pingGroq(request, env);
    if (route === "ai/evaluations/generate" && request.method === "POST") return await generateQuiz(request, env);
    if (route === "quizzes/generate" && request.method === "POST") return await generateQuiz(request, env);
    if (/^quizzes\/[^/]+$/.test(route) && request.method === "PATCH") return await updateQuiz(route, request, env);
    if (route.startsWith("quizzes/") && route.endsWith("/submit") && request.method === "POST") return await submitQuiz(route, request, env);

    if (route === "notes" && request.method === "GET") return await listNotes(request, env);
    if (route === "notes" && request.method === "POST") return await publishNote(request, env);

    if (route === "votes" && request.method === "GET") return await listVotes(request, env);
    if (route === "votes" && request.method === "POST") return await castVote(request, env);

    if (route === "lost-found" && request.method === "GET") return await listLostFound(env);

    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "GET") return await listMessages(route, request, env);
    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "POST") return await createMessage(route, request, env);
    if (/^forums\/messages\/[^/]+\/report$/.test(route) && request.method === "POST") return await reportMessage(route, request, env);

    if (route === "thesis" && request.method === "GET") return await getThesis(request, env);
    if (route === "thesis/payment" && request.method === "POST") return await submitPayment(request, env);
    if (route === "thesis/upload" && request.method === "POST") return await uploadThesis(request, env, context);
    if (/^thesis\/jobs\/[^/]+$/.test(route) && request.method === "GET") return await getAnalysisJob(route, request, env);
    if (/^thesis\/jobs\/[^/]+\/retry$/.test(route) && request.method === "POST") return await retryAnalysisJob(route, request, env, context);
    if (route.startsWith("thesis/") && request.method === "PATCH") return await reviewPayment(route, request, env);

    if (route.startsWith("files/") && request.method === "GET") return await readFile(route, request, env);

    return json({ error: "Route not found." }, 404);
  } catch (error) {
    return json({ error: error.message || "Unexpected server error." }, error.status || 500);
  }
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...securityHeaders(), ...corsHeaders(), ...extraHeaders },
  });
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  };
}

function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" };
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function cookieToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const found = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("hicm_session="));
  return found ? decodeURIComponent(found.split("=")[1]) : null;
}

async function ensureSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, role TEXT NOT NULL, name TEXT NOT NULL, position TEXT, matricule TEXT UNIQUE, phone TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, view_role TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS complaints (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, student_name TEXT NOT NULL, matricule TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, proof_key TEXT, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, title TEXT NOT NULL, questions_json TEXT NOT NULL, duration_seconds INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quiz_attempts (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, user_id TEXT NOT NULL, matricule TEXT NOT NULL, answers_json TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL, matricule TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS lost_items (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, location TEXT NOT NULL, contact TEXT NOT NULL, image_url TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, channel TEXT NOT NULL, user_id TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS thesis_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, student_name TEXT NOT NULL, matricule TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'locked', screenshot_key TEXT, thesis_key TEXT, analysis_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS lecture_notes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, course_code TEXT NOT NULL, course_title TEXT NOT NULL, department TEXT NOT NULL, level TEXT NOT NULL, semester TEXT NOT NULL, academic_year TEXT NOT NULL, lecturer_name TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime_type TEXT NOT NULL, file_size INTEGER NOT NULL, published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, metadata_json TEXT, created_at TEXT NOT NULL);
  `);
}

async function seedData(db) {
  const announcementCount = await count(db, "announcements");
  if (!announcementCount) {
    await db.prepare("INSERT INTO announcements VALUES (?, ?, ?, ?, ?)").bind(id("ann"), "Welcome to HICM HUB", "All official notices, voting, academic tools, complaints, and campus conversations now live in one secure portal.", "Academic Affairs", now()).run();
  }

  const quizCount = await count(db, "quizzes");
  if (!quizCount) {
    await db.prepare("INSERT INTO quizzes (id, title, questions_json, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?)").bind(id("quiz"), "Research Methods Readiness Quiz", JSON.stringify(sampleQuestions.slice(0, 5)), 180, now()).run();
  }

  const itemCount = await count(db, "lost_items");
  if (!itemCount) {
    const items = [
      ["LOST", "Black Scientific Calculator", "Amphi B", "681 000 111"],
      ["FOUND", "Blue Student ID Card", "Library Entrance", "682 220 456"],
      ["LOST", "Silver HP Laptop Charger", "Computer Lab 2", "677 501 302"],
      ["FOUND", "Brown Notebook", "Cafeteria", "690 334 118"],
    ];
    for (const item of items) {
      await db.prepare("INSERT INTO lost_items VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id("item"), item[0], item[1], item[2], item[3], null, now()).run();
    }
  }

  const messageCount = await count(db, "messages");
  if (!messageCount) {
    for (const channel of CHANNELS) {
      await db.prepare("INSERT INTO messages (id, channel, user_id, author, body, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id("msg"), channel, "system", "HICM Moderator", `Welcome to #${channel}. Keep it useful, respectful, and academic.`, now()).run();
    }
  }
}

async function count(db, table) {
  const result = await db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first();
  return result.total;
}

async function currentSession(request, env) {
  const token = cookieToken(request);
  if (!token) return null;
  const session = await env.DB.prepare(`
    SELECT sessions.token, sessions.view_role, users.*,
      COALESCE(staff_permissions.is_admin, 0) AS is_admin,
      COALESCE(staff_permissions.forum_access, 0) AS forum_access,
      COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
    FROM sessions
    JOIN users ON sessions.user_id = users.id
    LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
    WHERE sessions.token = ?
  `).bind(token).first();
  if (session?.is_admin) session.role = "admin";
  return session;
}

async function requireSession(request, env) {
  const session = await currentSession(request, env);
  if (!session) throw Object.assign(new Error("Please sign in to continue."), { status: 401 });
  return session;
}

async function requireAdmin(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "admin") throw Object.assign(new Error("Administrator access is required."), { status: 403 });
  return session;
}

async function requireStaff(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") throw Object.assign(new Error("Staff access is required."), { status: 403 });
  return session;
}

async function getSessionResponse(request, env) {
  const session = await currentSession(request, env);
  return json({ session: session ? presentSession(session) : null, candidates: CANDIDATES, channels: CHANNELS });
}

function presentSession(session) {
  return {
    token: session.token,
    viewRole: session.view_role,
    user: {
      id: session.id,
      role: session.role,
      name: session.name,
      position: session.position,
      matricule: session.matricule,
      phone: session.phone,
      forumAccess: session.role === "admin" || Boolean(session.forum_access),
      moderationAccess: session.role === "admin" || Boolean(session.moderation_access),
    },
  };
}

async function authenticate(request, env) {
  const body = await request.json();
  const role = body.role === "staff" ? "staff" : "student";
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Enter your full name and credential." }, 400);
  let user;

  if (role === "student") {
    const matricule = String(body.matricule || "").trim().toUpperCase();
    if (!matricule) return json({ error: "Enter your full name and credential." }, 400);
    user = await env.DB.prepare("SELECT * FROM users WHERE UPPER(matricule) = ? AND role = 'student'").bind(matricule).first();
    if (user && user.name.trim().toLowerCase() !== name.toLowerCase()) return json({ error: "The supplied login details are not valid." }, 401);
    if (!user) {
      const phone = String(body.phone || "").trim();
      if (!phone) return json({ error: "Phone number is required for student registration." }, 400);
      user = { id: id("usr"), role, name, position: null, matricule, phone, created_at: now() };
      await env.DB.prepare("INSERT INTO users (id, role, name, position, matricule, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(user.id, user.role, user.name, user.position, user.matricule, user.phone, user.created_at).run();
    }
  } else {
    const password = String(body.password || "");
    user = await env.DB.prepare(`
      SELECT users.*, COALESCE(staff_permissions.is_admin, 0) AS is_admin,
        COALESCE(staff_permissions.forum_access, 0) AS forum_access,
        COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
      FROM users LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
      WHERE users.role = 'staff' AND LOWER(TRIM(users.name)) = LOWER(TRIM(?))
    `).bind(name).first();
    if (user) {
      if (!user.password_hash || !env.PASSWORD_PEPPER || !await verifyPassword(password, user.password_salt, user.password_hash, env.PASSWORD_PEPPER)) return json({ error: "The supplied login details are not valid." }, 401);
    } else {
      const accessCode = String(body.accessCode || "").trim().toUpperCase();
      const code = await env.DB.prepare("SELECT id FROM staff_access_codes WHERE code = ? AND revoked_at IS NULL AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").bind(accessCode).first();
      if (!code) return json({ error: "This staff access code is invalid, expired, or already used." }, 403);
      if (!body.position || password.length < 8) return json({ error: "Staff registration requires a position and password of at least 8 characters." }, 400);
      if (!env.PASSWORD_PEPPER) return json({ error: "Staff authentication is not configured." }, 503);
      const credentials = await hashPassword(password, env.PASSWORD_PEPPER);
      user = { id: id("usr"), role, name, position: String(body.position).trim(), matricule: null, phone: String(body.phone || "").trim(), created_at: now() };
      try {
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO users (id, role, name, position, matricule, phone, created_at, password_hash, password_salt, staff_code_id)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, id FROM staff_access_codes
            WHERE id = ? AND revoked_at IS NULL AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
          `).bind(user.id, user.role, user.name, user.position, user.matricule, user.phone, user.created_at, credentials.hash, credentials.salt, code.id),
          env.DB.prepare("UPDATE staff_access_codes SET used_by = ?, used_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP")
            .bind(user.id, now(), code.id),
          env.DB.prepare("INSERT INTO staff_permissions (user_id, updated_at) VALUES (?, ?)").bind(user.id, now()),
          env.DB.prepare("INSERT INTO audit_logs VALUES (?, ?, 'staff.registered', 'user', ?, ?, ?)").bind(id("audit"), user.id, user.id, JSON.stringify({ codeId: code.id }), now()),
        ]);
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) return json({ error: "This staff access code was already used." }, 409);
        if (String(error.message).includes("FOREIGN KEY")) return json({ error: "This staff access code is invalid, expired, or revoked." }, 403);
        throw error;
      }
    }
  }

  if (user.account_status === "blocked") return json({ error: "The supplied login details are not valid." }, 401);

  const token = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").bind(token, user.id, role, now()).run();
  const session = { token, view_role: role, ...user };
  if (user.is_admin) session.role = "admin";
  return json({ session: presentSession(session) }, 200, { "Set-Cookie": `hicm_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=2592000` });
}

async function hashPassword(password, pepper) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  return { salt, hash: await passwordMac(password, salt, pepper) };
}

async function verifyPassword(password, salt, expectedHash, pepper) {
  if (!password || !salt || !expectedHash || !pepper) return false;
  return safeEqual(await passwordMac(password, salt, pepper), expectedHash);
}

async function passwordMac(password, salt, pepper) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${salt}:${password}`));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function logout(request, env) {
  const token = cookieToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true }, 200, { "Set-Cookie": "hicm_session=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0" });
}

async function updateViewRole(request, env) {
  const session = await requireSession(request, env);
  const body = await request.json();
  const viewRole = (session.role === "staff" || session.role === "admin") && body.viewRole === "staff" ? "staff" : "student";
  await env.DB.prepare("UPDATE sessions SET view_role = ? WHERE token = ?").bind(viewRole, session.token).run();
  return getSessionResponse(request, env);
}

async function changePassword(request, env) {
  const session = await requireStaff(request, env);
  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!await verifyPassword(currentPassword, session.password_salt, session.password_hash, env.PASSWORD_PEPPER)) return json({ error: "Current password is incorrect." }, 401);
  if (newPassword.length < 12) return json({ error: "New password must contain at least 12 characters." }, 400);
  if (currentPassword === newPassword) return json({ error: "Choose a different password." }, 400);
  const credentials = await hashPassword(newPassword, env.PASSWORD_PEPPER);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(credentials.hash, credentials.salt, session.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token <> ?").bind(session.id, session.token),
    env.DB.prepare("INSERT INTO audit_logs VALUES (?, ?, 'account.password_changed', 'user', ?, '{}', ?)").bind(id("audit"), session.id, session.id, now()),
  ]);
  return json({ ok: true });
}

async function bootstrapAdmin(request, env) {
  const existing = await env.DB.prepare("SELECT COUNT(*) AS total FROM staff_permissions WHERE is_admin = 1").first();
  if (Number(existing.total) > 0) return json({ error: "Administrator bootstrap is closed." }, 409);
  const body = await request.json();
  if (!env.ADMIN_BOOTSTRAP_SECRET || !safeEqual(String(body.bootstrapSecret || ""), env.ADMIN_BOOTSTRAP_SECRET)) return json({ error: "Bootstrap credential is invalid." }, 403);
  const name = String(body.name || "HICM Administrator").trim();
  const password = String(body.password || "");
  if (password.length < 12) return json({ error: "The administrator password must contain at least 12 characters." }, 400);
  if (!env.PASSWORD_PEPPER) return json({ error: "Staff authentication is not configured." }, 503);

  const userId = id("usr");
  const codeId = id("code");
  const timestamp = now();
  const credentials = await hashPassword(password, env.PASSWORD_PEPPER);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO staff_access_codes (id, code, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(codeId, `BOOTSTRAP-${crypto.randomUUID()}`, new Date(Date.now() + 60000).toISOString(), timestamp),
    env.DB.prepare("INSERT INTO users (id, role, name, position, matricule, phone, created_at, password_hash, password_salt, staff_code_id) VALUES (?, 'staff', ?, 'Platform Administrator', NULL, ?, ?, ?, ?, ?)")
      .bind(userId, name, String(body.phone || "Not supplied"), timestamp, credentials.hash, credentials.salt, codeId),
    env.DB.prepare("UPDATE staff_access_codes SET used_by = ?, used_at = ? WHERE id = ?").bind(userId, timestamp, codeId),
    env.DB.prepare("INSERT INTO staff_permissions (user_id, is_admin, forum_access, moderation_access, updated_by, updated_at) VALUES (?, 1, 1, 1, ?, ?)")
      .bind(userId, userId, timestamp),
    env.DB.prepare("INSERT INTO audit_logs VALUES (?, ?, 'admin.bootstrapped', 'user', ?, ?, ?)")
      .bind(id("audit"), userId, userId, JSON.stringify({ name }), timestamp),
  ]);
  return json({ ok: true, name });
}

async function adminOverview(request, env) {
  await requireAdmin(request, env);
  const [users, students, staff, openComplaints, pendingPayments, queuedAnalysis, unreadReports] = await Promise.all([
    count(env.DB, "users"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'student'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'staff'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM complaints WHERE status <> 'Resolved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM thesis_requests WHERE status = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM analysis_jobs WHERE status IN ('queued', 'processing', 'failed')").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM forum_reports WHERE status = 'open'").first(),
  ]);
  return json({ metrics: { users, students: students.total, staff: staff.total, openComplaints: openComplaints.total, pendingPayments: pendingPayments.total, queuedAnalysis: queuedAnalysis.total, openForumReports: unreadReports.total } });
}

async function adminUsers(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT users.id, users.name, users.role, users.position, users.matricule, users.phone, users.account_status, users.created_at,
      COALESCE(staff_permissions.is_admin, 0) AS is_admin,
      COALESCE(staff_permissions.forum_access, 0) AS forum_access,
      COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
    FROM users LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
    ORDER BY users.created_at DESC LIMIT 250
  `).all();
  return json({ users: rows.results });
}

async function listStaffCodes(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT codes.*, creator.name AS creator_name, consumer.name AS used_by_name
    FROM staff_access_codes codes
    LEFT JOIN users creator ON creator.id = codes.created_by
    LEFT JOIN users consumer ON consumer.id = codes.used_by
    ORDER BY codes.created_at DESC LIMIT 100
  `).all();
  return json({ codes: rows.results });
}

async function createStaffCode(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  const hours = Math.min(168, Math.max(1, Number(body.expiresInHours) || 24));
  const code = generateStaffCode();
  const codeId = id("code");
  await env.DB.prepare("INSERT INTO staff_access_codes (id, code, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(codeId, code, session.id, new Date(Date.now() + hours * 3600000).toISOString(), now()).run();
  await audit(env, session.id, "staff_code.created", "staff_access_code", codeId, { hours });
  return json({ code, id: codeId, expiresInHours: hours }, 201);
}

async function revokeStaffCode(route, request, env) {
  const session = await requireAdmin(request, env);
  const codeId = route.split("/")[2];
  await env.DB.prepare("UPDATE staff_access_codes SET revoked_at = ? WHERE id = ? AND used_at IS NULL").bind(now(), codeId).run();
  await audit(env, session.id, "staff_code.revoked", "staff_access_code", codeId);
  return listStaffCodes(request, env);
}

async function updateUserAdmin(route, request, env) {
  const session = await requireAdmin(request, env);
  const userId = route.split("/")[2];
  const body = await request.json();
  const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!target) return json({ error: "User not found." }, 404);
  if (target.id === session.id && body.accountStatus === "blocked") return json({ error: "You cannot block your own administrator account." }, 400);
  const status = body.accountStatus === "blocked" ? "blocked" : "active";
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET account_status = ? WHERE id = ?").bind(status, userId),
    ...(status === "blocked" ? [env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId)] : []),
  ]);
  if (target.role === "staff") {
    await env.DB.prepare(`
      INSERT INTO staff_permissions (user_id, is_admin, forum_access, moderation_access, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET forum_access = excluded.forum_access, moderation_access = excluded.moderation_access, updated_by = excluded.updated_by, updated_at = excluded.updated_at
    `).bind(userId, 0, body.forumAccess ? 1 : 0, body.moderationAccess ? 1 : 0, session.id, now()).run();
  }
  await audit(env, session.id, "user.permissions_updated", "user", userId, { status, forumAccess: Boolean(body.forumAccess), moderationAccess: Boolean(body.moderationAccess) });
  return adminUsers(request, env);
}

async function updateForumSettings(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  const channel = CHANNELS.includes(body.channel) ? body.channel : "General";
  await env.DB.prepare(`
    INSERT INTO forum_settings (channel, links_enabled, images_enabled, audio_enabled, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(channel) DO UPDATE SET links_enabled = excluded.links_enabled, images_enabled = excluded.images_enabled, audio_enabled = excluded.audio_enabled, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).bind(channel, body.linksEnabled ? 1 : 0, body.imagesEnabled ? 1 : 0, body.audioEnabled ? 1 : 0, session.id, now()).run();
  await audit(env, session.id, "forum.settings_updated", "forum_channel", channel, body);
  return json({ ok: true });
}

async function listForumReports(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT forum_reports.*, messages.body, messages.author, users.name AS reporter_name
    FROM forum_reports JOIN messages ON messages.id = forum_reports.message_id
    JOIN users ON users.id = forum_reports.reporter_id
    ORDER BY forum_reports.created_at DESC LIMIT 100
  `).all();
  return json({ reports: rows.results });
}

async function reviewForumReport(route, request, env) {
  const session = await requireAdmin(request, env);
  const reportId = route.split("/")[3];
  const body = await request.json();
  const status = body.status === "actioned" ? "actioned" : "dismissed";
  const report = await env.DB.prepare("SELECT message_id FROM forum_reports WHERE id = ?").bind(reportId).first();
  if (!report) return json({ error: "Report not found." }, 404);
  await env.DB.batch([
    env.DB.prepare("UPDATE forum_reports SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").bind(status, session.id, now(), reportId),
    ...(status === "actioned" ? [env.DB.prepare("UPDATE messages SET deleted_at = ? WHERE id = ?").bind(now(), report.message_id)] : []),
  ]);
  await audit(env, session.id, "forum.report_reviewed", "forum_report", reportId, { status });
  return listForumReports(request, env);
}

async function listAuditLogs(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare("SELECT audit_logs.*, users.name AS actor_name FROM audit_logs LEFT JOIN users ON users.id = audit_logs.actor_id ORDER BY audit_logs.created_at DESC LIMIT 200").all();
  return json({ logs: rows.results });
}

async function listAnalysisAdmin(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT analysis_jobs.*, analysis_documents.original_name, users.name AS student_name, users.matricule,
      analysis_reports.similarity_percent, analysis_reports.matched_shingles, analysis_reports.total_shingles
    FROM analysis_jobs JOIN analysis_documents ON analysis_documents.id = analysis_jobs.document_id
    JOIN users ON users.id = analysis_jobs.user_id
    LEFT JOIN analysis_reports ON analysis_reports.job_id = analysis_jobs.id
    ORDER BY analysis_jobs.created_at DESC LIMIT 100
  `).all();
  return json({ jobs: rows.results });
}

async function listNotifications(request, env) {
  const session = await requireSession(request, env);
  const rows = await env.DB.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(session.id).all();
  const unread = rows.results.filter((item) => !item.read_at).length;
  return json({ notifications: rows.results, unread });
}

async function readNotification(route, request, env) {
  const session = await requireSession(request, env);
  const notificationId = route.split("/")[1];
  await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?").bind(now(), notificationId, session.id).run();
  return listNotifications(request, env);
}

async function readAllNotifications(request, env) {
  const session = await requireSession(request, env);
  await env.DB.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ?").bind(now(), session.id).run();
  return listNotifications(request, env);
}

async function notify(env, userId, type, title, body, deepLink) {
  await env.DB.prepare("INSERT INTO notifications (id, user_id, type, title, body, deep_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id("notification"), userId, type, title, body, deepLink || null, now()).run();
}

function generateStaffCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `STF-${value.slice(0, 4)}-${value.slice(4)}`;
}

async function listAnnouncements(env) {
  const rows = await env.DB.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all();
  return json({ announcements: rows.results });
}

async function createAnnouncement(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const body = await request.json();
  if (!body.title || !body.body) return json({ error: "Title and announcement body are required." }, 400);
  await env.DB.prepare("INSERT INTO announcements VALUES (?, ?, ?, ?, ?)").bind(id("ann"), body.title, body.body, session.name, now()).run();
  const students = await env.DB.prepare("SELECT id FROM users WHERE role = 'student' AND account_status = 'active'").all();
  if (students.results.length) await env.DB.batch(students.results.map((student) => env.DB.prepare("INSERT INTO notifications (id, user_id, type, title, body, deep_link, created_at) VALUES (?, ?, 'announcement', ?, ?, '/announcements', ?)").bind(id("notification"), student.id, String(body.title).slice(0, 120), String(body.body).slice(0, 240), now())));
  await audit(env, session.id, "announcement.created", "announcement", null, { title: body.title });
  return listAnnouncements(env);
}

async function listComplaints(request, env) {
  const session = await requireSession(request, env);
  const query = session.role === "staff" || session.role === "admin"
    ? env.DB.prepare("SELECT * FROM complaints ORDER BY created_at DESC")
    : env.DB.prepare("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC").bind(session.id);
  const rows = await query.all();
  return json({ complaints: rows.results });
}

async function createComplaint(request, env) {
  const session = await requireSession(request, env);
  const form = await request.formData();
  const category = form.get("category");
  const description = form.get("description");
  if (!category || !description) return json({ error: "Category and description are required." }, 400);
  const proof = form.get("proof");
  const proofKey = proof && proof.name ? await storeUpload(env, proof, "complaint-proofs") : null;
  await env.DB.prepare("INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("cmp"), session.id, session.name, session.matricule || "STAFF", category, description, proofKey, "Pending", now()).run();
  return listComplaints(request, env);
}

async function updateComplaint(route, request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const complaintId = route.split("/")[1];
  const body = await request.json();
  const status = ["Pending", "Reviewing", "Resolved"].includes(body.status) ? body.status : "Pending";
  await env.DB.prepare("UPDATE complaints SET status = ? WHERE id = ?").bind(status, complaintId).run();
  const complaint = await env.DB.prepare("SELECT user_id, category FROM complaints WHERE id = ?").bind(complaintId).first();
  if (complaint) await notify(env, complaint.user_id, "complaint", "Complaint status updated", `${complaint.category} is now ${status}.`, "/complaints");
  await audit(env, session.id, "complaint.status_updated", "complaint", complaintId, { status });
  return listComplaints(request, env);
}

async function listQuizzes(request, env) {
  const session = await currentSession(request, env);
  const courseCode = new URL(request.url).searchParams.get("courseCode")?.trim().toUpperCase();
  const canReview = session?.role === "staff" || session?.role === "admin";
  const query = courseCode
    ? canReview
      ? env.DB.prepare("SELECT * FROM quizzes WHERE UPPER(COALESCE(course_code, '')) = ? ORDER BY created_at DESC").bind(courseCode)
      : env.DB.prepare("SELECT * FROM quizzes WHERE UPPER(COALESCE(course_code, '')) = ? AND COALESCE(status, 'published') = 'published' ORDER BY created_at DESC").bind(courseCode)
    : canReview
      ? env.DB.prepare("SELECT * FROM quizzes ORDER BY created_at DESC")
      : env.DB.prepare("SELECT * FROM quizzes WHERE COALESCE(status, 'published') = 'published' ORDER BY created_at DESC");
  const rows = await query.all();
  return json({ quizzes: rows.results.map((quiz) => ({
    ...quiz,
    questions: JSON.parse(quiz.questions_json).map((question) => canReview ? question : withoutAnswer(question)),
    questions_json: undefined,
  })) });
}

async function updateQuiz(route, request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const quizId = route.split("/")[1];
  const body = await request.json();
  const status = body.status === "published" ? "published" : "draft";
  const owned = session.role === "admin"
    ? await env.DB.prepare("SELECT id FROM quizzes WHERE id = ?").bind(quizId).first()
    : await env.DB.prepare("SELECT id FROM quizzes WHERE id = ? AND owner_id = ?").bind(quizId, session.id).first();
  if (!owned) return json({ error: "Evaluation not found or not owned by this account." }, 404);
  await env.DB.prepare("UPDATE quizzes SET status = ? WHERE id = ?").bind(status, quizId).run();
  await audit(env, session.id, `evaluation.${status}`, "quiz", quizId);
  return listQuizzes(request, env);
}

function withoutAnswer(question) {
  const { answer, correctOptionIndex, ...safeQuestion } = question;
  return safeQuestion;
}

async function generateQuiz(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const contentType = request.headers.get("Content-Type") || "";
  const input = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const requested = Math.max(1, Math.min(20, Number(input.count || 5)));
  const courseCode = String(input.courseCode || "GEN 100").trim().toUpperCase();
  const title = String(input.title || "Generated Lecture Quiz").trim();
  const difficulty = String(input.difficulty || "medium");
  const sourceName = String(input.noteName || title);
  let questions;
  let generatedBy = "fallback";
  try {
    questions = await generateQuestionsWithGroq(env, { courseCode, title, difficulty, count: requested, sourceName });
    generatedBy = "groq";
  } catch (error) {
    if (!env.GROQ_API_KEY) {
      questions = fallbackQuestions(requested);
    } else {
      return json({ error: `AI generation could not complete: ${error.message}` }, 502);
    }
  }
  const quizId = id("quiz");
  await env.DB.prepare("INSERT INTO quizzes (id, title, questions_json, duration_seconds, created_at, course_code, department, level, semester, academic_year, status, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(quizId, title, JSON.stringify(questions), Math.max(120, requested * 60), now(), courseCode, input.department || null, input.level || null, input.semester || null, input.academicYear || null, "draft", session.id).run();
  await audit(env, session.id, "evaluation.generated", "quiz", quizId, { generatedBy, count: questions.length, courseCode });
  return listQuizzes(request, env);
}

function fallbackQuestions(requested) {
  return Array.from({ length: requested }, (_, index) => sampleQuestions[index % sampleQuestions.length]).map((question) => ({ ...question, explanation: "Review the relevant lecture-note section.", difficulty: "medium", sourceSection: "Lecture note" }));
}

async function generateQuestionsWithGroq(env, input) {
  if (!env.GROQ_API_KEY) throw new Error("Groq is not configured");
  const response = await fetch(`${env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.GROQ_MODEL_EVALUATION || "openai/gpt-oss-120b",
      temperature: 0.2,
      max_completion_tokens: Math.min(4000, 500 + input.count * 220),
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You create rigorous university MCQs. Return JSON only as {\"questions\":[...]}. Every question must have question, exactly four options, answer as a zero-based integer, explanation, difficulty, and sourceSection. Never include markdown." },
        { role: "user", content: `Create ${input.count} ${input.difficulty} MCQs for ${input.courseCode}: ${input.title}. The selected lecture note is named ${input.sourceName}. Keep questions academically appropriate and factually cautious.` },
      ],
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(response.status === 429 ? "Groq rate limit reached; please retry shortly" : `Groq returned ${response.status}`);
  const payload = JSON.parse(raw);
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== input.count) throw new Error("Groq returned an invalid question set");
  return parsed.questions.map(validateAiQuestion);
}

function validateAiQuestion(question) {
  if (!question || typeof question.question !== "string" || !Array.isArray(question.options) || question.options.length !== 4 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
    throw new Error("Groq returned malformed question data");
  }
  return { question: question.question.trim(), options: question.options.map(String), answer: question.answer, explanation: String(question.explanation || ""), difficulty: String(question.difficulty || "medium"), sourceSection: String(question.sourceSection || "Lecture note") };
}

async function pingGroq(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  if (!env.GROQ_API_KEY) return json({ ok: false, error: "Groq is not configured." }, 503);
  try {
    const response = await fetch(`${env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/models`, { headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}` } });
    return json({ ok: response.ok, status: response.status, model: env.GROQ_MODEL_EVALUATION || "openai/gpt-oss-120b" }, response.ok ? 200 : 502);
  } catch (error) {
    return json({ ok: false, error: String(error?.message || "Groq connection failed") }, 502);
  }
}

async function submitQuiz(route, request, env) {
  const session = await requireSession(request, env);
  const quizId = route.split("/")[1];
  const body = await request.json();
  const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(quizId).first();
  if (!quiz) return json({ error: "Quiz not found." }, 404);
  const questions = JSON.parse(quiz.questions_json);
  const answers = body.answers || {};
  const score = questions.reduce((total, question, index) => total + (Number(answers[index]) === question.answer ? 1 : 0), 0);
  await env.DB.prepare("INSERT INTO quiz_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id("att"), quizId, session.id, session.matricule || session.phone, JSON.stringify(answers), score, questions.length, now()).run();
  return json({ score, total: questions.length, percent: Math.round((score / questions.length) * 100) });
}

async function listNotes(request, env) {
  await requireSession(request, env);
  const url = new URL(request.url);
  const search = `%${String(url.searchParams.get("q") || "").trim()}%`;
  const rows = await env.DB.prepare(`
    SELECT id, owner_id, course_code, course_title, department, level, semester, academic_year,
      lecturer_name, original_name, mime_type, file_size, published, created_at
    FROM lecture_notes
    WHERE published = 1 AND (course_code LIKE ? COLLATE NOCASE OR course_title LIKE ? COLLATE NOCASE OR lecturer_name LIKE ? COLLATE NOCASE)
    ORDER BY created_at DESC LIMIT 100
  `).bind(search, search, search).all();
  return json({ notes: rows.results.map((note) => ({ ...note, file_url: `/api/files/note/${encodeURIComponent(note.id)}` })) });
}

async function publishNote(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const form = await request.formData();
  const file = form.get("note");
  const required = ["courseCode", "courseTitle", "department", "level", "semester", "academicYear"];
  if (required.some((field) => !String(form.get(field) || "").trim())) return json({ error: "Complete every academic field before publishing." }, 400);
  const fileError = await validateDocument(file, 20 * 1024 * 1024);
  if (fileError) return json({ error: fileError }, 400);
  const objectKey = await storeUpload(env, file, "lecture-notes");
  const noteId = id("note");
  await env.DB.prepare(`
    INSERT INTO lecture_notes (id, owner_id, course_code, course_title, department, level, semester, academic_year, lecturer_name, object_key, original_name, mime_type, file_size, published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(noteId, session.id, String(form.get("courseCode")).trim().toUpperCase(), String(form.get("courseTitle")).trim(), String(form.get("department")).trim(), String(form.get("level")).trim(), String(form.get("semester")).trim(), String(form.get("academicYear")).trim(), session.name, objectKey, file.name, file.type, file.size, now(), now()).run();
  await audit(env, session.id, "lecture_note.published", "lecture_note", noteId, { courseCode: String(form.get("courseCode")).trim().toUpperCase() });
  return listNotes(request, env);
}

async function validateDocument(file, maxSize) {
  if (!file || !file.name) return "Select a PDF or DOCX file.";
  if (file.size > maxSize) return "The file is larger than 20 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const accepted = extension === "pdf" || extension === "docx";
  if (!accepted) return "Only PDF and DOCX files are accepted.";
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = extension === "pdf" && String.fromCharCode(...header.slice(0, 5)) === "%PDF-";
  const isDocx = extension === "docx" && header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  if (!isPdf && !isDocx) return "The file contents do not match its PDF or DOCX extension.";
  return null;
}

async function audit(env, actorId, action, targetType, targetId, metadata = {}) {
  await env.DB.prepare("INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id("audit"), actorId || null, action, targetType || null, targetId || null, JSON.stringify(metadata), now()).run();
}

async function listVotes(request, env) {
  const session = await currentSession(request, env);
  const rows = await env.DB.prepare("SELECT candidate_id, COUNT(*) AS total FROM votes GROUP BY candidate_id").all();
  const vote = session?.matricule ? await env.DB.prepare("SELECT * FROM votes WHERE matricule = ?").bind(session.matricule).first() : null;
  return json({ candidates: CANDIDATES, totals: rows.results, myVote: vote });
}

async function castVote(request, env) {
  const session = await requireSession(request, env);
  if (!session.matricule) return json({ error: "A student matricule is required to vote." }, 400);
  const body = await request.json();
  if (!CANDIDATES.some((candidate) => candidate.id === body.candidateId)) return json({ error: "Invalid candidate." }, 400);
  try {
    await env.DB.prepare("INSERT INTO votes VALUES (?, ?, ?, ?)").bind(id("vote"), body.candidateId, session.matricule, now()).run();
  } catch {
    return json({ error: `Matricule ${session.matricule} has already voted.` }, 409);
  }
  return listVotes(request, env);
}

async function listLostFound(env) {
  const rows = await env.DB.prepare("SELECT * FROM lost_items ORDER BY created_at DESC").all();
  return json({ items: rows.results });
}

async function listMessages(route, request, env) {
  const channel = decodeURIComponent(route.split("/")[1]);
  if (!CHANNELS.includes(channel)) return json({ error: "Forum channel not found." }, 404);
  const session = await currentSession(request, env);
  if (session?.role === "staff" && !session.forum_access) return json({ error: "An administrator must grant this staff account forum access." }, 403);
  const after = new URL(request.url).searchParams.get("after");
  const rows = after
    ? await env.DB.prepare(`
        SELECT messages.*, parent.author AS parent_author, parent.body AS parent_body
        FROM messages LEFT JOIN messages parent ON parent.id = messages.parent_message_id
        WHERE messages.channel = ? AND messages.created_at > ? AND messages.deleted_at IS NULL
        ORDER BY messages.created_at ASC LIMIT 100
      `).bind(channel, after).all()
    : await env.DB.prepare(`
        SELECT messages.*, parent.author AS parent_author, parent.body AS parent_body
        FROM messages LEFT JOIN messages parent ON parent.id = messages.parent_message_id
        WHERE messages.channel = ? AND messages.deleted_at IS NULL
        ORDER BY messages.created_at DESC LIMIT 100
      `).bind(channel).all();
  const messages = after ? rows.results : rows.results.reverse();
  const settings = await env.DB.prepare("SELECT * FROM forum_settings WHERE channel = ?").bind(channel).first();
  return json({ channel, messages, settings: settings || { links_enabled: 0, images_enabled: 0, audio_enabled: 0 } });
}

async function createMessage(route, request, env) {
  const session = await requireSession(request, env);
  const channel = decodeURIComponent(route.split("/")[1]);
  if (!CHANNELS.includes(channel)) return json({ error: "Forum channel not found." }, 404);
  if (session.role === "staff" && !session.forum_access) return json({ error: "An administrator must grant this staff account forum access." }, 403);
  const body = await request.json();
  if (!body.body) return json({ error: "Message cannot be empty." }, 400);
  const settings = await env.DB.prepare("SELECT links_enabled FROM forum_settings WHERE channel = ?").bind(channel).first();
  if (!settings?.links_enabled && containsLink(body.body)) return json({ error: "Links are disabled in this forum channel." }, 400);
  let parent = null;
  if (body.parentMessageId) parent = await env.DB.prepare("SELECT id, user_id, channel FROM messages WHERE id = ? AND deleted_at IS NULL").bind(body.parentMessageId).first();
  if (body.parentMessageId && (!parent || parent.channel !== channel)) return json({ error: "The reply target is not available." }, 400);
  const messageId = id("msg");
  await env.DB.prepare("INSERT INTO messages (id, channel, user_id, author, body, created_at, parent_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(messageId, channel, session.id, session.name, String(body.body).trim().slice(0, 1000), now(), parent?.id || null).run();
  if (parent && parent.user_id !== session.id && parent.user_id !== "system") await notify(env, parent.user_id, "forum_reply", `${session.name} replied to you`, String(body.body).trim().slice(0, 180), "/forums");
  return listMessages(route, request, env);
}

async function reportMessage(route, request, env) {
  const session = await requireSession(request, env);
  const messageId = route.split("/")[2];
  const body = await request.json();
  const message = await env.DB.prepare("SELECT id FROM messages WHERE id = ? AND deleted_at IS NULL").bind(messageId).first();
  if (!message) return json({ error: "Message not found." }, 404);
  try {
    await env.DB.prepare("INSERT INTO forum_reports (id, message_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id("report"), messageId, session.id, String(body.reason || "Inappropriate content").slice(0, 240), now()).run();
  } catch {
    return json({ error: "You already reported this message." }, 409);
  }
  return json({ ok: true }, 201);
}

function containsLink(value) {
  return /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s)/i.test(String(value));
}

async function getThesis(request, env) {
  const session = await requireSession(request, env);
  if (session.role === "admin") {
    const rows = await env.DB.prepare("SELECT * FROM thesis_requests ORDER BY updated_at DESC").all();
    return json({ requests: rows.results.map(presentThesis) });
  }
  if (session.role === "staff") return json({ error: "Administrator approval is required for payment records." }, 403);
  const row = await env.DB.prepare("SELECT * FROM thesis_requests WHERE user_id = ?").bind(session.id).first();
  if (!row) return json({ request: null });
  const requestView = presentThesis(row);
  if (row.analysis_job_id) {
    requestView.analysisJob = await readAnalysisJob(env, row.analysis_job_id);
    if (requestView.analysisJob?.report) requestView.analysis = requestView.analysisJob.report;
  }
  return json({ request: requestView });
}

function presentThesis(row) {
  return {
    ...row,
    screenshot_url: row.screenshot_key ? `/api/files/${encodeURIComponent(row.screenshot_key)}` : null,
    analysis: row.analysis_json ? JSON.parse(row.analysis_json) : null,
  };
}

async function submitPayment(request, env) {
  const session = await requireSession(request, env);
  if (!session.matricule) return json({ error: "Student matricule is required." }, 400);
  const form = await request.formData();
  const screenshot = form.get("screenshot");
  if (!screenshot || !screenshot.name) return json({ error: "Payment screenshot is required." }, 400);
  const key = await storeUpload(env, screenshot, "payment-screenshots");
  const existing = await env.DB.prepare("SELECT * FROM thesis_requests WHERE user_id = ?").bind(session.id).first();
  if (existing) {
    await env.DB.prepare("UPDATE thesis_requests SET status = 'pending', screenshot_key = ?, updated_at = ? WHERE user_id = ?").bind(key, now(), session.id).run();
  } else {
    await env.DB.prepare("INSERT INTO thesis_requests (id, user_id, student_name, matricule, status, screenshot_key, thesis_key, analysis_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("thr"), session.id, session.name, session.matricule, "pending", key, null, null, now(), now()).run();
  }
  return getThesis(request, env);
}

async function reviewPayment(route, request, env) {
  const session = await requireAdmin(request, env);
  const requestId = route.split("/")[1];
  const body = await request.json();
  const status = body.status === "approved" ? "approved" : "rejected";
  await env.DB.prepare("UPDATE thesis_requests SET status = ?, updated_at = ? WHERE id = ?").bind(status, now(), requestId).run();
  const thesisRequest = await env.DB.prepare("SELECT user_id FROM thesis_requests WHERE id = ?").bind(requestId).first();
  if (thesisRequest) await notify(env, thesisRequest.user_id, "payment_review", status === "approved" ? "Thesis analysis unlocked" : "Payment screenshot needs attention", status === "approved" ? "Your payment was approved. You can now upload your thesis." : "Your screenshot was rejected. Please submit a clearer image.", "/thesis");
  await audit(env, session.id, `thesis.payment_${status}`, "thesis_request", requestId);
  return getThesis(request, env);
}

async function uploadThesis(request, env, context) {
  const session = await requireSession(request, env);
  const row = await env.DB.prepare("SELECT * FROM thesis_requests WHERE user_id = ? AND status = 'approved'").bind(session.id).first();
  if (!row) return json({ error: "Thesis tool is locked until admin approval." }, 403);
  const form = await request.formData();
  const thesis = form.get("thesis");
  if (!thesis || !thesis.name) return json({ error: "Please upload a thesis file." }, 400);
  const validationError = await validateDocument(thesis, 20 * 1024 * 1024);
  if (validationError) return json({ error: validationError }, 400);
  const key = await storeUpload(env, thesis, "thesis-files");
  const documentId = id("document");
  const jobId = id("analysis");
  const timestamp = now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO analysis_documents (id, user_id, thesis_request_id, object_key, original_name, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(documentId, session.id, row.id, key, thesis.name, thesis.type || "application/octet-stream", timestamp),
    env.DB.prepare("INSERT INTO analysis_jobs (id, document_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(jobId, documentId, session.id, timestamp, timestamp),
    env.DB.prepare("UPDATE thesis_requests SET thesis_key = ?, analysis_job_id = ?, analysis_json = NULL, updated_at = ? WHERE user_id = ?")
      .bind(key, jobId, timestamp, session.id),
    env.DB.prepare("INSERT INTO analysis_access_logs (id, user_id, job_id, action, created_at) VALUES (?, ?, ?, 'analysis.uploaded', ?)")
      .bind(id("access"), session.id, jobId, timestamp),
  ]);
  if (env.ANALYSIS_QUEUE) await env.ANALYSIS_QUEUE.send({ jobId });
  else context?.waitUntil(processAnalysisJob(env, jobId).catch(() => {}));
  return getThesis(request, env);
}

async function getAnalysisJob(route, request, env) {
  const session = await requireSession(request, env);
  const jobId = route.split("/")[2];
  const job = await env.DB.prepare("SELECT user_id FROM analysis_jobs WHERE id = ?").bind(jobId).first();
  if (!job) return json({ error: "Analysis job not found." }, 404);
  if (session.role !== "admin" && session.role !== "staff" && job.user_id !== session.id) return json({ error: "You cannot access this report." }, 403);
  await env.DB.prepare("INSERT INTO analysis_access_logs (id, user_id, job_id, action, created_at) VALUES (?, ?, ?, 'analysis.viewed', ?)").bind(id("access"), session.id, jobId, now()).run();
  return json({ job: await readAnalysisJob(env, jobId) });
}

async function retryAnalysisJob(route, request, env, context) {
  const session = await requireSession(request, env);
  const jobId = route.split("/")[2];
  const job = await env.DB.prepare("SELECT user_id, status, attempts FROM analysis_jobs WHERE id = ?").bind(jobId).first();
  if (!job) return json({ error: "Analysis job not found." }, 404);
  if (session.role !== "admin" && job.user_id !== session.id) return json({ error: "You cannot retry this report." }, 403);
  if (job.status !== "failed") return json({ error: "Only failed jobs can be retried." }, 409);
  if (job.attempts >= 4) return json({ error: "Retry limit reached. Contact an administrator." }, 409);
  await env.DB.prepare("UPDATE analysis_jobs SET status = 'queued', progress = 0, error_message = NULL, updated_at = ? WHERE id = ?").bind(now(), jobId).run();
  if (env.ANALYSIS_QUEUE) await env.ANALYSIS_QUEUE.send({ jobId });
  else context.waitUntil(processAnalysisJob(env, jobId).catch(() => {}));
  return json({ job: await readAnalysisJob(env, jobId) });
}

async function readAnalysisJob(env, jobId) {
  const job = await env.DB.prepare(`
    SELECT analysis_jobs.*, analysis_documents.original_name, analysis_documents.word_count,
      analysis_reports.similarity_percent, analysis_reports.matched_shingles, analysis_reports.total_shingles,
      analysis_reports.coverage_note, analysis_reports.recommendations_json
    FROM analysis_jobs JOIN analysis_documents ON analysis_documents.id = analysis_jobs.document_id
    LEFT JOIN analysis_reports ON analysis_reports.job_id = analysis_jobs.id
    WHERE analysis_jobs.id = ?
  `).bind(jobId).first();
  if (!job) return null;
  const matches = job.status === "completed"
    ? await env.DB.prepare(`
        SELECT analysis_matches.*, analysis_documents.original_name AS source_name
        FROM analysis_matches JOIN analysis_documents ON analysis_documents.id = analysis_matches.source_document_id
        WHERE analysis_matches.job_id = ? ORDER BY analysis_matches.similarity_percent DESC LIMIT 20
      `).bind(jobId).all()
    : { results: [] };
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    attempts: job.attempts,
    error: job.error_message,
    originalName: job.original_name,
    wordCount: job.word_count,
    createdAt: job.created_at,
    report: job.status === "completed" ? {
      similarity: job.similarity_percent,
      matchedShingles: job.matched_shingles,
      totalShingles: job.total_shingles,
      coverage: job.coverage_note,
      recommendations: JSON.parse(job.recommendations_json || "[]"),
      matches: matches.results.map((match) => ({ sourceName: match.source_name, similarity: match.similarity_percent, excerpt: match.excerpt })),
    } : null,
  };
}

async function readFile(route, request, env) {
  const session = await requireSession(request, env);
  if (!env.UPLOADS) return json({ error: "Cloudflare R2 binding UPLOADS is not configured." }, 500);
  let key = decodeURIComponent(route.replace(/^files\//, ""));
  if (key.startsWith("note/")) {
    const noteId = key.slice(5);
    const note = await env.DB.prepare("SELECT object_key FROM lecture_notes WHERE id = ? AND published = 1").bind(noteId).first();
    if (!note) return json({ error: "File not found." }, 404);
    key = note.object_key;
  } else if (!await canReadPrivateKey(env, session, key)) {
    return json({ error: "You do not have permission to view this file." }, 403);
  }
  const object = await env.UPLOADS.get(key);
  if (!object) return json({ error: "File not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  for (const [name, value] of Object.entries(securityHeaders())) headers.set(name, value);
  headers.set("Cache-Control", "private, no-store");
  return new Response(object.body, { headers });
}

async function canReadPrivateKey(env, session, key) {
  if (session.role === "staff" || session.role === "admin") return true;
  if (key.startsWith("lecture-notes/")) return true;
  if (key.startsWith("complaint-proofs/")) return !!await env.DB.prepare("SELECT id FROM complaints WHERE user_id = ? AND proof_key = ?").bind(session.id, key).first();
  if (key.startsWith("payment-screenshots/") || key.startsWith("thesis-files/")) return !!await env.DB.prepare("SELECT id FROM thesis_requests WHERE user_id = ? AND (screenshot_key = ? OR thesis_key = ?)").bind(session.id, key, key).first();
  return false;
}

async function storeUpload(env, file, folder) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `${folder}/${crypto.randomUUID()}-${safeName}`;
  if (!env.UPLOADS) return key;
  await env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return key;
}
