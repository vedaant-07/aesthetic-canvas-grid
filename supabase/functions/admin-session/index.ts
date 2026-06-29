// Single router for the admin auth lifecycle after login:
//   POST /admin-session         { action: "status" | "setup_2fa" | "enable_2fa" | "verify_2fa" }
// Caller must be authenticated (Supabase JWT in Authorization header) AND
// pass a valid unlock token in `x-unlock-token` for sensitive actions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import * as OTPAuth from "https://esm.sh/otpauth@9.3.2";
import { corsHeaders, getIp, json, signToken, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({
  action: z.enum(["status", "setup_2fa", "enable_2fa", "verify_2fa"]),
  code: z.string().min(6).max(8).optional(),
});

function makeTotp(secret: string) {
  return new OTPAuth.TOTP({
    issuer: "SE7EN FIT Admin",
    label: "SE7EN-ADMIN",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdminRow } = await admin.rpc("is_admin", { _user_id: user.id });
  if (!isAdminRow) {
    await admin.from("audit_logs").insert({
      actor_id: user.id, action: "admin.session.denied", entity_type: "admin",
      metadata: { reason: "not_admin" }, ip: getIp(req),
    });
    return json({ error: "forbidden" }, 403);
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);
  const { action, code } = parsed.data;

  // Sensitive actions need a fresh unlock token from the hidden search bar.
  const requiresUnlock = action !== "status";
  if (requiresUnlock) {
    const unlockToken = req.headers.get("x-unlock-token") ?? "";
    const u = await verifyToken(SESSION_SECRET, "unlock", unlockToken);
    if (!u) return json({ error: "unlock_required" }, 401);
  }

  const { data: existing } = await admin
    .from("admin_2fa_secrets")
    .select("encrypted_secret, enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (action === "status") {
    return json({
      user: { id: user.id, email: user.email },
      twofa_enabled: !!existing?.enabled,
      twofa_provisioned: !!existing,
    });
  }

  if (action === "setup_2fa") {
    if (existing?.enabled) return json({ error: "already_enabled" }, 409);
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    await admin.from("admin_2fa_secrets").upsert({
      user_id: user.id, encrypted_secret: secret, enabled: false, updated_at: new Date().toISOString(),
    });
    const totp = makeTotp(secret);
    const otpauth = totp.toString();
    await admin.from("audit_logs").insert({
      actor_id: user.id, action: "admin.2fa.setup_started", entity_type: "admin", metadata: {}, ip: getIp(req),
    });
    return json({ otpauth, secret });
  }

  if (action === "enable_2fa") {
    if (!existing) return json({ error: "no_setup" }, 400);
    if (existing.enabled) return json({ error: "already_enabled" }, 409);
    if (!code) return json({ error: "code_required" }, 400);
    const totp = makeTotp(existing.encrypted_secret);
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) return json({ error: "invalid_code" }, 400);
    await admin.from("admin_2fa_secrets").update({
      enabled: true, updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    await admin.from("audit_logs").insert({
      actor_id: user.id, action: "admin.2fa.enabled", entity_type: "admin", metadata: {}, ip: getIp(req),
    });
    return verifiedSession(user.id, user.email ?? "");
  }

  if (action === "verify_2fa") {
    if (!existing?.enabled) return json({ error: "not_enabled" }, 400);
    if (!code) return json({ error: "code_required" }, 400);
    const totp = makeTotp(existing.encrypted_secret);
    const delta = totp.validate({ token: code, window: 1 });
    await admin.from("login_attempts").insert({
      email: user.email, user_id: user.id, scope: "admin_2fa",
      success: delta !== null, ip: getIp(req), user_agent: req.headers.get("user-agent"),
    });
    if (delta === null) return json({ error: "invalid_code" }, 400);
    await admin.from("audit_logs").insert({
      actor_id: user.id, action: "admin.2fa.verified", entity_type: "admin", metadata: {}, ip: getIp(req),
    });
    return verifiedSession(user.id, user.email ?? "");
  }

  return json({ error: "bad_request" }, 400);
});

async function verifiedSession(user_id: string, email: string) {
  const token = await signToken(SESSION_SECRET, "admin_session", { sub: user_id, email }, 30 * 60);
  return json({ ok: true, admin_session: token, expires_in: 30 * 60 });
}
