const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is not configured.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

export const apiBaseConfigured = Boolean(API_BASE);
export async function apiBlob(path: string): Promise<Blob> {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is not configured.");
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: { Accept: "application/pdf" } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return response.blob();
}
