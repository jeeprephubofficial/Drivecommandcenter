# AI Agent Handoff — Version 0.4.0

You are receiving an implementation starter with additional working modules, not a production-certified deployment.

## Read first
- `README.md`
- `docs/V4_MODULES.md`
- `docs/MOBILE_UX.md`
- `src/App.tsx`
- `worker/src/index.ts`
- `supabase/migrations/0001_initial_schema.sql`

## Implemented in this version
- Responsive dashboard with persistent light/dark themes and mobile bottom navigation.
- Cross-account indexed file search with account filter and sorting.
- Indexed storage estimate by account (not Google quota usage).
- Private PDF streaming preview through the authenticated Worker.
- Gmail notification candidate import. Imported messages start as `needs_review`; the owner must resolve the exact recipient/account/file before a separate approval action is enabled.
- Private owner-side collections and file associations.
- Disabled, preview-only automation rule creation.
- Scheduled access queue creation/cancellation and a Cron executor with atomic claims, existing-permission checks, retries, stale-running recovery, and audit logging. It still requires integration/load testing before relying on it.
- Direct user-level permission grants and revocations after explicit confirmation, account-scoped file resolution, per-file results, and audit logging.
- Audit log and permission-record views.
- Installable PWA manifest and service worker that excludes `/api/` and private Drive bytes from caches.

## Required before production
1. Install dependencies and run frontend typecheck/build and Worker typecheck.
2. Fix any type/build issues exposed by the real dependency toolchain.
3. Test OAuth and session cookies using the final app/API domain topology. Prefer same-site deployment and add a robust CSRF token mechanism for all state-changing routes.
4. Verify CORS exact-origin settings and HTTPS.
5. Test PDF preview with ordinary PDFs and Google Docs export, including large files and revoked access.
6. Validate Gmail notification formats. The imported sender address is not assumed to be the requester; imported candidates remain in manual review until the owner manually enters the exact recipient and selects the source account and file.
7. Reconcile the app's permission records against live Google Drive permissions. The current view lists grants recorded by this app; it is not a full live Google permissions inventory.
8. Load-test the scheduled-action runner: atomic row claims, stale-running recovery, idempotency, retry policy, cancellation races, Google API permission verification, and per-action audit.
9. Add private collection recipient authentication, invitations, and authenticated file streaming before enabling collection sharing.
10. Add persistent Drive change tokens and full-library server-side search beyond the current 1,000-file dashboard window and in-session page-token continuation.
11. Add rate limiting, operational alerts, error reporting, backup/restore checks, and a security review.

## Secrets and destructive actions
- Never commit OAuth secrets, session secrets, token encryption keys, or Supabase service-role keys.
- Do not change or delete existing Supabase data.
- Do not create `anyone` or public permissions.
- Do not auto-approve Gmail messages.
- Keep automation disabled and preview-only.
- Do not enable scheduled permission execution until its worker has passed integration tests.


## Owner-only access and monitoring (v0.5.0)
- No public registration or guest access. The Google identity email must exactly match `OWNER_EMAIL`.
- First successful owner OAuth login provisions the owner session; other Google identities are rejected as app users but may be connected as Drive data sources after the owner is signed in.
- Apply migration `0002_owner_only_auth_and_access_monitoring.sql` after migration 0001.
- Verify Secure/HttpOnly/SameSite cookie behavior on the production same-site app/API topology.
- Verify heartbeat-based active device count, session revocation, logout invalidation, and new-device/network review prompts.
- The active count represents owner sessions/devices, not unique human users. New-device/network signals are heuristics, not a fraud verdict.
