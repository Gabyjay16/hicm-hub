import { processAnalysisJob } from "../lib/analysis-job.js";
import { cleanupExpiredLostItems } from "../lib/lost-found-cleanup.js";
import { announcementSchema, authSchema, complaintSchema, departments, evaluationSchema, forumTextSchema, lostFoundSchema, parseBody } from "../../shared/schemas.ts";

const DEPARTMENTS = [...departments];
const CHANNELS = ["General", ...DEPARTMENTS];
const DOCUMENT_TYPES = ["Attestation of Completion of Studies", "Draft Transcript", "Admission Letter", "Student Attendance", "Others"];

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
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/^v1\//, "");

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: { ...securityHeaders(), ...corsHeaders() } });
  }

  try {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is not configured." }, 500);
    enforceRequestBoundary(request, url);
    await ensureSchema(env.DB);
    await seedData(env.DB);
    if (isMutation(request) && !["auth", "auth/resolve", "admin/bootstrap"].includes(route)) await verifyMutation(request, env);

    if (route === "session" && request.method === "GET") return await getSessionResponse(request, env);
    if (route === "auth/resolve" && request.method === "POST") return await resolveAuthMode(request, env);
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
    if (route === "admin/forum/settings" && request.method === "GET") return await getForumSettings(request, env);
    if (route === "admin/forum/reports" && request.method === "GET") return await listForumReports(request, env);
    if (/^admin\/forum\/reports\/[^/]+$/.test(route) && request.method === "PATCH") return await reviewForumReport(route, request, env);
    if (route === "admin/audit" && request.method === "GET") return await listAuditLogs(request, env);
    if (route === "admin/analysis" && request.method === "GET") return await listAnalysisAdmin(request, env);
    if (route === "admin/analysis/settings" && request.method === "GET") return await getAnalysisSettings(request, env);
    if (route === "admin/analysis/settings" && request.method === "PATCH") return await updateAnalysisSettings(request, env);
    if (/^admin\/analysis\/[^/]+\/publish-result$/.test(route) && request.method === "PATCH") return await publishAnalysisResult(route, request, env);
    if (/^admin\/analysis\/[^/]+\/note$/.test(route) && request.method === "POST") return await addAnalysisAdminNote(route, request, env);
    if (/^admin\/analysis\/[^/]+\/restore-entitlement$/.test(route) && request.method === "POST") return await restoreAnalysisEntitlement(route, request, env);
    if (route === "admin/elections" && request.method === "POST") return await createElection(request, env);
    if (/^admin\/elections\/[^/]+$/.test(route) && request.method === "PATCH") return await updateElection(route, request, env);
    if (route === "admin/forum/moderation" && request.method === "GET") return await listForumModeration(request, env);
    if (/^admin\/forum\/messages\/[^/]+$/.test(route) && request.method === "PATCH") return await moderateForumMessage(route, request, env);
    if (/^admin\/forum\/users\/[^/]+$/.test(route) && request.method === "PATCH") return await restrictForumUser(route, request, env);
    if (route === "admin/matricule-registry" && request.method === "GET") return await getMatriculeRegistry(request, env);
    if (route === "admin/matricule-registry" && request.method === "POST") return await replaceMatriculeRegistry(request, env);
    if (route === "admin/matricule-registry" && request.method === "DELETE") return await clearMatriculeRegistry(request, env);
    if (route === "admin/matricule-registry/settings" && request.method === "PATCH") return await updateMatriculeRegistrySettings(request, env);

    if (route === "notifications" && request.method === "GET") return await listNotifications(request, env);
    if (route === "notifications/read-all" && request.method === "POST") return await readAllNotifications(request, env);
    if (/^notifications\/[^/]+$/.test(route) && request.method === "PATCH") return await readNotification(route, request, env);

    if (route === "announcements" && request.method === "GET") return await listAnnouncements(request, env);
    if (/^public\/announcements\/[^/]+\/media$/.test(route) && request.method === "GET") return await readAnnouncementMedia(route, env);
    if (route === "announcements" && request.method === "POST") return await createAnnouncement(request, env);
    if (/^announcements\/[^/]+$/.test(route) && request.method === "PATCH") return await updateAnnouncement(route, request, env);
    if (/^announcements\/[^/]+$/.test(route) && request.method === "DELETE") return await deleteAnnouncement(route, request, env);
    if (/^announcements\/[^/]+\/read$/.test(route) && request.method === "POST") return await markAnnouncementRead(route, request, env);

    if (route === "complaints" && request.method === "GET") return await listComplaints(request, env);
    if (route === "complaint-fields" && request.method === "GET") return await listComplaintFields(request, env);
    if (route === "admin/complaint-fields" && request.method === "POST") return await createComplaintField(request, env);
    if (/^admin\/complaint-fields\/[^/]+$/.test(route) && request.method === "DELETE") return await deleteComplaintField(route, request, env);
    if (route === "complaints" && request.method === "POST") return await createComplaint(request, env);
    if (route.startsWith("complaints/") && request.method === "PATCH") return await updateComplaint(route, request, env);
    if (/^complaints\/[^/]+$/.test(route) && request.method === "GET") return await getComplaint(route, request, env);

    if (route === "quizzes" && request.method === "GET") return await listQuizzes(request, env);
    if (route === "ai/ping" && request.method === "GET") return await pingGroq(request, env);
    if (route === "ai/evaluations/generate" && request.method === "POST") return await generateQuiz(request, env);
    if (route === "quizzes/generate" && request.method === "POST") return await generateQuiz(request, env);
    if (/^quizzes\/[^/]+$/.test(route) && request.method === "PATCH") return await updateQuiz(route, request, env);
    if (route.startsWith("quizzes/") && route.endsWith("/submit") && request.method === "POST") return await submitQuiz(route, request, env);
    if (route === "evaluations" && request.method === "POST") return await createEvaluation(request, env);
    if (/^evaluations\/[^/]+$/.test(route) && request.method === "GET") return await getEvaluation(route, request, env);
    if (/^evaluations\/[^/]+$/.test(route) && request.method === "PATCH") return await updateEvaluationLifecycle(route, request, env);
    if (/^evaluations\/[^/]+\/duplicate$/.test(route) && request.method === "POST") return await duplicateEvaluation(route, request, env);
    if (/^evaluations\/[^/]+\/start$/.test(route) && request.method === "POST") return await startEvaluation(route, request, env);
    if (/^evaluations\/[^/]+\/results$/.test(route) && request.method === "GET") return await evaluationResults(route, request, env, false);
    if (/^evaluations\/[^/]+\/export$/.test(route) && request.method === "GET") return await evaluationResults(route, request, env, true);
    if (/^evaluation-attempts\/[^/]+$/.test(route) && request.method === "GET") return await getEvaluationAttempt(route, request, env);
    if (/^evaluation-attempts\/[^/]+\/answers$/.test(route) && request.method === "PATCH") return await saveEvaluationAnswer(route, request, env);
    if (/^evaluation-attempts\/[^/]+\/submit$/.test(route) && request.method === "POST") return await submitEvaluationAttempt(route, request, env);

    if (route === "notes" && request.method === "GET") return await listNotes(request, env);
    if (route === "notes" && request.method === "POST") return await publishNote(request, env);
    if (/^notes\/[^/]+$/.test(route) && request.method === "PATCH") return await updateNote(route, request, env);
    if (/^notes\/[^/]+$/.test(route) && request.method === "DELETE") return await deleteNote(route, request, env);
    if (/^notes\/[^/]+\/replace$/.test(route) && request.method === "POST") return await replaceNote(route, request, env);

    if (route === "votes" && request.method === "GET") return await listVotes(request, env);
    if (route === "votes" && request.method === "POST") return await castVote(request, env);
    if (route === "elections" && request.method === "GET") return await listElections(request, env);
    if (/^elections\/[^/]+\/vote$/.test(route) && request.method === "POST") return await castElectionVote(route, request, env);

    if (route === "lost-found" && request.method === "GET") return await listLostFound(request, env);
    if (route === "lost-found" && request.method === "POST") return await createLostFound(request, env);
    if (/^lost-found\/[^/]+$/.test(route) && request.method === "PATCH") return await updateLostFound(route, request, env);
    if (/^lost-found\/[^/]+$/.test(route) && request.method === "DELETE") return await deleteLostFound(route, request, env);

    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "GET") return await listMessages(route, request, env);
    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "POST") return await createMessage(route, request, env);
    if (route === "forums/profile" && request.method === "PATCH") return await updateForumProfile(request, env);
    if (/^forums\/messages\/[^/]+\/report$/.test(route) && request.method === "POST") return await reportMessage(route, request, env);
    if (/^forums\/messages\/[^/]+\/media$/.test(route) && request.method === "GET") return await readForumMedia(route, request, env);
    if (/^forums\/messages\/[^/]+\/media$/.test(route) && request.method === "POST") return await readForumMedia(route, request, env, true);

    if (route === "document-requests" && request.method === "GET") return await listDocumentRequests(request, env);
    if (route === "document-requests" && request.method === "POST") return await createDocumentRequest(request, env);
    if (/^document-requests\/[^/]+$/.test(route) && request.method === "PATCH") return await reviewDocumentRequest(route, request, env);

    if (route === "thesis" && request.method === "GET") return await getThesis(request, env);
    if (route === "thesis/verify" && request.method === "GET") return await verifyThesisResult(request, env);
    if (route === "thesis/payment" && request.method === "POST") return await submitPayment(request, env);
    if (route === "thesis/upload" && request.method === "POST") return await uploadThesis(request, env, context);
    if (/^thesis\/jobs\/[^/]+$/.test(route) && request.method === "GET") return await getAnalysisJob(route, request, env);
    if (/^thesis\/jobs\/[^/]+\/retry$/.test(route) && request.method === "POST") return await retryAnalysisJob(route, request, env, context);
    if (/^thesis\/jobs\/[^/]+\/report$/.test(route) && request.method === "GET") return await downloadAnalysisReport(route, request, env);
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
    "Permissions-Policy": "camera=(self), geolocation=(), microphone=(self)",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  };
}

function corsHeaders() {
  return { "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token, Idempotency-Key", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" };
}

function isMutation(request) {
  return ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
}

function enforceRequestBoundary(request, url) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 30 * 1024 * 1024) throw Object.assign(new Error("Request is too large."), { status: 413 });
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if ((origin && origin !== url.origin) || fetchSite === "cross-site") throw Object.assign(new Error("Cross-site requests are not allowed."), { status: 403 });
}

