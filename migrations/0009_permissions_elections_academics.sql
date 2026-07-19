ALTER TABLE staff_permissions ADD COLUMN announcement_access INTEGER NOT NULL DEFAULT 0;

ALTER TABLE elections ADD COLUMN show_live_results INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN forum_density TEXT NOT NULL DEFAULT 'compact';

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_attempts_evaluation ON evaluation_attempts(evaluation_id, created_at);
