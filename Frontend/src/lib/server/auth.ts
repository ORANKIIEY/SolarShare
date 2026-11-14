// Operator demo login: a signed, expiring cookie. Works in route handlers and
// in proxy.ts (Web Crypto only, no Node APIs).

export const SESSION_COOKIE = "ss_operator";
const SESSION_HOURS = 12;

const enc = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const password = process.env.OPERATOR_PASSWORD;
  if (!password) throw new Error("OPERATOR_PASSWORD is not set (Frontend/.env.local)");
  return crypto.subtle.importKey("raw", enc.encode(`solarshare-operator:${password}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(String(exp)));
  return { value: `${exp}.${toHex(sig)}`, maxAge: SESSION_HOURS * 3600 };
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expStr, sigHex] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000 || !sigHex || !/^[0-9a-f]{64}$/.test(sigHex)) return false;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(), fromHex(sigHex), enc.encode(expStr));
  } catch {
    return false;
  }
}

/** Constant-time password check. */
export async function checkPassword(given: string): Promise<boolean> {
  const want = process.env.OPERATOR_PASSWORD;
  if (!want || typeof given !== "string") return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(want)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