async function verifyMutation(request, env) {
  const session = await currentSession(request, env);
  if (!session) throw Object.assign(new Error("Your session has expired. Please sign in again."), { status: 401, code: "SESSION_EXPIRED" });
  const supplied = request.headers.get("X-CSRF-Token") || "";
  if (!session.csrf_token || !safeEqual(supplied, session.csrf_token)) throw Object.assign(new Error("This request could not be verified. Refresh and try again."), { status: 403, code: "CSRF_INVALID" });
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
    await db.prepare("INSERT INTO announcements (id, title, body, author, created_at) VALUES (?, ?, ?, ?, ?)").bind(id("ann"), "Welcome to HICM HUB", "All official notices, voting, academic tools, complaints, and campus conversations now live in one secure portal.", "Academic Affairs", now()).run();
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
      await db.prepare("INSERT INTO lost_items (id, type, title, location, contact, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id("item"), item[0], item[1], item[2], item[3], null, now()).run();
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
    SELECT sessions.token, sessions.view_role, sessions.csrf_token, sessions.expires_at, users.*,
      COALESCE(staff_permissions.is_admin, 0) AS is_admin,
      COALESCE(staff_permissions.forum_access, 0) AS forum_access,
      COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
    FROM sessions
    JOIN users ON sessions.user_id = users.id
    LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
    WHERE sessions.token = ? AND datetime(sessions.expires_at) > CURRENT_TIMESTAMP AND users.account_status = 'active'
  `).bind(token).first();
  if (!session) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  if (!session.csrf_token) {
    session.csrf_token = crypto.randomUUID();
    await env.DB.prepare("UPDATE sessions SET csrf_token = ? WHERE token = ?").bind(session.csrf_token, token).run();
  }
  await env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token = ?").bind(now(), token).run();
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
  return json({ session: session ? presentSession(session) : null, candidates: CANDIDATES, channels: session ? availableChannels(session) : [] });
}

function availableChannels(session) {
  if (session.role === "admin") return CHANNELS;
  if (session.role === "staff") return session.forum_access ? CHANNELS : [];
  return ["General", ...(DEPARTMENTS.includes(session.department) ? [session.department] : [])];
}

function presentSession(session) {
  return {
    csrfToken: session.csrf_token,
    expiresAt: session.expires_at,
    viewRole: session.view_role,
    user: {
      id: session.id,
      role: session.role,
      name: session.name,
      position: session.position,
      matricule: session.matricule,
      phone: session.phone,
      department: session.department,
      forumAlias: session.forum_alias,
      forumAccess: session.role === "admin" || Boolean(session.forum_access),
      moderationAccess: session.role === "admin" || Boolean(session.moderation_access),
    },
  };
}

async function authenticate(request, env) {
  const body = parseBody(authSchema, await request.json());
  await enforceRateLimit(env, request, "authenticate", 8, 15 * 60);
  if (!env.PASSWORD_PEPPER) return json({ error: "Password authentication is not configured." }, 503);

  const operation = body.mode || (body.accessCode ? "staff-register" : "login");
  const password = String(body.password || "");
  let user;

  if (operation === "student-register") {
    const name = String(body.name || "").trim();
    const matricule = normalizeMatricule(body.matricule);
    const phone = String(body.phone || "").trim();
    const department = String(body.department || "");
    if (!name || !matricule || !phone || !DEPARTMENTS.includes(department)) return json({ error: "Complete every student registration field." }, 400);
    if (password !== body.confirmPassword) return json({ error: "The passwords do not match." }, 400);

    const registry = await env.DB.prepare("SELECT * FROM student_registration_settings WHERE id = 'default'").first();
    if (registry?.enforced) {
      const allowed = registry.active_batch_id
        ? await env.DB.prepare("SELECT 1 AS allowed FROM student_matricule_registry WHERE batch_id = ? AND normalized_matricule = ?").bind(registry.active_batch_id, matricule).first()
        : null;
      if (!allowed) return json({ error: "student having this matricule is not an HICM student" }, 403);
    }

    const existing = await env.DB.prepare("SELECT * FROM users WHERE role = 'student' AND UPPER(TRIM(matricule)) = ?").bind(matricule).first();
    const credentials = await hashPassword(password, env.PASSWORD_PEPPER);
    if (existing?.password_hash) return json({ error: "This matricule has already been used for registration." }, 409);
    if (existing) {
      const sameLegacyOwner = existing.name.trim().toLowerCase() === name.toLowerCase() && String(existing.phone || "").replace(/\D/g, "") === phone.replace(/\D/g, "");
      if (!sameLegacyOwner) return json({ error: "This matricule has already been used for registration." }, 409);
      await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, department = ?, name = ?, phone = ? WHERE id = ?")
        .bind(credentials.hash, credentials.salt, department, name, phone, existing.id).run();
      user = { ...existing, name, phone, department, password_hash: credentials.hash, password_salt: credentials.salt };
    } else {
      user = { id: id("usr"), role: "student", name, position: null, matricule, phone, department, created_at: now(), account_status: "active" };
      try {
        await env.DB.prepare("INSERT INTO users (id, role, name, normalized_name, position, matricule, phone, department, created_at, password_hash, password_salt) VALUES (?, 'student', ?, ?, NULL, ?, ?, ?, ?, ?, ?)")
          .bind(user.id, name, name.toLowerCase(), matricule, phone, department, user.created_at, credentials.hash, credentials.salt).run();
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) return json({ error: "This matricule has already been used for registration." }, 409);
        throw error;
      }
      await audit(env, user.id, "student.registered", "user", user.id, { department });
    }
  } else if (operation === "staff-register") {
      const name = String(body.name || "").trim();
      const normalizedName = name.toLowerCase();
      const accessCode = String(body.accessCode || body.credential || "").trim().toUpperCase();
      const code = await env.DB.prepare("SELECT id FROM staff_access_codes WHERE code = ? AND revoked_at IS NULL AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").bind(accessCode).first();
      if (!code) return json({ error: "This staff access code is invalid, expired, or already used." }, 403);
      if (!name || !body.position || !body.phone) return json({ error: "Complete every staff registration field." }, 400);
      const credentials = await hashPassword(password, env.PASSWORD_PEPPER);
      if (password !== body.confirmPassword) return json({ error: "The passwords do not match." }, 400);
      user = { id: id("usr"), role: "staff", name, position: String(body.position).trim(), matricule: null, phone: String(body.phone || "").trim(), department: null, created_at: now(), account_status: "active", forum_access: 0, moderation_access: 0 };
      try {
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO users (id, role, name, normalized_name, position, matricule, phone, created_at, password_hash, password_salt, staff_code_id)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, id FROM staff_access_codes
            WHERE id = ? AND revoked_at IS NULL AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
          `).bind(user.id, user.role, user.name, normalizedName, user.position, user.matricule, user.phone, user.created_at, credentials.hash, credentials.salt, code.id),
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
  } else {
    const identifier = String(body.identifier || body.credential || body.matricule || body.name || "").trim();
    if (!identifier || !password) return json({ error: "Enter your matricule or staff name and password." }, 400);
    const normalizedIdentifier = identifier.toLowerCase();
    user = await env.DB.prepare(`
      SELECT users.*, COALESCE(staff_permissions.is_admin, 0) AS is_admin,
        COALESCE(staff_permissions.forum_access, 0) AS forum_access,
        COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
      FROM users LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
      WHERE (users.role = 'student' AND UPPER(TRIM(users.matricule)) = ?)
         OR (users.role = 'staff' AND LOWER(TRIM(users.name)) = ?)
      ORDER BY CASE WHEN users.role = 'student' THEN 0 ELSE 1 END LIMIT 1
    `).bind(normalizeMatricule(identifier), normalizedIdentifier).first();
    if (!user || !user.password_hash || !await verifyPassword(password, user.password_salt, user.password_hash, env.PASSWORD_PEPPER)) return json({ error: "The supplied login details are not valid." }, 401);
  }

  if (user.account_status === "blocked") return json({ error: "The supplied login details are not valid." }, 401);

  const token = crypto.randomUUID();
  const csrfToken = crypto.randomUUID();
  const remembered = Boolean(body.remember);
  const maxAge = remembered ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();
  const viewRole = user.role === "student" ? "student" : "staff";
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sessions (token, user_id, view_role, created_at, csrf_token, expires_at, last_seen_at, remembered) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(token, user.id, viewRole, now(), csrfToken, expiresAt, now(), remembered ? 1 : 0),
    env.DB.prepare("UPDATE users SET last_login_at = ?, normalized_name = COALESCE(normalized_name, ?) WHERE id = ?").bind(now(), user.name.trim().toLowerCase(), user.id),
  ]);
  const session = { token, csrf_token: csrfToken, expires_at: expiresAt, view_role: viewRole, ...user };
  if (user.is_admin) session.role = "admin";
  return json({ session: presentSession(session), candidates: CANDIDATES, channels: availableChannels(session) }, 200, { "Set-Cookie": `hicm_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=${maxAge}` });
}

function normalizeMatricule(value) {
  return String(value || "").trim().toUpperCase();
}

async function resolveAuthMode(request, env) {
  await enforceRateLimit(env, request, "auth_resolve", 20, 15 * 60);
  const body = await request.json();
  const credential = String(body.credential || "").trim().toUpperCase();
  const code = /^STF-/.test(credential) ? await env.DB.prepare("SELECT id FROM staff_access_codes WHERE code = ? AND revoked_at IS NULL AND used_at IS NULL AND datetime(expires_at) > CURRENT_TIMESTAMP").bind(credential).first() : null;
  return json({ mode: code ? "staff-registration" : "login" });
}

async function enforceRateLimit(env, request, action, limit, windowSeconds) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${action}:${ip}`));
  const key = Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const row = await env.DB.prepare("SELECT * FROM request_rate_limits WHERE bucket_key = ?").bind(key).first();
  const timestamp = Date.now();
  const started = row ? Date.parse(row.window_started_at) : 0;
  if (row?.blocked_until && Date.parse(row.blocked_until) > timestamp) throw Object.assign(new Error("Too many attempts. Please wait and try again."), { status: 429 });
  const count = row && timestamp - started < windowSeconds * 1000 ? Number(row.request_count) + 1 : 1;
  const windowStart = count === 1 ? now() : row.window_started_at;
  const blockedUntil = count > limit ? new Date(timestamp + windowSeconds * 1000).toISOString() : null;
  await env.DB.prepare(`INSERT INTO request_rate_limits (bucket_key, action, window_started_at, request_count, blocked_until, updated_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(bucket_key) DO UPDATE SET window_started_at = excluded.window_started_at, request_count = excluded.request_count, blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`)
    .bind(key, action, windowStart, count, blockedUntil, now()).run();
  if (blockedUntil) throw Object.assign(new Error("Too many attempts. Please wait and try again."), { status: 429 });
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
  const [users, students, staff, openComplaints, pendingPayments, queuedAnalysis, unreadReports, openDocuments] = await Promise.all([
    count(env.DB, "users"),
    env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'student'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'staff'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM complaints WHERE status <> 'Resolved'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM thesis_requests WHERE status = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM analysis_jobs WHERE status IN ('queued', 'processing', 'failed')").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM forum_reports WHERE status = 'open'").first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM document_requests WHERE status IN ('submitted', 'reviewing')").first(),
  ]);
  return json({ metrics: { users, students: students.total, staff: staff.total, openComplaints: openComplaints.total, pendingPayments: pendingPayments.total, queuedAnalysis: queuedAnalysis.total, openForumReports: unreadReports.total, openDocuments: openDocuments.total } });
}

async function adminUsers(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT users.id, users.name, users.role, users.position, users.matricule, users.phone, users.department, users.account_status, users.created_at,
      COALESCE(staff_permissions.is_admin, 0) AS is_admin,
      COALESCE(staff_permissions.forum_access, 0) AS forum_access,
      COALESCE(staff_permissions.moderation_access, 0) AS moderation_access
    FROM users LEFT JOIN staff_permissions ON staff_permissions.user_id = users.id
    ORDER BY users.created_at DESC LIMIT 250
  `).all();
  return json({ users: rows.results });
}

async function getMatriculeRegistry(request, env) {
  await requireAdmin(request, env);
  const settings = await env.DB.prepare("SELECT * FROM student_registration_settings WHERE id = 'default'").first();
  const rows = settings?.active_batch_id
    ? await env.DB.prepare("SELECT matricule FROM student_matricule_registry WHERE batch_id = ? ORDER BY matricule LIMIT 100").bind(settings.active_batch_id).all()
    : { results: [] };
  return json({
    settings: settings || { enforced: 0, total_records: 0 },
    preview: rows.results.map((row) => row.matricule),
  });
}

async function replaceMatriculeRegistry(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  if (!Array.isArray(body.matricules)) return json({ error: "Upload an Excel or CSV file containing matricules." }, 400);
  const matricules = [...new Set(body.matricules.map(normalizeMatricule).filter((value) => value.length >= 2 && value.length <= 40))];
  if (!matricules.length) return json({ error: "No valid matricules were found in this file." }, 400);
  if (matricules.length > 10000) return json({ error: "A matricule file can contain at most 10,000 unique records." }, 400);

  const batchId = id("registry");
  const timestamp = now();
  for (let offset = 0; offset < matricules.length; offset += 75) {
    await env.DB.batch(matricules.slice(offset, offset + 75).map((matricule) => env.DB.prepare(
      "INSERT INTO student_matricule_registry (batch_id, matricule, normalized_matricule, imported_at, imported_by) VALUES (?, ?, ?, ?, ?)",
    ).bind(batchId, matricule, matricule, timestamp, session.id)));
  }
  const previous = await env.DB.prepare("SELECT active_batch_id FROM student_registration_settings WHERE id = 'default'").first();
  await env.DB.prepare(`UPDATE student_registration_settings SET active_batch_id = ?, source_name = ?, total_records = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ? WHERE id = 'default'`)
    .bind(batchId, String(body.sourceName || "matricules.xlsx").slice(0, 180), matricules.length, session.id, timestamp, timestamp).run();
  if (previous?.active_batch_id) await env.DB.prepare("DELETE FROM student_matricule_registry WHERE batch_id = ?").bind(previous.active_batch_id).run();
  await audit(env, session.id, "student_registry.replaced", "student_matricule_registry", batchId, { count: matricules.length, sourceName: body.sourceName });
  return getMatriculeRegistry(request, env);
}

