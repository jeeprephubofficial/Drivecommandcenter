# Google Drive Command Center

A private, expandable multi-account Google Drive management workspace starter. Version **0.5.0**.

## Included

- Professional responsive React + TypeScript dashboard.
- Owner-only Google sign-in gate: only the exact `OWNER_EMAIL` identity can provision the first owner session; there is no public registration or guest account creation.
- Server-signed, HttpOnly, Secure, SameSite=Lax owner session cookie with an eight-hour lifetime and server-side revocation.
- Session inventory and heartbeat monitoring: counts active owner browser/device sessions seen in the last five minutes, with remote session revocation.
- Access event log with review prompts for a newly seen browser/device or network identifier. IP addresses are hashed before storage; raw IPs are not saved.
- Persistent dark and light themes.
- Mobile bottom navigation, quick-action sheet, sticky header, safe-area spacing, mobile file cards, and bulk-selection bar.
- Multiple Google account OAuth connections.
- Cloudflare Worker API with encrypted refresh-token storage.
- Supabase schema with restrictive RLS; administrative tables are accessed by the Worker only.
- Cross-account indexed file explorer with account filter, text filter, and sorting.
- Drive metadata sync with durable per-account page-token continuation and progress state (up to 25 pages / 2,500 files per click).
- Private AI Library backed by Groq for document classification, summaries, key points, topics, and action items.
- Authenticated PDF streaming preview through the Worker; private file bytes are not persisted or cached.
- Estimated storage view based on the latest loaded index (not Google's actual quota usage).
- Gmail notification import; imported candidates stay in `needs_review`.
- Owner workflow to manually choose exact account, file, and recipient before a separate approval action.
- Direct user-level Drive grants and revocations with account-scoped validation and per-file audit events.
- Private owner-side collections and file groupings across accounts.
- Automation rules saved disabled and preview-only.
- Scheduled grant/revoke queue with Cloudflare Cron execution, atomic row claims, permission lookup, bounded retries, stale-job recovery, and audit events.
- Audit history and permission records.
- PWA manifest, install prompt, and static-shell caching. `/api/` and private file bytes are excluded from service-worker caches.

## Important production boundaries

This is an implementation starter, not a production-certified service.

- Gmail import uses conservative candidate discovery. The sender address is **not assumed** to be the requester. The owner must enter the exact recipient and select the exact source account and Drive file before approval.
- A verified request approval grants the `reader` role. Direct bulk sharing supports `reader`, `commenter`, and `writer`.
- Private collections currently group files for the owner's workspace only. Recipient invitations, recipient authentication, and private collection portal streaming are not implemented.
- Automation rules are stored disabled and preview-only; there is no automatic approval executor.
- Scheduled permissions are executed by the Worker Cron handler. Test the deployed Cron trigger, concurrency behavior, retries, and Google API results before relying on it.
- The dashboard loads the latest 1,000 indexed records per refresh. Sync processes up to 25 pages per click; if more remain, click Sync Drive again in the same app session to continue. Search and storage estimates operate on the loaded records.
- AI analysis sends only bounded text extracted from Google Docs and text-like files, plus metadata. PDFs are classified from metadata unless a future PDF text-extraction service is added; original Drive bytes are never stored in Supabase.
- The permission page lists records created by this app; it is not a complete live inventory of every permission that exists in Google Drive.
- Owner session hardening, CSRF protection, production domain/cookie topology, rate limiting, monitoring, and Google OAuth verification/security assessment must be completed before production.

## Prerequisites

- Node.js 20+ and npm
- Cloudflare account and Wrangler access
- Supabase project
- Google Cloud project with Drive API and Gmail API enabled
- OAuth consent screen configured
- Authorized OAuth redirect URI matching the Worker URL

## Local setup

### Frontend

```bash
npm install
cp .env.example .env.local
# Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_API_BASE_URL
npm run dev
```

### Worker

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
# Set local values in .dev.vars; never commit it.
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
wrangler secret put SESSION_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put OWNER_EMAIL
npm run dev
```

Set `APP_BASE_URL` and `GOOGLE_REDIRECT_URI` in `worker/wrangler.toml` for your actual deployment. Use the same-site app/API domain topology where possible; review cookie behavior if the app and Worker use different sites.

## Database setup

Review and apply migrations in order:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_owner_only_auth_and_access_monitoring.sql`
- `supabase/migrations/0003_scalable_sync_ai_insights.sql`

The second migration adds private owner session and access-event tables. Neither table is readable or writable by browser roles. The Worker uses the Supabase service role only after server-side owner/session checks. Never expose the service-role key in frontend variables.

\n## Owner-only login and first account creation

There is no public sign-up form, invite link, guest mode, or user registration endpoint. The first owner session is provisioned only when Google OAuth returns an identity whose email exactly matches the Worker secret `OWNER_EMAIL`. Set this to Dhirendra's own Google email before deployment. The first successful owner sign-in creates the owner session; every other Google identity is rejected as an application owner. Once signed in, other Google accounts can be connected as Drive data sources, but they do not become Command Center users.

The login button uses Google's identity verification rather than storing a separate app password. Do not add a public Supabase sign-up route. To change the owner identity, perform a deliberate operator-controlled migration of `OWNER_EMAIL` and review the existing owner data/session ownership first.

## Security & Access page

The owner can see active browser/device sessions (heartbeat within five minutes), recent login/logout/revocation events, new-device/new-network review prompts, and revoke other sessions. A session count is a count of active signed-in devices/browsers for the single owner, not a count of different users. New network/device signals are heuristic review prompts, not proof of fraud. IP addresses are stored as SHA-256 hashes, not raw IP addresses.\n\n## Google OAuth setup

1. Create a Google Cloud project.
2. Enable Google Drive API and Gmail API.
3. Configure the OAuth consent screen and authorized domains.
4. Create a Web application OAuth client.
5. Add `https://YOUR-WORKER-DOMAIN/api/auth/google/callback` as an authorized redirect URI.
6. Set the matching `GOOGLE_REDIRECT_URI` Worker variable.
7. Configure the required Drive and Gmail read-only scopes.
8. Test with designated test users first.
9. Complete Google's verification/security assessment requirements before broad production use where applicable.

The first OAuth identity must match `OWNER_EMAIL`. This is a single-owner app; each connected Google identity must be controlled by the owner.

## Secrets

Use Wrangler secrets for:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENCRYPTION_KEY` (cryptographically random, high entropy)
- `SESSION_SECRET` (separate cryptographically random value)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_EMAIL`
- `GROQ_API_KEY` (optional; enables private document classification and summaries)
- `GROQ_MODEL` (optional; defaults to `llama-3.3-70b-versatile`)

Do not put these in Vite `VITE_*` variables. Only the public Supabase URL/anon key may be exposed to the frontend.

## Worker routes

- `GET /health`
- `POST /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`
- `GET /api/accounts`
- `GET /api/drive/files`
- `POST /api/drive/sync`
- `GET /api/drive/sync/status`
- `GET /api/drive/files/:accountId/:fileId/preview`
- `GET /api/ai/insights`
- `POST /api/ai/summarize`
- `POST /api/ai/batch`
- `GET /api/ai/jobs`
- `GET /api/requests`
- `POST /api/requests/:id/resolve`
- `POST /api/requests/:id/approve`
- `POST /api/requests/:id/reject`
- `POST /api/gmail/sync`
- `GET /api/permissions`
- `POST /api/permissions/bulk-grant`
- `POST /api/permissions/:id/revoke`
- `GET|POST /api/collections`
- `POST /api/collections/:id/files`
- `GET|POST /api/automation/rules`
- `GET|POST /api/schedules`
- `POST /api/schedules/:id/cancel`
- `GET /api/audit`

## Security rules

- Never create `anyone` permissions or public links.
- Do not auto-approve Gmail notifications.
- Never treat a Gmail sender as the requested recipient without owner verification.
- Avoid logging message bodies, tokens, file contents, or sensitive personal data.
- Implement CSRF protection and session rotation before production.
- Restrict CORS to the exact deployed frontend origin.
- Keep secrets separate for preview and production.
- Do not cache private Drive bytes or authenticated API responses.
- Test direct and scheduled grants/revocations with test files and test accounts before use.

## Verification

Dependency installation was attempted in the build environment but timed out. TypeScript syntax transpilation checks passed for the edited frontend and Worker source files; full dependency-backed typecheck, tests, and production build have **not** been verified.

Run locally:

```bash
npm install
npm run typecheck
npm test
npm run build
```

Worker:

```bash
cd worker
npm install
npm run typecheck
npm run dev
```

Read `docs/V4_MODULES.md` and `docs/AI_AGENT_HANDOFF.md` before deploying.
