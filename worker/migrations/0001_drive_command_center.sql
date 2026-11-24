PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connected_google_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  google_sub TEXT NOT NULL UNIQUE, google_email TEXT NOT NULL, display_name TEXT, avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'connected', encrypted_refresh_token TEXT NOT NULL,
  token_key_version INTEGER NOT NULL DEFAULT 1, last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS drive_files (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE,
  google_file_id TEXT NOT NULL, name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER,
  modified_time TEXT, web_view_link TEXT, parent_ids TEXT NOT NULL DEFAULT '[]', md5_checksum TEXT,
  is_folder INTEGER NOT NULL DEFAULT 0, trashed INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(account_id,google_file_id)
);
CREATE INDEX IF NOT EXISTS drive_files_owner_name_idx ON drive_files(owner_id,name);
CREATE INDEX IF NOT EXISTS drive_files_account_idx ON drive_files(account_id);
CREATE INDEX IF NOT EXISTS drive_files_mime_idx ON drive_files(owner_id,mime_type);

CREATE TABLE IF NOT EXISTS sharing_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT REFERENCES connected_google_accounts(id) ON DELETE CASCADE, gmail_message_id TEXT,
  requester_email TEXT, requester_name TEXT, google_file_id TEXT, item_name TEXT,
  source_account_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'needs_review', classification_reason TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT,
  UNIQUE(account_id,gmail_message_id)
);
CREATE INDEX IF NOT EXISTS sharing_requests_owner_status_idx ON sharing_requests(owner_id,status,received_at DESC);
CREATE TABLE IF NOT EXISTS permission_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE,
  google_file_id TEXT NOT NULL, permission_id TEXT, recipient_email TEXT, role TEXT NOT NULL,
  permission_type TEXT, expiration_time TEXT, source TEXT NOT NULL DEFAULT 'command_center',
  status TEXT NOT NULL DEFAULT 'unknown', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sharing_collections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, name TEXT NOT NULL,
  description TEXT, status TEXT NOT NULL DEFAULT 'active', expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS collection_files (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), collection_id TEXT NOT NULL REFERENCES sharing_collections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE, google_file_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(collection_id,account_id,google_file_id)
);
CREATE TABLE IF NOT EXISTS collection_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), collection_id TEXT NOT NULL REFERENCES sharing_collections(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer', status TEXT NOT NULL DEFAULT 'invited', expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(collection_id,recipient_email)
);
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0, preview_only INTEGER NOT NULL DEFAULT 1,
  conditions TEXT NOT NULL DEFAULT '{}', action TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS automation_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, rule_id TEXT,
  request_id TEXT, status TEXT NOT NULL, result TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS scheduled_access_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE,
  google_file_id TEXT NOT NULL, recipient_email TEXT NOT NULL, role TEXT NOT NULL, action TEXT NOT NULL,
  run_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', idempotency_key TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS scheduled_jobs_due_idx ON scheduled_access_actions(status,run_at);
CREATE TABLE IF NOT EXISTS application_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, type TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}', correlation_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_logs_owner_created_idx ON audit_logs(owner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS owner_sessions (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, email TEXT NOT NULL, user_agent TEXT, user_agent_hash TEXT,
  ip_hash TEXT, ip_label TEXT NOT NULL DEFAULT 'Network identifier protected', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS owner_sessions_owner_last_seen_idx ON owner_sessions(owner_id,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS owner_sessions_owner_active_idx ON owner_sessions(owner_id,revoked_at,last_seen_at DESC);
CREATE TABLE IF NOT EXISTS owner_access_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, session_id TEXT,
  event_type TEXT NOT NULL, email TEXT NOT NULL, user_agent TEXT, risk_level TEXT NOT NULL DEFAULT 'normal',
  risk_reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS owner_access_events_owner_created_idx ON owner_access_events(owner_id,created_at DESC);

CREATE TABLE IF NOT EXISTS drive_sync_states (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE,
  page_token TEXT, status TEXT NOT NULL DEFAULT 'idle', pages_processed INTEGER NOT NULL DEFAULT 0,
  files_processed INTEGER NOT NULL DEFAULT 0, last_error TEXT, started_at TEXT, completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(owner_id,account_id)
);
CREATE INDEX IF NOT EXISTS drive_sync_states_owner_status_idx ON drive_sync_states(owner_id,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS ai_document_insights (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES connected_google_accounts(id) ON DELETE CASCADE, google_file_id TEXT NOT NULL,
  model TEXT NOT NULL, content_hash TEXT, language TEXT, document_type TEXT, title TEXT, summary TEXT,
  key_points TEXT NOT NULL DEFAULT '[]', topics TEXT NOT NULL DEFAULT '[]', entities TEXT NOT NULL DEFAULT '[]',
  action_items TEXT NOT NULL DEFAULT '[]', confidence REAL, status TEXT NOT NULL DEFAULT 'complete', error_message TEXT,
  source_modified_time TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id,account_id,google_file_id)
);
CREATE INDEX IF NOT EXISTS ai_document_insights_owner_status_idx ON ai_document_insights(owner_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_document_insights_owner_type_idx ON ai_document_insights(owner_id,document_type);
CREATE TABLE IF NOT EXISTS ai_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), owner_id TEXT NOT NULL, job_type TEXT NOT NULL,
  account_id TEXT REFERENCES connected_google_accounts(id) ON DELETE CASCADE, google_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued', requested_count INTEGER NOT NULL DEFAULT 0, completed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, started_at TEXT, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS ai_jobs_owner_created_idx ON ai_jobs(owner_id,created_at DESC);
