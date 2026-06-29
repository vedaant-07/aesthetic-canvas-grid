// Shared helpers for the admin functions: HMAC-signed tokens + constant-time
// string comparison. Kept tiny on purpose — no third-party deps.

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type TokenKind = "unlock" | "admin_session";

export async function signToken(
  secret: string,
  kind: TokenKind,
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  const body = {
    k: kind,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    ...payload,
  };
  const payloadB64 = b64urlEncode(encoder.encode(JSON.stringify(body)));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export async function verifyToken(
  secret: string,
  kind: TokenKind,
  token: string,
): Promise<Record<string, unknown> | null> {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sigB64] = token.split(".");
  const expected = b64urlEncode(await hmac(secret, payloadB64));
  if (!constantTimeEqual(expected, sigB64)) return null;
  try {
    const body = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (body.k !== kind) return null;
    if (typeof body.exp !== "number" || body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-session, x-unlock-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip");
}
