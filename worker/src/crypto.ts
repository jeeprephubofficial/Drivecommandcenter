const enc = new TextEncoder();
const dec = new TextDecoder();

function fromB64(value: string): Uint8Array {
  const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function toB64(bytes: Uint8Array): string {
  let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s);
}
async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptSecret(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), enc.encode(value));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(cipher))}`;
}
export async function decryptSecret(value: string, secret: string): Promise<string> {
  const [version, iv, cipher] = value.split(".");
  if (version !== "v1" || !iv || !cipher) throw new Error("Unsupported encrypted secret format.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await aesKey(secret), fromB64(cipher));
  return dec.decode(plain);
}
export async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toB64(new Uint8Array(sig));
}
export async function safeEqual(a: string, b: string) {
  const aa = enc.encode(a), bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0; for (let i=0;i<aa.length;i++) diff |= aa[i] ^ bb[i]; return diff === 0;
}