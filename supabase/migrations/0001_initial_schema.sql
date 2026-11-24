-- Google Drive Command Center schema.
-- Apply through Supabase migrations after reviewing project ownership and RLS.
create extension if not exists pgcrypto;

create table if not exists public.connected_google_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  google_sub text not null unique,
  google_email text not null,
  display_name text,
  avatar_url text,
  status text not null default 'connected' check (status in ('connected','needs_reauth','error','disconnected')),
  encrypted_refresh_token text not null,
  token_key_version integer not null default 1,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drive_files (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  google_file_id text not null,
  name text not null,
  mime_type text not null,
  size_bytes bigint,
  modified_time timestamptz,
  web_view_link text,
  parent_ids text[] not null default '{}',
  md5_checksum text,
  is_folder boolean not null default false,
  trashed boolean not null default false,
  synced_at timestamptz not null default now(),
  unique(account_id, google_file_id)
);
create index if not exists drive_files_owner_name_idx on public.drive_files(owner_id, lower(name));
create index if not exists drive_files_account_idx on public.drive_files(account_id);
create index if not exists drive_files_mime_idx on public.drive_files(owner_id, mime_type);

create table if not exists public.sharing_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid references public.connected_google_accounts(id) on delete cascade,
  gmail_message_id text,
  requester_email text,
  requester_name text,
  google_file_id text,
  item_name text,
  source_account_email text not null,
  status text not null default 'needs_review' check (status in ('pending','approved','rejected','needs_review','failed','ignored')),
  classification_reason text,
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(account_id, gmail_message_id)
);
create index if not exists sharing_requests_owner_status_idx on public.sharing_requests(owner_id,status,received_at desc);

create table if not exists public.permission_records (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  google_file_id text not null,
  permission_id text,
  recipient_email text,
  role text not null,
  permission_type text,
  expiration_time timestamptz,
  source text not null default 'command_center',
  status text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sharing_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  description text,
  status text not null default 'active' check(status in ('active','disabled','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.collection_files (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.sharing_collections(id) on delete cascade,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  google_file_id text not null,
  created_at timestamptz not null default now(),
  unique(collection_id,account_id,google_file_id)
);
create table if not exists public.collection_members (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.sharing_collections(id) on delete cascade,
  recipient_email text not null,
  role text not null default 'viewer' check(role in ('viewer')),
  status text not null default 'invited' check(status in ('invited','active','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(collection_id,recipient_email)
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  enabled boolean not null default false,
  preview_only boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  rule_id uuid references public.automation_rules(id) on delete set null,
  request_id uuid references public.sharing_requests(id) on delete set null,
  status text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.scheduled_access_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  google_file_id text not null,
  recipient_email text not null,
  role text not null check(role in ('reader','commenter','writer')),
  action text not null check(action in ('grant','revoke')),
  run_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','running','succeeded','failed','cancelled')),
  idempotency_key text not null unique,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_jobs_due_idx on public.scheduled_access_actions(status,run_at);

create table if not exists public.application_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  correlation_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_owner_created_idx on public.audit_logs(owner_id,created_at desc);

-- RLS: browser clients cannot read or mutate these administrative tables.
-- Worker accesses data with service role after its own owner/session checks.
do $$ declare t text; begin
  foreach t in array array[
    'connected_google_accounts','drive_files','sharing_requests','permission_records',
    'sharing_collections','collection_files','collection_members','automation_rules',
    'automation_executions','scheduled_access_actions','application_notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;

-- Do not add broad authenticated policies. The Worker is the only privileged data plane.