async function updateMatriculeRegistrySettings(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  const current = await env.DB.prepare("SELECT * FROM student_registration_settings WHERE id = 'default'").first();
  if (body.enforced && !Number(current?.total_records)) return json({ error: "Upload a matricule file before enabling registration enforcement." }, 409);
  await env.DB.prepare("UPDATE student_registration_settings SET enforced = ?, updated_at = ? WHERE id = 'default'").bind(body.enforced ? 1 : 0, now()).run();
  await audit(env, session.id, "student_registry.enforcement_updated", "student_registration_settings", "default", { enforced: Boolean(body.enforced) });
  return getMatriculeRegistry(request, env);
}

async function clearMatriculeRegistry(request, env) {
  const session = await requireAdmin(request, env);
  const current = await env.DB.prepare("SELECT active_batch_id FROM student_registration_settings WHERE id = 'default'").first();
  await env.DB.prepare("UPDATE student_registration_settings SET enforced = 0, active_batch_id = NULL, source_name = NULL, total_records = 0, uploaded_by = NULL, uploaded_at = NULL, updated_at = ? WHERE id = 'default'").bind(now()).run();
  if (current?.active_batch_id) await env.DB.prepare("DELETE FROM student_matricule_registry WHERE batch_id = ?").bind(current.active_batch_id).run();
  await audit(env, session.id, "student_registry.cleared", "student_registration_settings", "default");
  return getMatriculeRegistry(request, env);
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
  const current = await env.DB.prepare("SELECT * FROM forum_settings WHERE channel = ?").bind(channel).first();
  await env.DB.prepare(`
    INSERT INTO forum_settings (channel, links_enabled, images_enabled, audio_enabled, image_max_bytes, audio_max_bytes, suspended, suspension_message, updated_by, updated_at)
    VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(channel) DO UPDATE SET links_enabled = 0, images_enabled = excluded.images_enabled, audio_enabled = excluded.audio_enabled, image_max_bytes = excluded.image_max_bytes, audio_max_bytes = excluded.audio_max_bytes, suspended = excluded.suspended, suspension_message = excluded.suspension_message, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).bind(channel, (body.imagesEnabled ?? Boolean(current?.images_enabled)) ? 1 : 0, (body.audioEnabled ?? Boolean(current?.audio_enabled)) ? 1 : 0, Math.max(1048576, Math.min(20971520, Number(body.imageMaxBytes || current?.image_max_bytes || 10485760))), Math.max(1048576, Math.min(52428800, Number(body.audioMaxBytes || current?.audio_max_bytes || 26214400))), (body.suspended ?? Boolean(current?.suspended)) ? 1 : 0, String(body.suspensionMessage || current?.suspension_message || `#${channel} is temporarily suspended by administration.`).slice(0, 240), session.id, now()).run();
  await audit(env, session.id, "forum.settings_updated", "forum_channel", channel, body);
  return getForumSettings(request, env);
}

async function getForumSettings(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare("SELECT * FROM forum_settings ORDER BY CASE WHEN channel = 'General' THEN 0 ELSE 1 END, channel").all();
  return json({ settings: rows.results });
}

async function listForumReports(request, env) {
  await requireAdmin(request, env);
  const rows = await env.DB.prepare(`
    SELECT forum_reports.*, messages.body, messages.author, messages.channel, messages.message_type,
      users.name AS reporter_name, message_users.name AS author_real_name
    FROM forum_reports JOIN messages ON messages.id = forum_reports.message_id
    JOIN users ON users.id = forum_reports.reporter_id
    LEFT JOIN users message_users ON message_users.id = messages.user_id
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
      analysis_reports.similarity_percent, analysis_reports.matched_shingles, analysis_reports.total_shingles,
      analysis_reports.thesis_title, analysis_reports.plagiarism_percent, analysis_reports.ai_use_percent,
      analysis_reports.verification_code, analysis_reports.published_at
    FROM analysis_jobs JOIN analysis_documents ON analysis_documents.id = analysis_jobs.document_id
    JOIN users ON users.id = analysis_jobs.user_id
    LEFT JOIN analysis_reports ON analysis_reports.job_id = analysis_jobs.id
    ORDER BY analysis_jobs.created_at DESC LIMIT 100
  `).all();
  return json({ jobs: rows.results });
}

async function publishAnalysisResult(route, request, env) {
  const session = await requireAdmin(request, env);
  const jobId = route.split("/")[2];
  const body = await request.json();
  const title = String(body.thesisTitle || "").trim();
  const plagiarism = Number(body.plagiarismPercent);
  const aiUse = Number(body.aiUsePercent);
  if (title.length < 3 || title.length > 240 || !Number.isFinite(plagiarism) || !Number.isFinite(aiUse) || plagiarism < 0 || plagiarism > 100 || aiUse < 0 || aiUse > 100) {
    return json({ error: "Enter a thesis title and percentages between 0 and 100." }, 400);
  }
  const report = await env.DB.prepare(`SELECT analysis_reports.id, analysis_reports.verification_code, analysis_jobs.status, analysis_jobs.user_id
    FROM analysis_reports JOIN analysis_jobs ON analysis_jobs.id = analysis_reports.job_id WHERE analysis_reports.job_id = ?`).bind(jobId).first();
  if (!report || report.status !== "completed") return json({ error: "A completed analysis report is required before publication." }, 409);
  const code = report.verification_code || await uniqueVerificationCode(env);
  await env.DB.prepare(`UPDATE analysis_reports SET thesis_title = ?, plagiarism_percent = ?, ai_use_percent = ?, verification_code = ?, published_at = ?, published_by = ? WHERE job_id = ?`)
    .bind(title, plagiarism, aiUse, code, now(), session.id, jobId).run();
  await notify(env, report.user_id, "thesis_result", "Your thesis result is ready", `${title}: plagiarism ${plagiarism}%, AI use ${aiUse}%.`, "/thesis");
  await audit(env, session.id, "analysis.result_published", "analysis_job", jobId, { code, plagiarism, aiUse });
  return listAnalysisAdmin(request, env);
}

async function uniqueVerificationCode(env) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    const code = `HICM-PLG-${value.slice(0, 4)}-${value.slice(4)}`;
    if (!await env.DB.prepare("SELECT id FROM analysis_reports WHERE verification_code = ?").bind(code).first()) return code;
  }
  throw Object.assign(new Error("Could not issue a unique verification code. Try again."), { status: 503 });
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

async function listAnnouncements(request, env) {
  const session = await currentSession(request, env);
  const rows = session?.role === "admin"
    ? await env.DB.prepare(`SELECT announcements.*, announcement_reads.read_at FROM announcements LEFT JOIN announcement_reads ON announcement_reads.announcement_id = announcements.id AND announcement_reads.user_id = ? ORDER BY COALESCE(publish_at, created_at) DESC`).bind(session.id).all()
    : session
      ? await env.DB.prepare(`SELECT announcements.*, announcement_reads.read_at FROM announcements LEFT JOIN announcement_reads ON announcement_reads.announcement_id = announcements.id AND announcement_reads.user_id = ?
        WHERE announcements.status = 'published' AND datetime(COALESCE(announcements.publish_at, announcements.created_at)) <= CURRENT_TIMESTAMP ORDER BY COALESCE(announcements.publish_at, announcements.created_at) DESC`).bind(session.id).all()
      : await env.DB.prepare(`SELECT announcements.*, NULL AS read_at FROM announcements WHERE status = 'published' AND datetime(COALESCE(publish_at, created_at)) <= CURRENT_TIMESTAMP ORDER BY COALESCE(publish_at, created_at) DESC LIMIT 20`).all();
  return json({ announcements: rows.results.map((item) => ({ ...item, media_url: item.media_key ? `/api/public/announcements/${encodeURIComponent(item.id)}/media` : null })) });
}

