-- Owner-only session inventory and access-event monitoring.
-- This migration adds no public signup path and grants no browser table access.
create table if not exists public.owner_sessions (
  id uuid primary key,
  owner_id text not null,
  email text not null,
  user_agent text,
  user_agent_hash text,
  ip_hash text,
  ip_label text not null default 'Network identifier protected',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists owner_sessions_owner_last_seen_idx
  on public.owner_sessions(owner_id,last_seen_at desc);
create index if not exists owner_sessions_owner_active_idx
  on public.owner_sessions(owner_id,revoked_at,last_seen_at desc);

create table if not exists public.owner_access_events (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  session_id uuid,
  event_type text not null,
  email text not null,
  user_agent text,
  risk_level text not null default 'normal' check(risk_level in ('normal','review')),
  risk_reason text,
  created_at timestamptz not null default now()
);
create index if not exists owner_access_events_owner_created_idx
  on public.owner_access_events(owner_id,created_at desc);

alter table public.owner_sessions enable row level security;
alter table public.owner_access_events enable row level security;
revoke all on public.owner_sessions from anon, authenticated;
revoke all on public.owner_access_events from anon, authenticated;

-- These tables are accessed only by the Cloudflare Worker after owner-cookie validation.
