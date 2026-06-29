import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { constantTimeEqual, corsHeaders, getIp, json, signToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UNLOCK_CODE = Deno.env.get("ADMIN_UNLOCK_CODE") ?? "";
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({ code: z.string().min(8).max(128) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Per-IP throttle: max 5 failed unlock attempts per 15 minutes.
  if (ip) {
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await admin
      .from("admin_unlock_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gt("created_at", since);
    if ((count ?? 0) >= 5) {
      return json({ error: "rate_limited" }, 429);
    }
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await admin.from("admin_unlock_attempts").insert({
      success: false, ip, user_agent: ua, attempted_code_prefix: null,
    });
    // Generic response: never confirm the endpoint exists.
    return json({ ok: false }, 200);
  }

  const code = parsed.data.code;
  const ok = UNLOCK_CODE.length > 0 && constantTimeEqual(code, UNLOCK_CODE);

  await admin.from("admin_unlock_attempts").insert({
    success: ok,
    ip,
    user_agent: ua,
    attempted_code_prefix: code.slice(0, 6),
  });

  if (!ok) {
    return json({ ok: false }, 200);
  }

  const token = await signToken(SESSION_SECRET, "unlock", { ip: ip ?? "" }, 5 * 60);
  await admin.from("audit_logs").insert({
    action: "admin.unlock.success",
    entity_type: "admin",
    metadata: {},
    ip,
  });

  return json({ ok: true, unlock_token: token, expires_in: 300 });
});