async function createAnnouncement(request, env) {
  const session = await requireAdmin(request, env);
  const contentType = request.headers.get("Content-Type") || "";
  const form = contentType.includes("multipart/form-data") ? await request.formData() : null;
  const raw = form ? { title: form.get("title"), body: form.get("body"), status: form.get("status") || "published", publishAt: form.get("publishAt") || null } : await request.json();
  const body = parseBody(announcementSchema, raw);
  const media = form?.get("media");
  const mediaError = media?.name ? await validateAnnouncementMedia(media) : null;
  if (mediaError) return json({ error: mediaError }, 400);
  const mediaKey = media?.name ? await storeUpload(env, media, "announcement-media") : null;
  const announcementId = id("ann");
  const status = body.status === "scheduled" && !body.publishAt ? "draft" : body.status;
  try {
    await env.DB.prepare(`INSERT INTO announcements (id, title, body, author, author_id, status, publish_at, created_at, updated_at, media_key, media_type, media_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(announcementId, body.title, body.body, session.name, session.id, status, body.publishAt || (status === "published" ? now() : null), now(), now(), mediaKey, media?.type || null, media?.name || null).run();
  } catch (error) { if (mediaKey && env.UPLOADS) await env.UPLOADS.delete(mediaKey); throw error; }
  if (status === "published") await notifyStudents(env, "announcement", body.title, body.body.slice(0, 240), `/announcements?announcement=${encodeURIComponent(announcementId)}`);
  await audit(env, session.id, "announcement.created", "announcement", announcementId, { title: body.title, status });
  return listAnnouncements(request, env);
}

async function updateAnnouncement(route, request, env) {
  const session = await requireAdmin(request, env);
  const announcementId = route.split("/")[1];
  const current = await env.DB.prepare("SELECT * FROM announcements WHERE id = ?").bind(announcementId).first();
  if (!current) return json({ error: "Announcement not found." }, 404);
  const body = parseBody(announcementSchema, await request.json());
  const status = body.status;
  const publishAt = body.publishAt || (status === "published" ? current.publish_at || now() : null);
  await env.DB.prepare("UPDATE announcements SET title = ?, body = ?, status = ?, publish_at = ?, archived_at = CASE WHEN ? = 'archived' THEN ? ELSE NULL END, updated_at = ? WHERE id = ?")
    .bind(body.title, body.body, status, publishAt, status, now(), now(), announcementId).run();
  if (status === "published" && current.status !== "published") await notifyStudents(env, "announcement", body.title, body.body.slice(0, 240), `/announcements?announcement=${encodeURIComponent(announcementId)}`);
  await audit(env, session.id, "announcement.updated", "announcement", announcementId, { status });
  return listAnnouncements(request, env);
}

async function deleteAnnouncement(route, request, env) {
  const session = await requireAdmin(request, env);
  const announcementId = route.split("/")[1];
  const announcement = await env.DB.prepare("SELECT media_key FROM announcements WHERE id = ?").bind(announcementId).first();
  await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(announcementId).run();
  if (announcement?.media_key && env.UPLOADS) await env.UPLOADS.delete(announcement.media_key);
  await audit(env, session.id, "announcement.deleted", "announcement", announcementId);
  return listAnnouncements(request, env);
}

async function readAnnouncementMedia(route, env) {
  if (!env.UPLOADS) return json({ error: "File storage is unavailable." }, 503);
  const announcementId = route.split("/")[2];
  const announcement = await env.DB.prepare(`SELECT media_key, media_type, media_name FROM announcements
    WHERE id = ? AND status = 'published' AND datetime(COALESCE(publish_at, created_at)) <= CURRENT_TIMESTAMP`).bind(announcementId).first();
  if (!announcement?.media_key) return json({ error: "Announcement media not found." }, 404);
  const object = await env.UPLOADS.get(announcement.media_key);
  if (!object) return json({ error: "Announcement media not found." }, 404);
  const headers = new Headers({ ...securityHeaders(), "Content-Type": announcement.media_type || "application/octet-stream", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" });
  return new Response(object.body, { headers });
}

async function validateAnnouncementMedia(file) {
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) return validateImage(file, 10 * 1024 * 1024);
  if (!type.startsWith("video/") || file.size > 50 * 1024 * 1024) return "Use a JPG, PNG, WebP, MP4, or WebM file (videos up to 50 MB).";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["mp4", "webm"].includes(extension)) return "Announcement videos must be MP4 or WebM.";
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = String.fromCharCode(...bytes);
  const valid = extension === "mp4" ? signature.includes("ftyp") : bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return valid ? null : "The video contents do not match its extension.";
}

async function markAnnouncementRead(route, request, env) {
  const session = await requireSession(request, env);
  const announcementId = route.split("/")[1];
  await env.DB.prepare(`INSERT INTO announcement_reads (announcement_id, user_id, read_at) VALUES (?, ?, ?)
    ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at = excluded.read_at`).bind(announcementId, session.id, now()).run();
  return json({ ok: true });
}

async function listComplaints(request, env) {
  const session = await requireSession(request, env);
  const query = session.role === "admin"
    ? env.DB.prepare("SELECT * FROM complaints ORDER BY created_at DESC")
    : env.DB.prepare("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC").bind(session.id);
  const rows = await query.all();
  return json({ complaints: rows.results });
}

async function createComplaint(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student") return json({ error: "Only student accounts can submit complaints." }, 403);
  const form = await request.formData();
  const parsed = parseBody(complaintSchema, { category: form.get("category"), description: form.get("description") });
  const courseName = String(form.get("courseName") || "").trim();
  const courseCode = String(form.get("courseCode") || "").trim().toUpperCase();
  const academicYear = String(form.get("academicYear") || "").trim();
  const semester = String(form.get("semester") || "").trim();
  const contactPhone = String(form.get("phone") || session.phone || "").trim();
  if (parsed.category === "Mark Complaint" && (!courseName || !courseCode || !academicYear || !semester || !contactPhone)) return json({ error: "Complete every mark complaint field." }, 400);
  const customFields = await env.DB.prepare("SELECT * FROM complaint_form_fields WHERE active = 1 ORDER BY position, created_at").all();
  const customAnswers = customFields.results.map((field) => ({
    field,
    answer: String(form.get(`custom_${field.id}`) || "").trim(),
  }));
  const missingField = customAnswers.find(({ field, answer }) => field.required && !answer);
  if (missingField) return json({ error: `${missingField.field.label} is required.` }, 400);
  const proof = form.get("proof");
  if (proof?.name && proof.size > 10 * 1024 * 1024) return json({ error: "Evidence must be 10 MB or smaller." }, 400);
  const proofKey = proof && proof.name ? await storeUpload(env, proof, "complaint-evidence") : null;
  const complaintId = id("cmp");
  const timestamp = now();
  const statements = [env.DB.prepare(`INSERT INTO complaints (id, user_id, student_name, matricule, category, description, proof_key, status, created_at, course_name, course_code, academic_year, semester, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)`)
    .bind(complaintId, session.id, session.name, session.matricule, parsed.category, parsed.description, proofKey, timestamp, courseName || null, courseCode || null, academicYear || null, semester || null, contactPhone || null)];
  for (const { field, answer } of customAnswers) {
    statements.push(env.DB.prepare("INSERT INTO complaint_form_answers (complaint_id, field_id, field_label, answer) VALUES (?, ?, ?, ?)").bind(complaintId, field.id, field.label, answer || null));
  }
  if (proofKey) statements.push(env.DB.prepare("INSERT INTO complaint_attachments (id, complaint_id, owner_id, object_key, original_name, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id("attachment"), complaintId, session.id, proofKey, proof.name, proof.type || "application/octet-stream", proof.size, timestamp));
  try { await env.DB.batch(statements); } catch (error) { if (proofKey && env.UPLOADS) await env.UPLOADS.delete(proofKey); throw error; }
  await audit(env, session.id, "complaint.submitted", "complaint", complaintId, { category: parsed.category });
  return listComplaints(request, env);
}

async function updateComplaint(route, request, env) {
  const session = await requireAdmin(request, env);
  const complaintId = route.split("/")[1];
  const body = await request.json();
  const status = ["Pending", "Reviewing", "Resolved"].includes(body.status) ? body.status : "Pending";
  const response = String(body.response || "").trim().slice(0, 3000);
  await env.DB.batch([
    env.DB.prepare("UPDATE complaints SET status = ? WHERE id = ?").bind(status, complaintId),
    env.DB.prepare("INSERT INTO complaint_updates (id, complaint_id, actor_id, status, response, internal_only, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)").bind(id("complaint_update"), complaintId, session.id, status, response || null, now()),
  ]);
  const complaint = await env.DB.prepare("SELECT user_id, category FROM complaints WHERE id = ?").bind(complaintId).first();
  if (complaint) await notify(env, complaint.user_id, "complaint", "Complaint status updated", `${complaint.category} is now ${status}.`, "/complaints");
  await audit(env, session.id, "complaint.status_updated", "complaint", complaintId, { status });
  return listComplaints(request, env);
}

async function getComplaint(route, request, env) {
  const session = await requireSession(request, env);
  const complaintId = route.split("/")[1];
  const complaint = await env.DB.prepare("SELECT * FROM complaints WHERE id = ?").bind(complaintId).first();
  if (!complaint) return json({ error: "Complaint not found." }, 404);
  if (session.role !== "admin" && complaint.user_id !== session.id) return json({ error: "You cannot access this complaint." }, 403);
  const updates = await env.DB.prepare("SELECT complaint_updates.*, users.name AS actor_name FROM complaint_updates JOIN users ON users.id = complaint_updates.actor_id WHERE complaint_id = ? AND (? = 1 OR internal_only = 0) ORDER BY created_at").bind(complaintId, session.role === "admin" ? 1 : 0).all();
  const attachments = await env.DB.prepare("SELECT id, original_name, mime_type, file_size, object_key FROM complaint_attachments WHERE complaint_id = ?").bind(complaintId).all();
  const answers = await env.DB.prepare("SELECT field_id, field_label, answer FROM complaint_form_answers WHERE complaint_id = ?").bind(complaintId).all();
  return json({ complaint, updates: updates.results, customAnswers: answers.results, attachments: attachments.results.map((item) => ({ ...item, url: `/api/files/${encodeURIComponent(item.object_key)}` })) });
}

async function listComplaintFields(request, env) {
  await requireSession(request, env);
  const rows = await env.DB.prepare("SELECT id, label, field_type, options_json, required, position FROM complaint_form_fields WHERE active = 1 ORDER BY position, created_at").all();
  return json({ fields: rows.results.map((field) => ({ ...field, options: JSON.parse(field.options_json || "[]") })) });
}

async function createComplaintField(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  const label = String(body.label || "").trim();
  const fieldType = ["text", "textarea", "number", "date", "select"].includes(body.fieldType) ? body.fieldType : "text";
  const options = Array.isArray(body.options) ? body.options.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : [];
  if (label.length < 2) return json({ error: "Field label is required." }, 400);
  if (fieldType === "select" && options.length < 2) return json({ error: "A select field needs at least two options." }, 400);
  const position = await env.DB.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM complaint_form_fields").first();
  const fieldId = id("complaint_field");
  await env.DB.prepare("INSERT INTO complaint_form_fields (id, label, field_type, options_json, required, active, position, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)")
    .bind(fieldId, label, fieldType, JSON.stringify(options), body.required ? 1 : 0, position.next_position, session.id, now(), now()).run();
  await audit(env, session.id, "complaint_field.created", "complaint_form_field", fieldId, { label, fieldType });
  return listComplaintFields(request, env);
}

async function deleteComplaintField(route, request, env) {
  const session = await requireAdmin(request, env);
  const fieldId = route.split("/")[2];
  await env.DB.prepare("UPDATE complaint_form_fields SET active = 0, updated_at = ? WHERE id = ?").bind(now(), fieldId).run();
  await audit(env, session.id, "complaint_field.deleted", "complaint_form_field", fieldId);
  return listComplaintFields(request, env);
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
  const safeQuestion = { ...question };
  delete safeQuestion.answer;
  delete safeQuestion.correctOptionIndex;
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
  const session = await requireSession(request, env);
  const url = new URL(request.url);
  const search = `%${String(url.searchParams.get("q") || "").trim()}%`;
  const department = String(url.searchParams.get("department") || "");
  const level = String(url.searchParams.get("level") || "");
  const semester = String(url.searchParams.get("semester") || "");
  const academicYear = String(url.searchParams.get("academicYear") || "");
  const manage = session.role === "staff" || session.role === "admin";
  const rows = await env.DB.prepare(`
    SELECT id, owner_id, course_code, course_title, department, level, semester, academic_year,
      lecturer_name, original_name, mime_type, file_size, published, status, view_count, download_count, created_at, updated_at
    FROM lecture_notes
    WHERE deleted_at IS NULL
      AND (? = 1 OR (published = 1 AND status = 'published'))
      AND (? = 0 OR owner_id = ?)
      AND (course_code LIKE ? COLLATE NOCASE OR course_title LIKE ? COLLATE NOCASE OR lecturer_name LIKE ? COLLATE NOCASE)
      AND (? = '' OR department = ?) AND (? = '' OR level = ?) AND (? = '' OR semester = ?) AND (? = '' OR academic_year = ?)
    ORDER BY created_at DESC LIMIT 100
  `).bind(manage ? 1 : 0, session.role === "staff" ? 1 : 0, session.id, search, search, search, department, department, level, level, semester, semester, academicYear, academicYear).all();
  return json({ notes: rows.results.map((note) => ({ ...note, file_url: `/api/files/note/${encodeURIComponent(note.id)}`, download_url: `/api/files/note/${encodeURIComponent(note.id)}?download=1` })) });
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
  const timestamp = now();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO lecture_notes (id, owner_id, course_code, course_title, department, level, semester, academic_year, lecturer_name, object_key, original_name, mime_type, file_size, published, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, ?)`)
        .bind(noteId, session.id, String(form.get("courseCode")).trim().toUpperCase(), String(form.get("courseTitle")).trim(), String(form.get("department")).trim(), String(form.get("level")).trim(), String(form.get("semester")).trim(), String(form.get("academicYear")).trim(), session.name, objectKey, file.name, file.type, file.size, timestamp, timestamp),
      env.DB.prepare("INSERT INTO lecture_note_files (id, note_id, object_key, original_name, mime_type, file_size, version_number, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)").bind(id("notefile"), noteId, objectKey, file.name, file.type, file.size, timestamp),
    ]);
  } catch (error) {
    if (env.UPLOADS) await env.UPLOADS.delete(objectKey);
    throw error;
  }
  await audit(env, session.id, "lecture_note.published", "lecture_note", noteId, { courseCode: String(form.get("courseCode")).trim().toUpperCase() });
  return listNotes(request, env);
}

async function ownedNote(route, session, env) {
  const noteId = route.split("/")[1];
  return session.role === "admin" ? env.DB.prepare("SELECT * FROM lecture_notes WHERE id = ? AND deleted_at IS NULL").bind(noteId).first() : env.DB.prepare("SELECT * FROM lecture_notes WHERE id = ? AND owner_id = ? AND deleted_at IS NULL").bind(noteId, session.id).first();
}

async function updateNote(route, request, env) {
  const session = await requireStaff(request, env);
  const note = await ownedNote(route, session, env);
  if (!note) return json({ error: "Lecture note not found or not owned by this account." }, 404);
  const body = await request.json();
  const status = body.status === "unpublished" ? "unpublished" : "published";
  await env.DB.prepare("UPDATE lecture_notes SET status = ?, published = ?, updated_at = ? WHERE id = ?").bind(status, status === "published" ? 1 : 0, now(), note.id).run();
  await audit(env, session.id, `lecture_note.${status}`, "lecture_note", note.id);
  return listNotes(request, env);
}

async function replaceNote(route, request, env) {
  const session = await requireStaff(request, env);
  const note = await ownedNote(route, session, env);
  if (!note) return json({ error: "Lecture note not found or not owned by this account." }, 404);
  const form = await request.formData();
  const file = form.get("note");
  const fileError = await validateDocument(file, 20 * 1024 * 1024);
  if (fileError) return json({ error: fileError }, 400);
  const objectKey = await storeUpload(env, file, "lecture-notes");
  const version = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM lecture_note_files WHERE note_id = ?").bind(note.id).first();
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE lecture_note_files SET active = 0 WHERE note_id = ?").bind(note.id),
      env.DB.prepare("INSERT INTO lecture_note_files (id, note_id, object_key, original_name, mime_type, file_size, version_number, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)").bind(id("notefile"), note.id, objectKey, file.name, file.type, file.size, version.next_version, now()),
      env.DB.prepare("UPDATE lecture_notes SET object_key = ?, original_name = ?, mime_type = ?, file_size = ?, updated_at = ? WHERE id = ?").bind(objectKey, file.name, file.type, file.size, now(), note.id),
    ]);
  } catch (error) {
    if (env.UPLOADS) await env.UPLOADS.delete(objectKey);
    throw error;
  }
  await audit(env, session.id, "lecture_note.replaced", "lecture_note", note.id, { version: version.next_version });
  return listNotes(request, env);
}

