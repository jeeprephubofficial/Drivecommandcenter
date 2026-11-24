-- Scalable indexing and AI enrichment for an owner-only Drive Command Center.
-- The Worker remains the only privileged data plane; browser roles receive no access.
create table if not exists public.drive_sync_states (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  page_token text,
  status text not null default 'idle' check(status in ('idle','running','paused','failed')),
  pages_processed integer not null default 0,
  files_processed bigint not null default 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(owner_id, account_id)
);
create index if not exists drive_sync_states_owner_status_idx on public.drive_sync_states(owner_id,status,updated_at desc);

create table if not exists public.ai_document_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  account_id uuid not null references public.connected_google_accounts(id) on delete cascade,
  google_file_id text not null,
  model text not null,
  content_hash text,
  language text,
  document_type text,
  title text,
  summary text,
  key_points jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  confidence numeric,
  status text not null default 'complete' check(status in ('queued','processing','complete','failed')),
  error_message text,
  source_modified_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, account_id, google_file_id)
);
create index if not exists ai_document_insights_owner_status_idx on public.ai_document_insights(owner_id,status,updated_at desc);
create index if not exists ai_document_insights_owner_type_idx on public.ai_document_insights(owner_id,document_type);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  job_type text not null check(job_type in ('summarize','classify','batch_enrich')),
  account_id uuid references public.connected_google_accounts(id) on delete cascade,
  google_file_id text,
  status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled')),
  requested_count integer not null default 0,
  completed_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index if not exists ai_jobs_owner_created_idx on public.ai_jobs(owner_id,created_at desc);

alter table public.drive_sync_states enable row level security;
alter table public.ai_document_insights enable row level security;
alter table public.ai_jobs enable row level security;
revoke all on public.drive_sync_states from anon, authenticated;
revoke all on public.ai_document_insights from anon, authenticated;
revoke all on public.ai_jobs from anon, authenticated;
