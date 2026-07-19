ALTER TABLE users ADD COLUMN normalized_name TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN blocked_reason TEXT;

UPDATE users SET normalized_name = LOWER(TRIM(name)) WHERE normalized_name IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_normalized_staff_name ON users(normalized_name) WHERE role = 'staff';
CREATE INDEX IF NOT EXISTS idx_users_normalized_name ON users(normalized_name, account_status);

ALTER TABLE sessions ADD COLUMN csrf_token TEXT;
ALTER TABLE sessions ADD COLUMN expires_at TEXT;
ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;
UPDATE sessions SET expires_at = datetime(created_at, '+30 days'), last_seen_at = created_at WHERE expires_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

ALTER TABLE announcements ADD COLUMN author_id TEXT;
ALTER TABLE announcements ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE announcements ADD COLUMN publish_at TEXT;
ALTER TABLE announcements ADD COLUMN archived_at TEXT;
ALTER TABLE announcements ADD COLUMN updated_at TEXT;
ALTER TABLE announcements ADD COLUMN media_key TEXT;
ALTER TABLE announcements ADD COLUMN media_type TEXT;
ALTER TABLE announcements ADD COLUMN media_name TEXT;
UPDATE announcements SET publish_at = created_at, updated_at = created_at WHERE publish_at IS NULL;

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaint_updates (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  status TEXT,
  response TEXT,
  internal_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaint_attachments (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

ALTER TABLE complaints ADD COLUMN course_name TEXT;
ALTER TABLE complaints ADD COLUMN course_code TEXT;
ALTER TABLE complaints ADD COLUMN academic_year TEXT;
ALTER TABLE complaints ADD COLUMN semester TEXT;
ALTER TABLE complaints ADD COLUMN contact_phone TEXT;

CREATE TABLE IF NOT EXISTS complaint_form_fields (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select')),
  options_json TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaint_form_answers (
  complaint_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  field_label TEXT NOT NULL,
  answer TEXT,
  PRIMARY KEY (complaint_id, field_id),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES complaint_form_fields(id)
);

ALTER TABLE lecture_notes ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE lecture_notes ADD COLUMN deleted_at TEXT;
ALTER TABLE lecture_notes ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lecture_notes ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS lecture_note_files (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES lecture_notes(id) ON DELETE CASCADE,
  UNIQUE (note_id, version_number)
);

INSERT OR IGNORE INTO lecture_note_files (id, note_id, object_key, original_name, mime_type, file_size, version_number, active, created_at)
SELECT 'notefile_' || id, id, object_key, original_name, mime_type, file_size, 1, 1, created_at FROM lecture_notes;

CREATE TABLE IF NOT EXISTS lecture_note_access_events (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'download')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES lecture_notes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE quizzes ADD COLUMN instructions TEXT;
ALTER TABLE quizzes ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE quizzes ADD COLUMN opens_at TEXT;
ALTER TABLE quizzes ADD COLUMN closes_at TEXT;
ALTER TABLE quizzes ADD COLUMN attempt_limit INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quizzes ADD COLUMN shuffle_questions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN shuffle_options INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN release_mode TEXT NOT NULL DEFAULT 'immediate';
ALTER TABLE quizzes ADD COLUMN archived_at TEXT;
ALTER TABLE quizzes ADD COLUMN updated_at TEXT;
UPDATE quizzes SET opens_at = COALESCE(opens_at, created_at), updated_at = COALESCE(updated_at, created_at);

CREATE TABLE IF NOT EXISTS evaluation_questions (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  correct_option_index INTEGER NOT NULL,
  marks REAL NOT NULL DEFAULT 1,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  source_section TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (evaluation_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  UNIQUE (evaluation_id, position)
);

CREATE TABLE IF NOT EXISTS evaluation_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES evaluation_questions(id) ON DELETE CASCADE,
  UNIQUE (question_id, position)
);

CREATE TABLE IF NOT EXISTS evaluation_attempts (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL,
  student_user_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  question_order_json TEXT NOT NULL,
  option_orders_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  submitted_at TEXT,
  submit_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'timed_out')),
  score REAL,
  total_marks REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (evaluation_id) REFERENCES quizzes(id),
  FOREIGN KEY (student_user_id) REFERENCES users(id),
  UNIQUE (evaluation_id, student_user_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS evaluation_answers (
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_option_index INTEGER,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id) REFERENCES evaluation_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES evaluation_questions(id)
);

CREATE TABLE IF NOT EXISTS elections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS election_candidates (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position_title TEXT NOT NULL,
  manifesto TEXT,
  image_key TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

ALTER TABLE votes ADD COLUMN election_id TEXT;
ALTER TABLE votes ADD COLUMN student_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_election_student ON votes(election_id, student_user_id) WHERE election_id IS NOT NULL;

-- The legacy votes table has a global UNIQUE constraint on matricule. New elections
-- use this normalized table so one student can vote once in each election.
CREATE TABLE IF NOT EXISTS election_votes (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  student_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES election_candidates(id),
  FOREIGN KEY (student_user_id) REFERENCES users(id),
  UNIQUE (election_id, student_user_id)
);

ALTER TABLE lost_items ADD COLUMN user_id TEXT;
ALTER TABLE lost_items ADD COLUMN description TEXT;
ALTER TABLE lost_items ADD COLUMN item_date TEXT;
ALTER TABLE lost_items ADD COLUMN contact_preference TEXT NOT NULL DEFAULT 'phone';
ALTER TABLE lost_items ADD COLUMN image_key TEXT;
ALTER TABLE lost_items ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE lost_items ADD COLUMN updated_at TEXT;
ALTER TABLE lost_items ADD COLUMN deleted_at TEXT;

ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN attachment_key TEXT;
ALTER TABLE messages ADD COLUMN attachment_name TEXT;
ALTER TABLE messages ADD COLUMN attachment_mime TEXT;
ALTER TABLE messages ADD COLUMN attachment_size INTEGER;

ALTER TABLE forum_settings ADD COLUMN image_max_bytes INTEGER NOT NULL DEFAULT 10485760;
ALTER TABLE forum_settings ADD COLUMN audio_max_bytes INTEGER NOT NULL DEFAULT 26214400;
ALTER TABLE forum_settings ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0;
ALTER TABLE forum_settings ADD COLUMN suspension_message TEXT;

CREATE TABLE IF NOT EXISTS forum_user_restrictions (
  user_id TEXT PRIMARY KEY,
  muted_until TEXT,
  blocked_at TEXT,
  reason TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS forum_moderation_history (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  message_id TEXT,
  target_user_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS analysis_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  price_xaf INTEGER NOT NULL DEFAULT 3500,
  payment_instructions TEXT NOT NULL,
  analyses_per_approval INTEGER NOT NULL DEFAULT 1,
  max_file_bytes INTEGER NOT NULL DEFAULT 20971520,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO analysis_settings (id, payment_instructions, updated_at)
VALUES ('default', 'Pay 3,500 Frs to 681597837 (Name: Brandon Judmi).', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS analysis_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  screenshot_key TEXT NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS analysis_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  payment_id TEXT,
  total_uses INTEGER NOT NULL,
  used_uses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (payment_id) REFERENCES analysis_payments(id)
);

ALTER TABLE analysis_documents ADD COLUMN entitlement_id TEXT;
ALTER TABLE analysis_documents ADD COLUMN page_count INTEGER;
ALTER TABLE analysis_documents ADD COLUMN section_map_json TEXT;

CREATE TABLE IF NOT EXISTS analysis_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  section_reference TEXT,
  text_hash TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  ai_observation_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES analysis_documents(id) ON DELETE CASCADE,
  UNIQUE (document_id, position)
);

ALTER TABLE analysis_reports ADD COLUMN report_html TEXT;
ALTER TABLE analysis_reports ADD COLUMN model_metadata_json TEXT;
ALTER TABLE analysis_reports ADD COLUMN possible_web_sources_json TEXT;

CREATE TABLE IF NOT EXISTS analysis_admin_notes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  input_units INTEGER NOT NULL DEFAULT 0,
  output_units INTEGER NOT NULL DEFAULT 0,
  document_hash TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_idempotency ON ai_usage_events(user_id, operation, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcement_status ON announcements(status, publish_at, created_at);
CREATE INDEX IF NOT EXISTS idx_complaint_updates ON complaint_updates(complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_complaint_fields_active ON complaint_form_fields(active, position);
CREATE INDEX IF NOT EXISTS idx_note_access ON lecture_note_access_events(note_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_eval_active_course ON quizzes(course_code, status, opens_at, closes_at);
CREATE INDEX IF NOT EXISTS idx_eval_attempt_student ON evaluation_attempts(student_user_id, evaluation_id, status);
CREATE INDEX IF NOT EXISTS idx_elections_window ON elections(status, opens_at, closes_at);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate ON election_votes(election_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_lost_search ON lost_items(type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_cursor ON messages(channel, created_at, id);
CREATE INDEX IF NOT EXISTS idx_analysis_payment_user ON analysis_payments(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_entitlement_user ON analysis_entitlements(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_chunks_doc ON analysis_chunks(document_id, position);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_events(user_id, operation, created_at);
