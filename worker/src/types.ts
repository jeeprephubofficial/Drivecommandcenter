export interface Env {
  APP_BASE_URL: string;
  OWNER_EMAIL: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type AccountRow = {
  id: string;
  owner_id: string;
  google_email: string;
  google_sub: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  encrypted_refresh_token: string;
  token_key_version: number;
};

export type DriveFileRow = {
  id: string;
  owner_id: string;
  account_id: string;
  google_file_id: string;
  name: string;
  mime_type: string;
  size_bytes: number | null;
  modified_time: string | null;
  web_view_link: string | null;
  is_folder: boolean;
};

export type SyncStateRow = {
  id: string;
  owner_id: string;
  account_id: string;
  page_token: string | null;
  status: "idle" | "running" | "paused" | "failed";
  pages_processed: number;
  files_processed: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type DocumentInsight = {
  language: string;
  document_type: string;
  title: string;
  summary: string;
  key_points: string[];
  topics: string[];
  entities: string[];
  action_items: string[];
  confidence: number;
};

export type InsightRow = DocumentInsight & {
  id: string;
  owner_id: string;
  account_id: string;
  google_file_id: string;
  model: string;
  content_hash: string | null;
  status: "queued" | "processing" | "complete" | "failed";
  error_message: string | null;
  source_modified_time: string | null;
  created_at: string;
  updated_at: string;
};

export type AiJobRow = {
  id: string;
  owner_id: string;
  job_type: "summarize" | "classify" | "batch_enrich";
  account_id: string | null;
  google_file_id: string | null;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  requested_count: number;
  completed_count: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};
