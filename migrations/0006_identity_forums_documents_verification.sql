ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE sessions ADD COLUMN remembered INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_matricule_nocase
ON users(matricule COLLATE NOCASE) WHERE matricule IS NOT NULL;

CREATE TABLE IF NOT EXISTS student_registration_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enforced INTEGER NOT NULL DEFAULT 0,
  active_batch_id TEXT,
  source_name TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  uploaded_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

INSERT OR IGNORE INTO student_registration_settings (id, updated_at)
VALUES ('default', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS student_matricule_registry (
  batch_id TEXT NOT NULL,
  matricule TEXT NOT NULL,
  normalized_matricule TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  PRIMARY KEY (batch_id, normalized_matricule),
  FOREIGN KEY (imported_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'ready', 'needs_information', 'rejected')),
  admin_comment TEXT,
  document_key TEXT,
  document_name TEXT,
  document_mime TEXT,
  document_size INTEGER,
  handled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (handled_by) REFERENCES users(id)
);

ALTER TABLE analysis_reports ADD COLUMN thesis_title TEXT;
ALTER TABLE analysis_reports ADD COLUMN plagiarism_percent REAL;
ALTER TABLE analysis_reports ADD COLUMN ai_use_percent REAL;
ALTER TABLE analysis_reports ADD COLUMN verification_code TEXT;
ALTER TABLE analysis_reports ADD COLUMN published_at TEXT;
ALTER TABLE analysis_reports ADD COLUMN published_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_verification_code
ON analysis_reports(verification_code) WHERE verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_active_batch ON student_matricule_registry(batch_id, normalized_matricule);
CREATE INDEX IF NOT EXISTS idx_document_requests_user ON document_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status, updated_at);

INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('Accounting and Finance', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('Money and Banking', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('Management', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('ORGS', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('Marketing', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO forum_settings (channel, updated_at) VALUES ('Insurance and Security', CURRENT_TIMESTAMP);
