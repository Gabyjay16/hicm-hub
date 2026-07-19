ALTER TABLE users ADD COLUMN forum_alias TEXT;
ALTER TABLE users ADD COLUMN forum_alias_updated_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_forum_alias_nocase
ON users(forum_alias COLLATE NOCASE) WHERE forum_alias IS NOT NULL;

ALTER TABLE messages ADD COLUMN view_once INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS forum_media_views (
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_forum_media_views_user
ON forum_media_views(user_id, viewed_at);

ALTER TABLE lost_items ADD COLUMN resolved_at TEXT;
ALTER TABLE lost_items ADD COLUMN expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_lost_items_expiry
ON lost_items(status, expires_at);

UPDATE forum_settings SET images_enabled = 1, audio_enabled = 1;
DELETE FROM messages WHERE user_id = 'system' AND author = 'HICM Moderator';
