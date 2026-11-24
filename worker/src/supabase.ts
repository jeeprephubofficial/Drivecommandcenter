import type { Env } from "./types";

export async function db<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Database error ${response.status}: ${body.slice(0, 300)}`);
  return (body ? JSON.parse(body) : null) as T;
}