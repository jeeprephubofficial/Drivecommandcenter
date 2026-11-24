# Version 0.4.0 implementation notes

## Working paths
- PDF preview: Worker validates owner, account, indexed file identity, and MIME type; Google Drive content is streamed through the Worker with `private, no-store`.
- Gmail sync: imports recent candidate notifications as `needs_review`. The owner must manually enter/confirm the exact recipient and select the source account and Drive file before the request becomes eligible for a separate approval step. It never auto-approves.
- Direct permission grants/revocations: explicit confirmation required, maximum 50 files per grant request, exact account/file identity required, existing permissions are checked to avoid duplicate grants, direct user-level permission only, and per-file audit outcomes.
- Private collections: owner-only metadata and file associations. There is no public collection URL and no recipient membership invitation endpoint yet.
- Automation rules: stored disabled and preview-only.
- Scheduled access: stored and cancellable while pending. Cron claims due rows with an atomic pending-to-running update, checks existing Drive permissions before grant/revoke, records outcomes, retries up to three attempts, and recovers stale running jobs after 15 minutes.
- Audit: owner-scoped log listing.
- PWA: caches the app shell and static Vite assets after successful online fetches; does not cache `/api/` or private file bytes.

## Required before production
1. Test Google OAuth scopes and Drive preview behavior with representative PDFs and native Google Docs.
2. Review the Gmail search query and imported message classification against real notification formats.
3. Reconcile app permission records against the live Google permissions inventory and test grant/revoke behavior on shared drives.
4. Load-test the Cron worker's atomic claims, stale-job recovery, idempotency, retry policy, cancellation races, Google API permission verification, and per-action audit.
5. Add invitation/authentication and collection-file streaming before sharing private collections with other users.
6. Extend the current first-1,000-file dashboard window and in-session 25-page sync continuation to persistent full-library pagination/change tokens for very large accounts. Search currently filters the loaded index locally.
7. Configure HTTPS, exact CORS origin, Google OAuth consent, Cloudflare secrets, and Supabase service-role secret.
8. Run `npm install`, `npm run typecheck`, `npm test`, `npm run build`, and Worker `npm install` plus `npm run typecheck` and deployment preview.

No private file contents are cached in the browser service worker. No `anyone` or public Drive permission is created by these modules.


# Version 0.5.0 — Owner-only identity and access monitoring

## Owner identity
- The application has no public sign-up form, guest account, or open registration endpoint.
- Google OAuth identity must exactly match the Worker secret `OWNER_EMAIL`.
- First successful owner sign-in provisions one owner session. Any other Google identity is denied as a Command Center user.
- After the owner is signed in, additional Google accounts can be connected as Drive data sources; they do not become application users.

## Session security
- Owner sessions use an HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie with an eight-hour lifetime.
- Session rows are checked server-side and can be revoked remotely.
- The frontend sends a heartbeat every minute. A device is counted as active if its last heartbeat is within five minutes.
- Sign-out revokes the server-side session as well as clearing the browser cookie.
- The security page lists active and historical sessions and access events.
- New browser/device or network hashes create a `review` signal. This is an anomaly heuristic, not proof of fraud.
- Raw IP addresses are not persisted; a SHA-256 hash is stored for comparison.

## Required database change
Apply `supabase/migrations/0002_owner_only_auth_and_access_monitoring.sql` after migration 0001. The new tables deny access to `anon` and `authenticated` browser roles; the Worker accesses them after validating the owner session.

## Production checks
- Set `OWNER_EMAIL` to Dhirendra's exact Google account email as a Cloudflare Worker secret.
- Confirm `APP_BASE_URL` is the exact production origin and use HTTPS.
- Test owner sign-in, rejection of a second Google identity, logout, session expiry, heartbeat, and remote revocation.
- Verify the frontend and Worker are deployed on a same-site topology where possible so Secure/SameSite cookies behave as expected.
- Do not interpret active sessions as unique people: this is a single-owner app and the count represents devices/browsers signed in as the owner.
