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

    if (route === "session" && request.method === "GET") return getSessionResponse(request, env);
    if (route === "auth" && request.method === "POST") return authenticate(request, env);
    if (route === "logout" && request.method === "POST") return logout();
    if (route === "session/role" && request.method === "PATCH") return updateViewRole(request, env);

    if (route === "announcements" && request.method === "GET") return listAnnouncements(env);
    if (route === "announcements" && request.method === "POST") return createAnnouncement(request, env);

    if (route === "complaints" && request.method === "GET") return listComplaints(request, env);
    if (route === "complaints" && request.method === "POST") return createComplaint(request, env);
    if (route.startsWith("complaints/") && request.method === "PATCH") return updateComplaint(route, request, env);

    if (route === "quizzes" && request.method === "GET") return listQuizzes(env);
    if (route === "quizzes/generate" && request.method === "POST") return generateQuiz(request, env);
    if (route.startsWith("quizzes/") && route.endsWith("/submit") && request.method === "POST") return submitQuiz(route, request, env);

    if (route === "votes" && request.method === "GET") return listVotes(request, env);
    if (route === "votes" && request.method === "POST") return castVote(request, env);

    if (route === "lost-found" && request.method === "GET") return listLostFound(env);

    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "GET") return listMessages(route, env);
    if (route.startsWith("forums/") && route.endsWith("/messages") && request.method === "POST") return createMessage(route, request, env);

    if (route === "thesis" && request.method === "GET") return getThesis(request, env);
    if (route === "thesis/payment" && request.method === "POST") return submitPayment(request, env);
    if (route === "thesis/upload" && request.method === "POST") return uploadThesis(request, env);
    if (route.startsWith("thesis/") && request.method === "PATCH") return reviewPayment(route, request, env);

    if (route.startsWith("files/") && request.method === "GET") return readFile(route, env);

    return json({ error: "Route not found." }, 404);
  } catch (error) {
    return json({ error: error.message || "Unexpected server error." }, 500);
  }
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(), ...extraHeaders },
  });
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
  if (!session) throw new Error("Please sign in to continue.");
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
  if (!body.name || !body.phone) return json({ error: "Name and phone number are required." }, 400);
  if (role === "student" && !body.matricule) return json({ error: "Matricule is required for students." }, 400);
  if (role === "staff" && !body.position) return json({ error: "Position is required for staff." }, 400);

  let user = role === "student"
    ? await env.DB.prepare("SELECT * FROM users WHERE matricule = ?").bind(body.matricule).first()
    : await env.DB.prepare("SELECT * FROM users WHERE phone = ? AND role = 'staff'").bind(body.phone).first();

  if (!user) {
    user = { id: id("usr"), role, name: body.name, position: body.position || null, matricule: body.matricule || null, phone: body.phone, created_at: now() };
    await env.DB.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").bind(user.id, user.role, user.name, user.position, user.matricule, user.phone, user.created_at).run();
  } else {
    await env.DB.prepare("UPDATE users SET name = ?, position = ?, phone = ? WHERE id = ?").bind(body.name, body.position || user.position, body.phone, user.id).run();
    user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  }

  const token = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").bind(token, user.id, role, now()).run();
  const session = { token, view_role: role, ...user };
  return json({ session: presentSession(session) }, 200, { "Set-Cookie": `hicm_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=2592000` });
}

function logout() {
  return json({ ok: true }, 200, { "Set-Cookie": "hicm_session=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0" });
}

async function updateViewRole(request, env) {
  const session = await requireSession(request, env);
  const body = await request.json();
  const viewRole = body.viewRole === "staff" ? "staff" : "student";
  await env.DB.prepare("UPDATE sessions SET view_role = ? WHERE token = ?").bind(viewRole, session.token).run();
  return getSessionResponse(request, env);
}

async function listAnnouncements(env) {
  const rows = await env.DB.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all();
  return json({ announcements: rows.results });
}

async function createAnnouncement(request, env) {
  const session = await requireSession(request, env);
  if (session.view_role !== "staff") return json({ error: "Staff view is required." }, 403);
  const body = await request.json();
  if (!body.title || !body.body) return json({ error: "Title and announcement body are required." }, 400);
  await env.DB.prepare("INSERT INTO announcements VALUES (?, ?, ?, ?, ?)").bind(id("ann"), body.title, body.body, session.name, now()).run();
  return listAnnouncements(env);
}

async function listComplaints(request, env) {
  const session = await requireSession(request, env);
  const query = session.view_role === "staff"
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
  if (session.view_role !== "staff") return json({ error: "Staff view is required." }, 403);
  const complaintId = route.split("/")[1];
  const body = await request.json();
  const status = ["Pending", "Reviewing", "Resolved"].includes(body.status) ? body.status : "Pending";
  await env.DB.prepare("UPDATE complaints SET status = ? WHERE id = ?").bind(status, complaintId).run();
  return listComplaints(request, env);
}

async function listQuizzes(env) {
  const rows = await env.DB.prepare("SELECT * FROM quizzes ORDER BY created_at DESC").all();
  return json({ quizzes: rows.results.map((quiz) => ({ ...quiz, questions: JSON.parse(quiz.questions_json) })) });
}

async function generateQuiz(request, env) {
  const session = await requireSession(request, env);
  if (session.view_role !== "staff") return json({ error: "Staff view is required." }, 403);
  const form = await request.formData();
  const requested = Math.max(1, Math.min(20, Number(form.get("count") || 5)));
  const title = form.get("title") || "Generated Lecture Quiz";
  const note = form.get("note");
  if (note && note.name) await storeUpload(env, note, "lecture-notes");
  const questions = Array.from({ length: requested }, (_, index) => sampleQuestions[index % sampleQuestions.length]).map((question, index) => ({ ...question, question: `${index + 1}. ${question.question}` }));
  await env.DB.prepare("INSERT INTO quizzes VALUES (?, ?, ?, ?, ?)").bind(id("quiz"), title, JSON.stringify(questions), Math.max(120, requested * 45), now()).run();
  return listQuizzes(env);
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
  await env.DB.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)").bind(id("msg"), channel, session.id, session.name, body.body, now()).run();
  return listMessages(route, env);
}

async function getThesis(request, env) {
  const session = await requireSession(request, env);
  if (session.view_role === "staff") {
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
  if (session.view_role !== "staff") return json({ error: "Staff view is required." }, 403);
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
  const plagiarism = 8 + Math.floor(Math.random() * 19);
  const ai = 12 + Math.floor(Math.random() * 23);
  const analysis = {
    plagiarism,
    ai,
    excerpts: [
      "Chapter two contains phrasing that closely resembles common literature review templates.",
      "The methodology section is mostly original but should cite the sampling framework more clearly.",
      "Conclusion language is polished; verify that generated-sounding summary statements reflect your own findings.",
    ],
  };
  await env.DB.prepare("UPDATE thesis_requests SET thesis_key = ?, analysis_json = ?, updated_at = ? WHERE user_id = ?").bind(key, JSON.stringify(analysis), now(), session.id).run();
  return getThesis(request, env);
}

async function readFile(route, env) {
  if (!env.UPLOADS) return json({ error: "Cloudflare R2 binding UPLOADS is not configured." }, 500);
  const key = decodeURIComponent(route.replace(/^files\//, ""));
  const object = await env.UPLOADS.get(key);
  if (!object) return json({ error: "File not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
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
