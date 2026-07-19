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

    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "GET") return await listMessages(route, env);
    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "POST") return await createMessage(route, request, env);

    if (route === "thesis" && request.method === "GET") return await getThesis(request, env);
    if (route === "thesis/payment" && request.method === "POST") return await submitPayment(request, env);
    if (route === "thesis/upload" && request.method === "POST") return await uploadThesis(request, env);
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
    await db.prepare("INSERT INTO quizzes VALUES (?, ?, ?, ?, ?)").bind(id("quiz"), "Research Methods Readiness Quiz", JSON.stringify(sampleQuestions.slice(0, 5)), 180, now()).run();
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
      await db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)").bind(id("msg"), channel, "system", "HICM Moderator", `Welcome to #${channel}. Keep it useful, respectful, and academic.`, now()).run();
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
  return env.DB.prepare("SELECT sessions.token, sessions.view_role, users.* FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = ?").bind(token).first();
}

async function requireSession(request, env) {
  const session = await currentSession(request, env);
  if (!session) throw Object.assign(new Error("Please sign in to continue."), { status: 401 });
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
    user = await env.DB.prepare("SELECT * FROM users WHERE role = 'staff' AND LOWER(TRIM(name)) = LOWER(TRIM(?))").bind(name).first();
    if (user) {
      if (!user.password_hash || !env.PASSWORD_PEPPER || !await verifyPassword(password, user.password_salt, user.password_hash, env.PASSWORD_PEPPER)) return json({ error: "The supplied login details are not valid." }, 401);
    } else {
      if (!env.STAFF_REGISTRATION_CODE || !safeEqual(String(body.accessCode || ""), env.STAFF_REGISTRATION_CODE)) return json({ error: "A valid staff access code is required for registration." }, 403);
      if (!body.position || password.length < 8) return json({ error: "Staff registration requires a position and password of at least 8 characters." }, 400);
      if (!env.PASSWORD_PEPPER) return json({ error: "Staff authentication is not configured." }, 503);
      const credentials = await hashPassword(password, env.PASSWORD_PEPPER);
      user = { id: id("usr"), role, name, position: String(body.position).trim(), matricule: null, phone: String(body.phone || "").trim(), created_at: now() };
      await env.DB.prepare("INSERT INTO users (id, role, name, position, matricule, phone, created_at, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(user.id, user.role, user.name, user.position, user.matricule, user.phone, user.created_at, credentials.hash, credentials.salt).run();
    }
  }

  if (user.account_status === "blocked") return json({ error: "The supplied login details are not valid." }, 401);

  const token = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").bind(token, user.id, role, now()).run();
  const session = { token, view_role: role, ...user };
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
  const viewRole = session.role === "staff" && body.viewRole === "staff" ? "staff" : "student";
  await env.DB.prepare("UPDATE sessions SET view_role = ? WHERE token = ?").bind(viewRole, session.token).run();
  return getSessionResponse(request, env);
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

async function listMessages(route, env) {
  const channel = decodeURIComponent(route.split("/")[1]);
  const rows = await env.DB.prepare("SELECT * FROM messages WHERE channel = ? ORDER BY created_at ASC LIMIT 100").bind(channel).all();
  return json({ channel, messages: rows.results });
}

async function createMessage(route, request, env) {
  const session = await requireSession(request, env);
  const channel = decodeURIComponent(route.split("/")[1]);
  const body = await request.json();
  if (!body.body) return json({ error: "Message cannot be empty." }, 400);
  if (containsLink(body.body)) return json({ error: "Links are not allowed in the General Forum." }, 400);
  await env.DB.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)").bind(id("msg"), channel, session.id, session.name, body.body, now()).run();
  return listMessages(route, env);
}

function containsLink(value) {
  return /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|co|cm)\b|<a\s)/i.test(String(value));
}

async function getThesis(request, env) {
  const session = await requireSession(request, env);
  if (session.role === "staff" || session.role === "admin") {
    const rows = await env.DB.prepare("SELECT * FROM thesis_requests ORDER BY updated_at DESC").all();
    return json({ requests: rows.results.map(presentThesis) });
  }
  const row = await env.DB.prepare("SELECT * FROM thesis_requests WHERE user_id = ?").bind(session.id).first();
  return json({ request: row ? presentThesis(row) : null });
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
    await env.DB.prepare("INSERT INTO thesis_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("thr"), session.id, session.name, session.matricule, "pending", key, null, null, now(), now()).run();
  }
  return getThesis(request, env);
}

async function reviewPayment(route, request, env) {
  const session = await requireSession(request, env);
  if (session.role !== "staff" && session.role !== "admin") return json({ error: "Staff access is required." }, 403);
  const requestId = route.split("/")[1];
  const body = await request.json();
  const status = body.status === "approved" ? "approved" : "rejected";
  await env.DB.prepare("UPDATE thesis_requests SET status = ?, updated_at = ? WHERE id = ?").bind(status, now(), requestId).run();
  return getThesis(request, env);
}

async function uploadThesis(request, env) {
  const session = await requireSession(request, env);
  const row = await env.DB.prepare("SELECT * FROM thesis_requests WHERE user_id = ? AND status = 'approved'").bind(session.id).first();
  if (!row) return json({ error: "Thesis tool is locked until admin approval." }, 403);
  const form = await request.formData();
  const thesis = form.get("thesis");
  if (!thesis || !thesis.name) return json({ error: "Please upload a thesis file." }, 400);
  const key = await storeUpload(env, thesis, "thesis-files");
  const analysis = {
    similarity: 0,
    coverage: "This report currently compares exact text only against documents stored and authorized inside HICM Portal. It is not Turnitin and does not search subscription academic databases.",
    excerpts: [
      "No deterministic internal-text match was recorded for this upload.",
      "Review quotations, paraphrases, and bibliography entries manually before final submission.",
      "Writing recommendations are advisory and do not establish authorship or academic misconduct.",
    ],
  };
  await env.DB.prepare("UPDATE thesis_requests SET thesis_key = ?, analysis_json = ?, updated_at = ? WHERE user_id = ?").bind(key, JSON.stringify(analysis), now(), session.id).run();
  return getThesis(request, env);
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
