ALTER TABLE users ADD COLUMN staff_code_id TEXT;

ALTER TABLE messages ADD COLUMN parent_message_id TEXT;
ALTER TABLE messages ADD COLUMN edited_at TEXT;
ALTER TABLE messages ADD COLUMN deleted_at TEXT;

ALTER TABLE thesis_requests ADD COLUMN analysis_job_id TEXT;

CREATE TABLE IF NOT EXISTS staff_access_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  used_by TEXT UNIQUE,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS staff_permissions (
  user_id TEXT PRIMARY KEY,
  is_admin INTEGER NOT NULL DEFAULT 0,
  forum_access INTEGER NOT NULL DEFAULT 0,
  moderation_access INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_settings (
  channel TEXT PRIMARY KEY,
  links_enabled INTEGER NOT NULL DEFAULT 0,
  images_enabled INTEGER NOT NULL DEFAULT 0,
  audio_enabled INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO forum_settings (channel, updated_at)
VALUES ('General', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS forum_reports (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (message_id, reporter_id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS analysis_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thesis_request_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content_hash TEXT,
  extracted_text TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (thesis_request_id) REFERENCES thesis_requests(id)
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES analysis_documents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS analysis_matches (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  similarity_percent REAL NOT NULL,
  matched_shingles INTEGER NOT NULL,
  excerpt TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_document_id) REFERENCES analysis_documents(id)
);

CREATE TABLE IF NOT EXISTS analysis_reports (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  similarity_percent REAL NOT NULL,
  matched_shingles INTEGER NOT NULL,
  total_shingles INTEGER NOT NULL,
  coverage_note TEXT NOT NULL,
  recommendations_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_access_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES analysis_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_codes_active ON staff_access_codes(expires_at, revoked_at, used_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_staff_code_once ON users(staff_code_id) WHERE staff_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_admin ON staff_permissions(is_admin, forum_access);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel_cursor ON messages(channel, created_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_documents_user ON analysis_documents(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user ON analysis_jobs(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_matches_job ON analysis_matches(job_id, similarity_percent);
CREATE INDEX IF NOT EXISTS idx_analysis_access_user ON analysis_access_logs(user_id, created_at);
