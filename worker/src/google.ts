import type { Env } from "./types";
import { decryptSecret } from "./crypto";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export function googleAuthUrl(env: Env, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: `openid email profile ${DRIVE_SCOPE} ${GMAIL_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    state
  }).toString();
  return url.toString();
}
export async function exchangeCode(env: Env, code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: "authorization_code"
    })
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  return data as { access_token: string; refresh_token?: string; expires_in: number; scope: string; id_token: string };
}
export async function refreshAccessToken(env: Env, encryptedRefreshToken: string) {
  const refresh_token = await decryptSecret(encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token, grant_type: "refresh_token" })
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  return data as { access_token: string; expires_in: number; scope: string };
}
export async function googleApi<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Google API ${response.status}: ${body.slice(0, 400)}`);
  return (body ? JSON.parse(body) : null) as T;
}
export async function googleIdentity(accessToken: string) {
  return googleApi<{ sub: string; email: string; name?: string; picture?: string }>(accessToken, "/oauth2/v2/userinfo");
}