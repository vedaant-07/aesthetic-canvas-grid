import { corsHeaders, json, signToken, constantTimeEqual } from "../_shared/admin.ts";

const encoder = new TextEncoder();
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

// SHA-256 of the normalized hidden admin phrase. The phrase itself is never stored in frontend code.
// Prefer setting ADMIN_UNLOCK_QUERY_HASH as an Edge Function secret to rotate this without code changes.
const FALLBACK_UNLOCK_QUERY_HASH = "d4bdbf9cb6f8012adae098a797d77766f6289bd407d8b785db8f3323ad760f92";
const UNLOCK_QUERY_HASH = Deno.env.get("ADMIN_UNLOCK_QUERY_HASH") || FALLBACK_UNLOCK_QUERY_HASH;

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: { query?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const query = typeof body.query === "string" ? normalizeQuery(body.query) : "";
  if (!query) return json({ ok: false });

  const queryHash = await sha256Hex(query);
  if (!constantTimeEqual(queryHash, UNLOCK_QUERY_HASH)) {
    return json({ ok: false });
  }

  if (SESSION_SECRET.length < 32) {
    return json({ ok: false, error: "admin_session_secret_not_configured" }, 500);
  }

  const unlockToken = await signToken(SESSION_SECRET, "unlock", { scope: "admin_search" }, 15 * 60);
  return json({
    ok: true,
    route: "/x7-control/login",
    unlock_token: unlockToken,
    expires_in: 15 * 60,
  });
});