async function deleteNote(route, request, env) {
  const session = await requireStaff(request, env);
  const note = await ownedNote(route, session, env);
  if (!note) return json({ error: "Lecture note not found or not owned by this account." }, 404);
  const files = await env.DB.prepare("SELECT object_key FROM lecture_note_files WHERE note_id = ?").bind(note.id).all();
  await env.DB.prepare("UPDATE lecture_notes SET published = 0, status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?").bind(now(), now(), note.id).run();
  if (env.UPLOADS) await Promise.all(files.results.map((file) => env.UPLOADS.delete(file.object_key)));
  await audit(env, session.id, "lecture_note.deleted", "lecture_note", note.id);
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

async function listElections(request, env) {
  const session = await requireSession(request, env);
  const rows = await env.DB.prepare(`SELECT elections.*, users.name AS creator_name FROM elections JOIN users ON users.id = elections.created_by
    WHERE ? = 1 OR elections.status <> 'draft' ORDER BY elections.opens_at DESC`).bind(session.role === "admin" ? 1 : 0).all();
  const elections = [];
  for (const election of rows.results) {
    const candidates = await env.DB.prepare(`SELECT election_candidates.*, COUNT(election_votes.id) AS vote_count
      FROM election_candidates LEFT JOIN election_votes ON election_votes.candidate_id = election_candidates.id
      WHERE election_candidates.election_id = ? GROUP BY election_candidates.id ORDER BY election_candidates.created_at`).bind(election.id).all();
    const myVote = session.role === "student" ? await env.DB.prepare("SELECT candidate_id FROM election_votes WHERE election_id = ? AND student_user_id = ?").bind(election.id, session.id).first() : null;
    const timing = Date.now() < Date.parse(election.opens_at) ? "upcoming" : Date.now() >= Date.parse(election.closes_at) || ["closed", "archived"].includes(election.status) ? "closed" : election.status === "published" ? "open" : election.status;
    elections.push({ ...election, timing, myVote: myVote?.candidate_id || null, candidates: candidates.results.map((candidate) => ({ ...candidate, vote_count: session.role === "admin" || timing === "closed" ? candidate.vote_count : undefined, image_url: candidate.image_key ? `/api/files/${encodeURIComponent(candidate.image_key)}` : null })) });
  }
  return json({ elections });
}

async function createElection(request, env) {
  const session = await requireAdmin(request, env);
  const body = await request.json();
  const title = String(body.title || "").trim();
  const opensAt = String(body.opensAt || "");
  const closesAt = String(body.closesAt || "");
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  if (title.length < 3 || !Date.parse(opensAt) || !Date.parse(closesAt) || Date.parse(closesAt) <= Date.parse(opensAt) || candidates.length < 2) return json({ error: "Provide a title, a valid voting window, and at least two candidates." }, 400);
  const electionId = id("election");
  const timestamp = now();
  const status = ["draft", "published"].includes(body.status) ? body.status : "draft";
  const statements = [env.DB.prepare("INSERT INTO elections (id, title, description, status, opens_at, closes_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(electionId, title, String(body.description || "").trim().slice(0, 2000), status, new Date(opensAt).toISOString(), new Date(closesAt).toISOString(), session.id, timestamp, timestamp)];
  for (const candidate of candidates) {
    if (!String(candidate.name || "").trim()) return json({ error: "Every candidate needs a name." }, 400);
    statements.push(env.DB.prepare("INSERT INTO election_candidates (id, election_id, name, position_title, manifesto, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id("candidate"), electionId, String(candidate.name).trim(), String(candidate.positionTitle || title).trim(), String(candidate.manifesto || "").trim().slice(0, 3000), timestamp));
  }
  await env.DB.batch(statements);
  await audit(env, session.id, "election.created", "election", electionId, { status, candidates: candidates.length });
  if (status === "published") await notifyStudents(env, "election", "Student election published", title, `/voting?election=${encodeURIComponent(electionId)}`);
  return listElections(request, env);
}

async function updateElection(route, request, env) {
  const session = await requireAdmin(request, env);
  const electionId = route.split("/")[2];
  const body = await request.json();
  const status = ["draft", "published", "closed", "archived"].includes(body.status) ? body.status : null;
  if (!status) return json({ error: "Invalid election status." }, 400);
  await env.DB.prepare("UPDATE elections SET status = ?, updated_at = ? WHERE id = ?").bind(status, now(), electionId).run();
  await audit(env, session.id, `election.${status}`, "election", electionId);
  return listElections(request, env);
}

async function castElectionVote(route, request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student" || !session.matricule) return json({ error: "Only registered students can vote." }, 403);
  const electionId = route.split("/")[1];
  const body = await request.json();
  const election = await env.DB.prepare("SELECT * FROM elections WHERE id = ? AND status = 'published'").bind(electionId).first();
  if (!election || Date.now() < Date.parse(election.opens_at) || Date.now() >= Date.parse(election.closes_at)) return json({ error: "This election is not open." }, 409);
  const candidate = await env.DB.prepare("SELECT id FROM election_candidates WHERE id = ? AND election_id = ?").bind(String(body.candidateId || ""), electionId).first();
  if (!candidate) return json({ error: "Candidate not found in this election." }, 400);
  try {
    await env.DB.prepare("INSERT INTO election_votes (id, election_id, candidate_id, student_user_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(id("vote"), electionId, candidate.id, session.id, now()).run();
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return json({ error: `Matricule ${session.matricule} has already voted in this election.` }, 409);
    throw error;
  }
  await audit(env, session.id, "election.vote_cast", "election", electionId);
  return listElections(request, env);
}

async function listLostFound(request, env) {
  const session = await requireSession(request, env);
  await cleanupExpiredLostItems(env);
  const url = new URL(request.url);
  const type = String(url.searchParams.get("type") || "");
  const query = `%${String(url.searchParams.get("q") || "").trim()}%`;
  const rows = await env.DB.prepare(`SELECT lost_items.*, users.name AS owner_name FROM lost_items LEFT JOIN users ON users.id = lost_items.user_id
    WHERE deleted_at IS NULL AND (? = 1 OR status <> 'removed')
      AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
      AND (? = '' OR type = ?) AND (title LIKE ? COLLATE NOCASE OR COALESCE(description, '') LIKE ? COLLATE NOCASE OR location LIKE ? COLLATE NOCASE)
    ORDER BY created_at DESC LIMIT 100`).bind(session.role === "admin" ? 1 : 0, type, type, query, query, query).all();
  return json({ items: rows.results.map((item) => ({ ...item, image_url: item.image_key ? `/api/files/${encodeURIComponent(item.image_key)}` : item.image_url })) });
}

async function createLostFound(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student") return json({ error: "Only students can create lost and found posts." }, 403);
  const form = await request.formData();
  const input = parseBody(lostFoundSchema, { type: form.get("type"), title: form.get("title"), description: form.get("description"), location: form.get("location"), itemDate: form.get("itemDate"), contactPreference: form.get("contactPreference") || "in-app" });
  const image = form.get("image");
  const imageError = image?.name ? await validateImage(image, 10 * 1024 * 1024) : null;
  if (imageError) return json({ error: imageError }, 400);
  const imageKey = image?.name ? await storeUpload(env, image, "lost-found-images") : null;
  const postId = id("item");
  try {
    await env.DB.prepare(`INSERT INTO lost_items (id, type, title, location, contact, image_url, created_at, user_id, description, item_date, contact_preference, image_key, status, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'active', ?)`)
      .bind(postId, input.type, input.title, input.location, input.contactPreference === "phone" ? session.phone : "In-app contact", now(), session.id, input.description, input.itemDate, input.contactPreference, imageKey, now()).run();
  } catch (error) { if (imageKey && env.UPLOADS) await env.UPLOADS.delete(imageKey); throw error; }
  await audit(env, session.id, "lost_found.created", "lost_found", postId, { type: input.type });
  return listLostFound(request, env);
}

async function updateLostFound(route, request, env) {
  const session = await requireSession(request, env);
  const postId = route.split("/")[1];
  const post = await env.DB.prepare("SELECT * FROM lost_items WHERE id = ? AND deleted_at IS NULL").bind(postId).first();
  if (!post) return json({ error: "Post not found." }, 404);
  if (session.role !== "admin" && post.user_id !== session.id) return json({ error: "You do not own this post." }, 403);
  const body = await request.json();
  const status = ["active", "resolved", "removed"].includes(body.status) ? body.status : post.status;
  if (session.role !== "admin" && status === "resolved" && post.type !== "LOST") return json({ error: "Only a missing item can be marked as found." }, 400);
  const timestamp = now();
  const resolvedAt = status === "resolved" ? timestamp : null;
  const expiresAt = status === "resolved" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null;
  await env.DB.prepare("UPDATE lost_items SET status = ?, resolved_at = ?, expires_at = ?, deleted_at = CASE WHEN ? = 'removed' THEN ? ELSE deleted_at END, updated_at = ? WHERE id = ?")
    .bind(status, resolvedAt, expiresAt, status, timestamp, timestamp, postId).run();
  if (status === "removed" && post.image_key && env.UPLOADS) await env.UPLOADS.delete(post.image_key);
  await audit(env, session.id, `lost_found.${status}`, "lost_found", postId);
  return listLostFound(request, env);
}

async function deleteLostFound(route, request, env) {
  const session = await requireSession(request, env);
  const postId = route.split("/")[1];
  const post = await env.DB.prepare("SELECT * FROM lost_items WHERE id = ? AND deleted_at IS NULL").bind(postId).first();
  if (!post || (session.role !== "admin" && post.user_id !== session.id)) return json({ error: "Post not found or not owned by this account." }, 404);
  await env.DB.prepare("UPDATE lost_items SET deleted_at = ?, status = 'removed', updated_at = ? WHERE id = ?").bind(now(), now(), postId).run();
  if (post.image_key && env.UPLOADS) await env.UPLOADS.delete(post.image_key);
  await audit(env, session.id, "lost_found.deleted", "lost_found", postId);
  return listLostFound(request, env);
}

async function validateImage(file, maxSize) {
  if (file.size > maxSize) return "Image exceeds the configured size limit.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) return "Use a JPG, PNG, or WebP image.";
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return jpeg || png || webp ? null : "The image contents do not match its extension.";
}

async function validateAudio(file, maxSize) {
  if (file.size > maxSize) return "Voice note exceeds the configured size limit.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["mp3", "m4a", "ogg", "wav", "webm"].includes(extension)) return "Use an MP3, M4A, OGG, WAV, or WebM voice note.";
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  const mp3 = ascii.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  const wav = ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE";
  const ogg = ascii.startsWith("OggS");
  const webm = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const m4a = ascii.slice(4, 8) === "ftyp";
  return mp3 || wav || ogg || webm || m4a ? null : "The voice note contents do not match its extension.";
}

async function listMessages(route, request, env) {
  const channel = decodeURIComponent(route.split("/")[1]);
  if (!CHANNELS.includes(channel)) return json({ error: "Forum channel not found." }, 404);
  const session = await requireSession(request, env);
  const accessError = forumAccessError(session, channel);
  if (accessError) return json({ error: accessError }, 403);
  const after = new URL(request.url).searchParams.get("after");
  const rows = after
    ? await env.DB.prepare(`
        SELECT messages.*, parent.author AS parent_author, parent.body AS parent_body,
          authors.name AS real_author_name, media_views.viewed_at AS media_viewed_at
        FROM messages LEFT JOIN messages parent ON parent.id = messages.parent_message_id
        LEFT JOIN users authors ON authors.id = messages.user_id
        LEFT JOIN forum_media_views media_views ON media_views.message_id = messages.id AND media_views.user_id = ?
        WHERE messages.channel = ? AND messages.created_at > ? AND messages.deleted_at IS NULL
        ORDER BY messages.created_at ASC LIMIT 100
      `).bind(session.id, channel, after).all()
    : await env.DB.prepare(`
        SELECT messages.*, parent.author AS parent_author, parent.body AS parent_body,
          authors.name AS real_author_name, media_views.viewed_at AS media_viewed_at
        FROM messages LEFT JOIN messages parent ON parent.id = messages.parent_message_id
        LEFT JOIN users authors ON authors.id = messages.user_id
        LEFT JOIN forum_media_views media_views ON media_views.message_id = messages.id AND media_views.user_id = ?
        WHERE messages.channel = ? AND messages.deleted_at IS NULL
        ORDER BY messages.created_at DESC LIMIT 100
      `).bind(session.id, channel).all();
  const source = after ? rows.results : rows.results.reverse();
  const messages = source.map((message) => presentForumMessage(message, session));
  const settings = await env.DB.prepare("SELECT * FROM forum_settings WHERE channel = ?").bind(channel).first();
  return json({
    channel,
    messages,
    settings: settings || { links_enabled: 0, images_enabled: 1, audio_enabled: 1 },
    profile: { alias: session.forum_alias || "", usingAlias: session.role === "student" && Boolean(session.forum_alias) },
  });
}

async function createMessage(route, request, env) {
  const session = await requireSession(request, env);
  const channel = decodeURIComponent(route.split("/")[1]);
  if (!CHANNELS.includes(channel)) return json({ error: "Forum channel not found." }, 404);
  const accessError = forumAccessError(session, channel);
  if (accessError) return json({ error: accessError }, 403);
  const settings = await env.DB.prepare("SELECT * FROM forum_settings WHERE channel = ?").bind(channel).first();
  if (settings?.suspended) return json({ error: settings.suspension_message || `#${channel} is temporarily suspended by administration.` }, 423);
  const multipart = (request.headers.get("content-type") || "").includes("multipart/form-data");
  const submitted = multipart ? await request.formData() : await request.json();
  const rawBody = String(multipart ? submitted.get("body") || "" : submitted.body || "").trim();
  const attachment = multipart ? submitted.get("attachment") : null;
  const hasAttachment = Boolean(attachment?.name && attachment.size);
  if (!rawBody && !hasAttachment) return json({ error: "Write a message or attach media." }, 400);
  const messageBody = rawBody ? parseBody(forumTextSchema, rawBody) : "";
  if (containsLink(messageBody)) return json({ error: "Links are not allowed in forum channels." }, 400);
  let messageType = "text";
  let attachmentKey = null;
  if (hasAttachment) {
    if (attachment.type.startsWith("image/")) {
      if (!settings?.images_enabled) return json({ error: "Pictures are disabled in this forum channel." }, 403);
      const imageError = await validateImage(attachment, Number(settings.image_max_bytes || 10485760));
      if (imageError) return json({ error: imageError }, 400);
      messageType = "image";
    } else if (attachment.type.startsWith("audio/") || ["webm", "m4a", "mp3", "ogg", "wav"].includes(attachment.name.split(".").pop()?.toLowerCase())) {
      if (!settings?.audio_enabled) return json({ error: "Voice notes are disabled in this forum channel." }, 403);
      const audioError = await validateAudio(attachment, Number(settings.audio_max_bytes || 26214400));
      if (audioError) return json({ error: audioError }, 400);
      messageType = "audio";
    } else {
      return json({ error: "Only pictures and voice notes can be attached." }, 400);
    }
    attachmentKey = await storeUpload(env, attachment, "forum-media");
  }
  let parent = null;
  const parentMessageId = multipart ? submitted.get("parentMessageId") : submitted.parentMessageId;
  if (parentMessageId) parent = await env.DB.prepare("SELECT id, user_id, channel FROM messages WHERE id = ? AND deleted_at IS NULL").bind(parentMessageId).first();
  if (parentMessageId && (!parent || parent.channel !== channel)) {
    if (attachmentKey && env.UPLOADS) await env.UPLOADS.delete(attachmentKey);
    return json({ error: "The reply target is not available." }, 400);
  }
  const messageId = id("msg");
  const author = session.role === "student" && session.forum_alias ? session.forum_alias : session.name;
  const viewOnce = hasAttachment && String(multipart ? submitted.get("viewOnce") : submitted.viewOnce) === "true";
  try {
    await env.DB.prepare(`INSERT INTO messages (id, channel, user_id, author, body, created_at, parent_message_id, message_type, attachment_key, attachment_name, attachment_mime, attachment_size, view_once)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(messageId, channel, session.id, author, messageBody, now(), parent?.id || null, messageType, attachmentKey, hasAttachment ? attachment.name : null, hasAttachment ? attachment.type : null, hasAttachment ? attachment.size : null, viewOnce ? 1 : 0).run();
  } catch (error) {
    if (attachmentKey && env.UPLOADS) await env.UPLOADS.delete(attachmentKey);
    throw error;
  }
  if (parent && parent.user_id !== session.id && parent.user_id !== "system") await notify(env, parent.user_id, "forum_reply", `${author} replied to you`, (messageBody || "Sent media").slice(0, 180), `/forums?message=${encodeURIComponent(messageId)}`);
  return listMessages(route, request, env);
}

function presentForumMessage(message, session) {
  const own = message.user_id === session.id;
  const admin = session.role === "admin";
  const attached = Boolean(message.attachment_key);
  const viewOnce = Boolean(message.view_once);
  const viewed = Boolean(message.media_viewed_at);
  return {
    ...message,
    real_author_name: admin ? message.real_author_name : undefined,
    media_url: attached && (!viewOnce || own || admin) ? `/api/forums/messages/${encodeURIComponent(message.id)}/media` : null,
    can_open_once: attached && viewOnce && !own && !admin && !viewed,
    media_viewed: attached && viewOnce && !own && !admin && viewed,
  };
}

async function updateForumProfile(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student") return json({ error: "Forum usernames are available to student accounts." }, 403);
  const body = await request.json();
  const useAlias = Boolean(body.useAlias);
  let alias = useAlias ? String(body.alias || "").trim().replace(/\s+/g, " ") : null;
  if (useAlias && !/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,29}$/.test(alias)) return json({ error: "Use 3-30 letters, numbers, spaces, dots, dashes, or underscores." }, 400);
  if (useAlias && /(?:^|\b)(?:admin|administrator|moderator|staff|official|hicm)(?:\b|$)/i.test(alias)) return json({ error: "Choose a username that cannot be mistaken for an official account." }, 400);
  if (useAlias) {
    const conflict = await env.DB.prepare("SELECT id FROM users WHERE id <> ? AND (forum_alias = ? COLLATE NOCASE OR name = ? COLLATE NOCASE) LIMIT 1").bind(session.id, alias, alias).first();
    if (conflict) return json({ error: "That forum username is already in use." }, 409);
  }
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET forum_alias = ?, forum_alias_updated_at = ? WHERE id = ?").bind(alias, now(), session.id),
      env.DB.prepare("UPDATE messages SET author = ? WHERE user_id = ?").bind(alias || session.name, session.id),
    ]);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return json({ error: "That forum username is already in use." }, 409);
    throw error;
  }
  await audit(env, session.id, "forum.alias_updated", "user", session.id, { usingAlias: Boolean(alias) });
  return getSessionResponse(request, env);
}

async function readForumMedia(route, request, env, consume = false) {
  const session = await requireSession(request, env);
  const messageId = route.split("/")[2];
  const message = await env.DB.prepare("SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL").bind(messageId).first();
  if (!message?.attachment_key) return json({ error: "Forum media not found." }, 404);
  const accessError = forumAccessError(session, message.channel);
  if (accessError) return json({ error: accessError }, 403);
  const viewOnce = Boolean(message.view_once);
  const bypass = session.role === "admin" || message.user_id === session.id;
  if (viewOnce && !bypass && !consume) return json({ error: "Open this view-once attachment from the forum message." }, 409);
  if (viewOnce && !bypass) {
    try {
      await env.DB.prepare("INSERT INTO forum_media_views (message_id, user_id, viewed_at) VALUES (?, ?, ?)").bind(message.id, session.id, now()).run();
    } catch (error) {
      if (String(error.message).includes("UNIQUE")) return json({ error: "This view-once attachment has already been opened." }, 410);
      throw error;
    }
  }
  const object = await env.UPLOADS?.get(message.attachment_key);
  if (!object) return json({ error: "Forum media not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  for (const [name, value] of Object.entries(securityHeaders())) headers.set(name, value);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Content-Disposition", `inline; filename="${safeFilename(message.attachment_name || "forum-media")}"`);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

function forumAccessError(session, channel) {
  if (session.role === "admin") return null;
  if (session.role === "staff") return session.forum_access ? null : "An administrator must grant this staff account forum access.";
  if (channel === "General" || channel === session.department) return null;
  return "Your student account can only access the General forum and its registered department forum.";
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

async function listDocumentRequests(request, env) {
  const session = await requireSession(request, env);
  if (session.role === "staff") return json({ error: "Document requests are managed by administrators." }, 403);
  const rows = session.role === "admin"
    ? await env.DB.prepare(`SELECT document_requests.*, users.name AS student_name, users.matricule, users.department
        FROM document_requests JOIN users ON users.id = document_requests.user_id ORDER BY document_requests.updated_at DESC LIMIT 250`).all()
    : await env.DB.prepare("SELECT document_requests.*, ? AS student_name, ? AS matricule, ? AS department FROM document_requests WHERE user_id = ? ORDER BY created_at DESC")
      .bind(session.name, session.matricule, session.department, session.id).all();
  return json({ requests: rows.results.map((row) => ({
    ...row,
    download_url: row.document_key ? `/api/files/document/${encodeURIComponent(row.id)}?download=1` : null,
  })) });
}

async function createDocumentRequest(request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student") return json({ error: "Only student accounts can submit document requests." }, 403);
  const body = await request.json();
  const requestType = String(body.requestType || "");
  const details = String(body.details || "").trim().slice(0, 2000);
  if (!DOCUMENT_TYPES.includes(requestType)) return json({ error: "Select a valid document type." }, 400);
  if (requestType === "Others" && details.length < 5) return json({ error: "Describe the document you need." }, 400);
  const duplicate = await env.DB.prepare("SELECT id FROM document_requests WHERE user_id = ? AND request_type = ? AND status IN ('submitted', 'reviewing')").bind(session.id, requestType).first();
  if (duplicate) return json({ error: "You already have an active request for this document." }, 409);
  const requestId = id("docreq");
  await env.DB.prepare("INSERT INTO document_requests (id, user_id, request_type, details, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(requestId, session.id, requestType, details || null, now(), now()).run();
  await audit(env, session.id, "document_request.created", "document_request", requestId, { requestType });
  return listDocumentRequests(request, env);
}

async function reviewDocumentRequest(route, request, env) {
  const session = await requireAdmin(request, env);
  const requestId = route.split("/")[1];
  const current = await env.DB.prepare("SELECT * FROM document_requests WHERE id = ?").bind(requestId).first();
  if (!current) return json({ error: "Document request not found." }, 404);
  const contentType = request.headers.get("Content-Type") || "";
  const form = contentType.includes("multipart/form-data") ? await request.formData() : null;
  const body = form || await request.json();
  const getValue = (key) => form ? form.get(key) : body[key];
  const requestedStatus = String(getValue("status") || current.status);
  const comment = String(getValue("comment") || "").trim().slice(0, 2000);
  const file = form?.get("document");
  if (!["submitted", "reviewing", "ready", "needs_information", "rejected"].includes(requestedStatus)) return json({ error: "Select a valid request status." }, 400);
  if (file?.name) {
    const fileError = await validatePdf(file, 15 * 1024 * 1024);
    if (fileError) return json({ error: fileError }, 400);
  }
  const documentKey = file?.name ? await storeUpload(env, file, "student-documents") : current.document_key;
  const status = file?.name ? "ready" : requestedStatus;
  try {
    await env.DB.prepare(`UPDATE document_requests SET status = ?, admin_comment = ?, document_key = ?, document_name = ?, document_mime = ?, document_size = ?, handled_by = ?, updated_at = ?, completed_at = CASE WHEN ? = 'ready' THEN ? ELSE NULL END WHERE id = ?`)
      .bind(status, comment || null, documentKey || null, file?.name || current.document_name, file?.type || current.document_mime, file?.size || current.document_size, session.id, now(), status, now(), requestId).run();
  } catch (error) {
    if (file?.name && env.UPLOADS) await env.UPLOADS.delete(documentKey);
    throw error;
  }
  if (file?.name && current.document_key && current.document_key !== documentKey && env.UPLOADS) await env.UPLOADS.delete(current.document_key);
  const title = status === "ready" ? `${current.request_type} is ready` : `${current.request_type} request updated`;
  await notify(env, current.user_id, "document_request", title, comment || `Your request status is now ${status.replace("_", " ")}.`, "/documents");
  await audit(env, session.id, "document_request.reviewed", "document_request", requestId, { status, attached: Boolean(file?.name) });
  return listDocumentRequests(request, env);
}

async function validatePdf(file, maxSize) {
  if (file.size > maxSize) return "PDF files must be 15 MB or smaller.";
  if (!String(file.name || "").toLowerCase().endsWith(".pdf")) return "Attach a PDF document.";
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  return signature === "%PDF-" ? null : "The uploaded file is not a valid PDF.";
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
      analysis_reports.coverage_note, analysis_reports.recommendations_json,
      analysis_reports.thesis_title, analysis_reports.plagiarism_percent, analysis_reports.ai_use_percent,
      analysis_reports.verification_code, analysis_reports.published_at
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
      officialResult: job.published_at ? {
        thesisTitle: job.thesis_title,
        plagiarismPercent: job.plagiarism_percent,
        aiUsePercent: job.ai_use_percent,
        verificationCode: job.verification_code,
        publishedAt: job.published_at,
      } : null,
    } : null,
  };
}

async function verifyThesisResult(request, env) {
  await requireStaff(request, env);
  const code = String(new URL(request.url).searchParams.get("code") || "").trim().toUpperCase();
  if (!code) return json({ error: "Enter a thesis verification code." }, 400);
  const result = await env.DB.prepare(`SELECT analysis_reports.thesis_title, analysis_reports.plagiarism_percent,
      analysis_reports.ai_use_percent, analysis_reports.verification_code, analysis_reports.published_at,
      users.name AS student_name, users.matricule, users.department
    FROM analysis_reports
    JOIN analysis_jobs ON analysis_jobs.id = analysis_reports.job_id
    JOIN users ON users.id = analysis_jobs.user_id
    WHERE analysis_reports.verification_code = ? AND analysis_reports.published_at IS NOT NULL`).bind(code).first();
  if (!result) return json({ error: "No published thesis result matches this verification code." }, 404);
  return json({ result });
}

async function readFile(route, request, env) {
  const session = await requireSession(request, env);
  if (!env.UPLOADS) return json({ error: "Cloudflare R2 binding UPLOADS is not configured." }, 500);
  let key = decodeURIComponent(route.replace(/^files\//, ""));
  let dispositionName = null;
  if (key.startsWith("document/")) {
    const requestId = key.slice("document/".length);
    const documentRequest = await env.DB.prepare("SELECT * FROM document_requests WHERE id = ?").bind(requestId).first();
    if (!documentRequest?.document_key) return json({ error: "Document not found." }, 404);
    if (session.role !== "admin" && documentRequest.user_id !== session.id) return json({ error: "You do not have permission to download this document." }, 403);
    key = documentRequest.document_key;
    dispositionName = documentRequest.document_name || "HICM-document.pdf";
  } else if (key.startsWith("note/")) {
    const noteId = key.slice(5);
    const note = await env.DB.prepare("SELECT * FROM lecture_notes WHERE id = ? AND deleted_at IS NULL").bind(noteId).first();
    if (!note) return json({ error: "File not found." }, 404);
    if (!(note.published && note.status === "published") && session.role !== "admin" && note.owner_id !== session.id) return json({ error: "You do not have permission to view this note." }, 403);
    const activeFile = await env.DB.prepare("SELECT * FROM lecture_note_files WHERE note_id = ? AND active = 1 ORDER BY version_number DESC LIMIT 1").bind(noteId).first();
    key = activeFile?.object_key || note.object_key;
    const download = new URL(request.url).searchParams.get("download") === "1";
    await env.DB.batch([
      env.DB.prepare(`UPDATE lecture_notes SET ${download ? "download_count" : "view_count"} = ${download ? "download_count" : "view_count"} + 1 WHERE id = ?`).bind(noteId),
      env.DB.prepare("INSERT INTO lecture_note_access_events (id, note_id, user_id, action, created_at) VALUES (?, ?, ?, ?, ?)").bind(id("access"), noteId, session.id, download ? "download" : "view", now()),
    ]);
    dispositionName = download ? activeFile?.original_name || note.original_name : null;
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
  if (dispositionName) headers.set("Content-Disposition", `attachment; filename="${safeFilename(dispositionName)}"`);
  return new Response(object.body, { headers });
}

async function canReadPrivateKey(env, session, key) {
  if (session.role === "staff" || session.role === "admin") return true;
  if (key.startsWith("lecture-notes/")) return true;
  if (key.startsWith("complaint-proofs/") || key.startsWith("complaint-evidence/")) return session.role === "admin" || !!await env.DB.prepare("SELECT id FROM complaints WHERE user_id = ? AND proof_key = ?").bind(session.id, key).first();
  if (key.startsWith("lost-found-images/")) return !!await env.DB.prepare("SELECT id FROM lost_items WHERE image_key = ? AND deleted_at IS NULL AND status <> 'removed'").bind(key).first();
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

async function createEvaluation(request, env) {
  const session = await requireStaff(request, env);
  const input = parseBody(evaluationSchema, await request.json());
  if (new Date(input.closesAt) <= new Date(input.opensAt)) return json({ error: "Closing time must be after opening time." }, 400);
  if (input.status === "published" && input.questions.some((question) => !question.approved)) return json({ error: "Approve every question before publication." }, 400);
  const evaluationId = id("quiz");
  const timestamp = now();
  const legacyQuestions = input.questions.map((question) => ({ question: question.prompt, options: question.options, answer: question.correctOptionIndex, explanation: question.explanation, difficulty: question.difficulty, sourceSection: question.sourceSection }));
  const statements = [env.DB.prepare(`INSERT INTO quizzes
    (id, title, questions_json, duration_seconds, created_at, course_code, department, level, semester, academic_year, status, owner_id, instructions, difficulty, opens_at, closes_at, attempt_limit, shuffle_questions, shuffle_options, release_mode, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(evaluationId, input.title, JSON.stringify(legacyQuestions), input.durationMinutes * 60, timestamp, input.courseCode, input.department, input.level, input.semester, input.academicYear, input.status, session.id, input.instructions, input.difficulty, input.opensAt, input.closesAt, input.attemptLimit, input.shuffleQuestions ? 1 : 0, input.shuffleOptions ? 1 : 0, input.releaseMode, timestamp)];
  input.questions.forEach((question, position) => {
    const questionId = id("question");
    statements.push(env.DB.prepare(`INSERT INTO evaluation_questions
      (id, evaluation_id, position, prompt, correct_option_index, marks, explanation, difficulty, source_section, approved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionId, evaluationId, position, question.prompt, question.correctOptionIndex, question.marks, question.explanation, question.difficulty, question.sourceSection, question.approved ? 1 : 0, timestamp, timestamp));
    question.options.forEach((option, optionPosition) => statements.push(env.DB.prepare("INSERT INTO evaluation_options (id, question_id, position, option_text) VALUES (?, ?, ?, ?)").bind(id("option"), questionId, optionPosition, option)));
  });
  await env.DB.batch(statements);
  await audit(env, session.id, "evaluation.created", "evaluation", evaluationId, { courseCode: input.courseCode, status: input.status, questions: input.questions.length });
  if (input.status === "published") await notifyStudents(env, "evaluation", `${input.courseCode} evaluation published`, input.title, `/quiz?courseCode=${encodeURIComponent(input.courseCode)}`);
  return json({ evaluation: await readEvaluationForStaff(env, evaluationId) }, 201);
}

async function ensureEvaluationQuestions(env, evaluation) {
  const existing = await env.DB.prepare("SELECT COUNT(*) AS total FROM evaluation_questions WHERE evaluation_id = ?").bind(evaluation.id).first();
  if (Number(existing.total)) return;
  const questions = JSON.parse(evaluation.questions_json || "[]");
  const timestamp = now();
  const statements = [];
  questions.forEach((question, position) => {
    const questionId = id("question");
    statements.push(env.DB.prepare(`INSERT INTO evaluation_questions
      (id, evaluation_id, position, prompt, correct_option_index, marks, explanation, difficulty, source_section, approved, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1, ?, ?)`)
      .bind(questionId, evaluation.id, position, question.question || question.prompt, Number(question.answer ?? question.correctOptionIndex), question.explanation || "", question.difficulty || "medium", question.sourceSection || "", timestamp, timestamp));
    (question.options || []).slice(0, 4).forEach((option, optionPosition) => statements.push(env.DB.prepare("INSERT INTO evaluation_options (id, question_id, position, option_text) VALUES (?, ?, ?, ?)").bind(id("option"), questionId, optionPosition, String(option))));
  });
  if (statements.length) await env.DB.batch(statements);
}

async function readEvaluationForStaff(env, evaluationId) {
  const evaluation = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(evaluationId).first();
  if (!evaluation) return null;
  await ensureEvaluationQuestions(env, evaluation);
  const rows = await env.DB.prepare(`SELECT evaluation_questions.*, evaluation_options.position AS option_position, evaluation_options.option_text
    FROM evaluation_questions JOIN evaluation_options ON evaluation_options.question_id = evaluation_questions.id
    WHERE evaluation_questions.evaluation_id = ? ORDER BY evaluation_questions.position, evaluation_options.position`).bind(evaluationId).all();
  const questions = [];
  for (const row of rows.results) {
    let question = questions.find((item) => item.id === row.id);
    if (!question) {
      question = { id: row.id, prompt: row.prompt, correctOptionIndex: row.correct_option_index, marks: row.marks, explanation: row.explanation, difficulty: row.difficulty, sourceSection: row.source_section, approved: Boolean(row.approved), options: [] };
      questions.push(question);
    }
    question.options.push(row.option_text);
  }
  return { ...evaluation, questions, questions_json: undefined };
}

async function getEvaluation(route, request, env) {
  const session = await requireSession(request, env);
  const evaluationId = route.split("/")[1];
  const evaluation = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(evaluationId).first();
  if (!evaluation) return json({ error: "Evaluation not found." }, 404);
  if (session.role === "staff" || session.role === "admin") {
    if (session.role !== "admin" && evaluation.owner_id !== session.id) return json({ error: "You do not own this evaluation." }, 403);
    return json({ evaluation: await readEvaluationForStaff(env, evaluationId) });
  }
  return json({ evaluation: { id: evaluation.id, title: evaluation.title, courseCode: evaluation.course_code, instructions: evaluation.instructions, durationSeconds: evaluation.duration_seconds, opensAt: evaluation.opens_at, closesAt: evaluation.closes_at, attemptLimit: evaluation.attempt_limit } });
}

async function updateEvaluationLifecycle(route, request, env) {
  const session = await requireStaff(request, env);
  const evaluationId = route.split("/")[1];
  const evaluation = session.role === "admin"
    ? await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(evaluationId).first()
    : await env.DB.prepare("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?").bind(evaluationId, session.id).first();
  if (!evaluation) return json({ error: "Evaluation not found or not owned by this account." }, 404);
  const body = await request.json();
  const status = ["draft", "published", "paused", "closed", "archived"].includes(body.status) ? body.status : evaluation.status;
  if (status === "published") {
    await ensureEvaluationQuestions(env, evaluation);
    const unapproved = await env.DB.prepare("SELECT COUNT(*) AS total FROM evaluation_questions WHERE evaluation_id = ? AND approved = 0").bind(evaluationId).first();
    if (Number(unapproved.total)) return json({ error: "Approve every question before publication." }, 409);
  }
  await env.DB.prepare("UPDATE quizzes SET status = ?, updated_at = ?, archived_at = CASE WHEN ? = 'archived' THEN ? ELSE archived_at END WHERE id = ?").bind(status, now(), status, now(), evaluationId).run();
  await audit(env, session.id, `evaluation.${status}`, "evaluation", evaluationId);
  if (status === "published") await notifyStudents(env, "evaluation", `${evaluation.course_code} evaluation is open`, evaluation.title, `/quiz?courseCode=${encodeURIComponent(evaluation.course_code)}`);
  return json({ evaluation: await readEvaluationForStaff(env, evaluationId) });
}

async function duplicateEvaluation(route, request, env) {
  const session = await requireStaff(request, env);
  const sourceId = route.split("/")[1];
  const source = session.role === "admin" ? await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(sourceId).first() : await env.DB.prepare("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?").bind(sourceId, session.id).first();
  if (!source) return json({ error: "Evaluation not found." }, 404);
  const full = await readEvaluationForStaff(env, sourceId);
  const duplicate = {
    title: `${source.title} (Copy)`, courseCode: source.course_code, courseTitle: source.title, department: source.department || "General", level: source.level || "All", semester: source.semester || "Current", academicYear: source.academic_year || "Current",
    instructions: source.instructions || "", durationMinutes: Math.max(1, Math.round(source.duration_seconds / 60)), opensAt: new Date().toISOString(), closesAt: new Date(Date.now() + 7 * 86400000).toISOString(), attemptLimit: source.attempt_limit || 1,
    shuffleQuestions: Boolean(source.shuffle_questions), shuffleOptions: Boolean(source.shuffle_options), releaseMode: source.release_mode || "immediate", status: "draft", difficulty: source.difficulty || "medium", questions: full.questions.map((question) => ({ ...question, approved: false })),
  };
  const replacement = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(duplicate) });
  return createEvaluation(replacement, env);
}

async function startEvaluation(route, request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "student") return json({ error: "Only student accounts can start an evaluation." }, 403);
  const evaluationId = route.split("/")[1];
  const evaluation = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ? AND status = 'published'").bind(evaluationId).first();
  if (!evaluation) return json({ error: "This evaluation is not open." }, 404);
  const current = Date.now();
  if (evaluation.opens_at && Date.parse(evaluation.opens_at) > current) return json({ error: "This evaluation has not opened yet." }, 409);
  if (evaluation.closes_at && Date.parse(evaluation.closes_at) <= current) return json({ error: "This evaluation is closed." }, 409);
  await ensureEvaluationQuestions(env, evaluation);
  const active = await env.DB.prepare("SELECT id FROM evaluation_attempts WHERE evaluation_id = ? AND student_user_id = ? AND status = 'active' ORDER BY attempt_number DESC LIMIT 1").bind(evaluationId, session.id).first();
  if (active) return getEvaluationAttempt(`evaluation-attempts/${active.id}`, request, env);
  const attempts = await env.DB.prepare("SELECT COUNT(*) AS total FROM evaluation_attempts WHERE evaluation_id = ? AND student_user_id = ?").bind(evaluationId, session.id).first();
  const attemptNumber = Number(attempts.total) + 1;
  if (attemptNumber > Number(evaluation.attempt_limit || 1)) return json({ error: "You have used every allowed attempt." }, 409);
  const questionRows = await env.DB.prepare("SELECT id FROM evaluation_questions WHERE evaluation_id = ? AND approved = 1 ORDER BY position").bind(evaluationId).all();
  if (!questionRows.results.length) return json({ error: "This evaluation has no approved questions." }, 409);
  const questionOrder = questionRows.results.map((row) => row.id);
  if (evaluation.shuffle_questions) secureShuffle(questionOrder);
  const optionOrders = {};
  for (const questionId of questionOrder) {
    optionOrders[questionId] = [0, 1, 2, 3];
    if (evaluation.shuffle_options) secureShuffle(optionOrders[questionId]);
  }
  const deadline = new Date(Math.min(current + Number(evaluation.duration_seconds) * 1000, evaluation.closes_at ? Date.parse(evaluation.closes_at) : Number.MAX_SAFE_INTEGER)).toISOString();
  const attemptId = id("attempt");
  await env.DB.prepare(`INSERT INTO evaluation_attempts
    (id, evaluation_id, student_user_id, attempt_number, question_order_json, option_orders_json, started_at, deadline_at, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
    .bind(attemptId, evaluationId, session.id, attemptNumber, JSON.stringify(questionOrder), JSON.stringify(optionOrders), now(), deadline, now(), now()).run();
  await audit(env, session.id, "evaluation.attempt_started", "evaluation_attempt", attemptId, { evaluationId, attemptNumber });
  return getEvaluationAttempt(`evaluation-attempts/${attemptId}`, request, env);
}

function secureShuffle(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [values[index], values[random]] = [values[random], values[index]];
  }
  return values;
}

async function getEvaluationAttempt(route, request, env) {
  const session = await requireSession(request, env);
  const attemptId = route.split("/")[1];
  let attempt = await env.DB.prepare(`SELECT evaluation_attempts.*, quizzes.title, quizzes.course_code, quizzes.instructions, quizzes.release_mode, quizzes.closes_at
    FROM evaluation_attempts JOIN quizzes ON quizzes.id = evaluation_attempts.evaluation_id WHERE evaluation_attempts.id = ?`).bind(attemptId).first();
  if (!attempt) return json({ error: "Attempt not found." }, 404);
  if (session.role !== "admin" && session.role !== "staff" && attempt.student_user_id !== session.id) return json({ error: "You cannot access this attempt." }, 403);
  if (attempt.status === "active" && Date.parse(attempt.deadline_at) <= Date.now()) {
    await finishEvaluationAttempt(env, attempt, "timeout");
    attempt = await env.DB.prepare(`SELECT evaluation_attempts.*, quizzes.title, quizzes.course_code, quizzes.instructions, quizzes.release_mode, quizzes.closes_at FROM evaluation_attempts JOIN quizzes ON quizzes.id = evaluation_attempts.evaluation_id WHERE evaluation_attempts.id = ?`).bind(attemptId).first();
  }
  const order = JSON.parse(attempt.question_order_json);
  const optionOrders = JSON.parse(attempt.option_orders_json);
  const placeholders = order.map(() => "?").join(",");
  const questionRows = await env.DB.prepare(`SELECT * FROM evaluation_questions WHERE id IN (${placeholders})`).bind(...order).all();
  const optionRows = await env.DB.prepare(`SELECT * FROM evaluation_options WHERE question_id IN (${placeholders}) ORDER BY position`).bind(...order).all();
  const answers = await env.DB.prepare("SELECT question_id, selected_option_index FROM evaluation_answers WHERE attempt_id = ?").bind(attemptId).all();
  const answerMap = Object.fromEntries(answers.results.map((answer) => [answer.question_id, answer.selected_option_index]));
  const questionMap = new Map(questionRows.results.map((question) => [question.id, question]));
  const release = attempt.status !== "active" && (attempt.release_mode === "immediate" || (attempt.release_mode === "after_close" && attempt.closes_at && Date.parse(attempt.closes_at) <= Date.now()));
  const questions = order.map((questionId) => {
    const question = questionMap.get(questionId);
    const rawOptions = optionRows.results.filter((option) => option.question_id === questionId).map((option) => option.option_text);
    const optionOrder = optionOrders[questionId] || [0, 1, 2, 3];
    const selectedOriginal = answerMap[questionId];
    const item = { id: questionId, prompt: question.prompt, marks: question.marks, options: optionOrder.map((position) => rawOptions[position]), selectedOptionIndex: selectedOriginal == null ? null : optionOrder.indexOf(Number(selectedOriginal)) };
    if (release) Object.assign(item, { correctOptionIndex: optionOrder.indexOf(Number(question.correct_option_index)), explanation: question.explanation });
    return item;
  });
  return json({ attempt: { id: attempt.id, evaluationId: attempt.evaluation_id, title: attempt.title, courseCode: attempt.course_code, instructions: attempt.instructions, status: attempt.status, startedAt: attempt.started_at, deadlineAt: attempt.deadline_at, remainingSeconds: attempt.status === "active" ? Math.max(0, Math.ceil((Date.parse(attempt.deadline_at) - Date.now()) / 1000)) : 0, score: attempt.score, totalMarks: attempt.total_marks, release, questions } });
}

async function saveEvaluationAnswer(route, request, env) {
  const session = await requireSession(request, env);
  const attemptId = route.split("/")[1];
  const attempt = await env.DB.prepare("SELECT * FROM evaluation_attempts WHERE id = ? AND student_user_id = ?").bind(attemptId, session.id).first();
  if (!attempt || attempt.status !== "active") return json({ error: "This attempt is no longer active." }, 409);
  if (Date.parse(attempt.deadline_at) <= Date.now()) {
    await finishEvaluationAttempt(env, attempt, "timeout");
    return json({ error: "Time expired and the evaluation was submitted." }, 409);
  }
  const body = await request.json();
  const questionId = String(body.questionId || "");
  const displayIndex = Number(body.selectedOptionIndex);
  const order = JSON.parse(attempt.question_order_json);
  const optionOrders = JSON.parse(attempt.option_orders_json);
  if (!order.includes(questionId) || !Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex > 3) return json({ error: "Invalid answer selection." }, 400);
  const originalIndex = optionOrders[questionId][displayIndex];
  await env.DB.prepare(`INSERT INTO evaluation_answers (attempt_id, question_id, selected_option_index, saved_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET selected_option_index = excluded.selected_option_index, saved_at = excluded.saved_at`)
    .bind(attemptId, questionId, originalIndex, now()).run();
  return json({ saved: true, savedAt: now() });
}

async function submitEvaluationAttempt(route, request, env) {
  const session = await requireSession(request, env);
  const attemptId = route.split("/")[1];
  const attempt = await env.DB.prepare("SELECT * FROM evaluation_attempts WHERE id = ? AND student_user_id = ?").bind(attemptId, session.id).first();
  if (!attempt) return json({ error: "Attempt not found." }, 404);
  if (attempt.status === "active") await finishEvaluationAttempt(env, attempt, Date.parse(attempt.deadline_at) <= Date.now() ? "timeout" : "submitted");
  await audit(env, session.id, "evaluation.attempt_submitted", "evaluation_attempt", attemptId);
  return getEvaluationAttempt(`evaluation-attempts/${attemptId}`, request, env);
}

async function finishEvaluationAttempt(env, attempt, reason) {
  const answers = await env.DB.prepare(`SELECT evaluation_answers.selected_option_index, evaluation_questions.correct_option_index, evaluation_questions.marks
    FROM evaluation_questions LEFT JOIN evaluation_answers ON evaluation_answers.question_id = evaluation_questions.id AND evaluation_answers.attempt_id = ?
    WHERE evaluation_questions.evaluation_id = ?`).bind(attempt.id, attempt.evaluation_id).all();
  const totalMarks = answers.results.reduce((sum, item) => sum + Number(item.marks), 0);
  const score = answers.results.reduce((sum, item) => sum + (Number(item.selected_option_index) === Number(item.correct_option_index) ? Number(item.marks) : 0), 0);
  await env.DB.prepare("UPDATE evaluation_attempts SET status = ?, submit_reason = ?, submitted_at = ?, score = ?, total_marks = ?, updated_at = ? WHERE id = ? AND status = 'active'")
    .bind(reason === "timeout" ? "timed_out" : "submitted", reason, now(), score, totalMarks, now(), attempt.id).run();
  await notify(env, attempt.student_user_id, "evaluation_result", "Evaluation submitted", `Your attempt was ${reason === "timeout" ? "submitted when time expired" : "submitted successfully"}.`, `/quiz?attempt=${encodeURIComponent(attempt.id)}`);
}

async function evaluationResults(route, request, env, exportCsv) {
  const session = await requireStaff(request, env);
  const evaluationId = route.split("/")[1];
  const owned = session.role === "admin" ? await env.DB.prepare("SELECT id, title FROM quizzes WHERE id = ?").bind(evaluationId).first() : await env.DB.prepare("SELECT id, title FROM quizzes WHERE id = ? AND owner_id = ?").bind(evaluationId, session.id).first();
  if (!owned) return json({ error: "Evaluation not found." }, 404);
  const rows = await env.DB.prepare(`SELECT evaluation_attempts.*, users.name, users.matricule,
    CAST((julianday(COALESCE(submitted_at, updated_at)) - julianday(started_at)) * 86400 AS INTEGER) AS completion_seconds
    FROM evaluation_attempts JOIN users ON users.id = evaluation_attempts.student_user_id WHERE evaluation_id = ? ORDER BY created_at DESC`).bind(evaluationId).all();
  if (!exportCsv) return json({ attempts: rows.results });
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = ["Student,Matricule,Attempt,Status,Score,Total,Completion seconds,Submitted", ...rows.results.map((row) => [row.name, row.matricule, row.attempt_number, row.status, row.score, row.total_marks, row.completion_seconds, row.submitted_at].map(escape).join(","))].join("\n");
  return new Response(csv, { headers: { ...securityHeaders(), "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${safeFilename(owned.title)}-results.csv"` } });
}

function safeFilename(value) {
  return String(value || "download").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "download";
}

async function notifyStudents(env, type, title, body, deepLink) {
  const students = await env.DB.prepare("SELECT id FROM users WHERE role = 'student' AND account_status = 'active'").all();
  if (students.results.length) await env.DB.batch(students.results.map((student) => env.DB.prepare("INSERT INTO notifications (id, user_id, type, title, body, deep_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id("notification"), student.id, type, title, body, deepLink, now())));
}
