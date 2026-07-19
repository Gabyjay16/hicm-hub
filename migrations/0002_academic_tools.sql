ALTER TABLE quizzes ADD COLUMN course_code TEXT;
ALTER TABLE quizzes ADD COLUMN department TEXT;
ALTER TABLE quizzes ADD COLUMN level TEXT;
ALTER TABLE quizzes ADD COLUMN semester TEXT;
ALTER TABLE quizzes ADD COLUMN academic_year TEXT;
ALTER TABLE quizzes ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE quizzes ADD COLUMN owner_id TEXT;

CREATE INDEX IF NOT EXISTS idx_quizzes_course_code ON quizzes(course_code, status, created_at);

UPDATE quizzes SET course_code = 'RES 201' WHERE course_code IS NULL;

CREATE TABLE IF NOT EXISTS lecture_notes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  department TEXT NOT NULL,
  level TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  lecturer_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notes_search ON lecture_notes(course_code, department, level, semester, academic_year, published);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON lecture_notes(owner_id, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
