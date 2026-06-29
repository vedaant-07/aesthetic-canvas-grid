import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, signToken } from "../_shared/admin.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const codePepper = Deno.env.get("ACCESS_CODE_PEPPER") ?? "";
const Body = z.object({ code: z.string().trim().min(8).max(128) });
const encoder = new TextEncoder();

async function hashCode(code: string) {
  const raw = `${code.trim().toUpperCase().replace(/\s+/g, "")}:${codePepper}`;
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "invalid_code" }, 400);

  const clean = parsed.data.code.trim().toUpperCase().replace(/\s+/g, "");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const codeHash = await hashCode(clean);

  const { data: codeRow } = await admin
    .from("unique_access_codes")
    .select("id, request_id, status, expires_at, used_at")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (!codeRow) {
    await admin.from("audit_logs").insert({ action: "gym_code.invalid", entity_type: "unique_access_code", metadata: { prefix: clean.slice(0, 8) }, ip: getIp(req) });
    return json({ ok: false, error: "invalid_or_expired_code" }, 200);
  }

  const expired = new Date(codeRow.expires_at).getTime() <= Date.now();
  if (codeRow.status !== "unused" || codeRow.used_at || expired) {
    if (expired && codeRow.status === "unused") await admin.from("unique_access_codes").update({ status: "expired" }).eq("id", codeRow.id);
    return json({ ok: false, error: "invalid_or_expired_code" }, 200);
  }

  const { data: request } = await admin
    .from("gym_owner_requests")
    .select("id, gym_name, owner_email, owner_full_name, owner_phone, city, country, gym_type, estimated_members, status")
    .eq("id", codeRow.request_id)
    .maybeSingle();

  if (!request || request.status !== "approved") return json({ ok: false, error: "request_not_approved" }, 200);

  const activationToken = await signToken(sessionSecret, "gym_activation", {
    code_id: codeRow.id,
    request_id: request.id,
    email: request.owner_email,
  }, 15 * 60);

  await admin.from("audit_logs").insert({ action: "gym_code.validated", entity_type: "unique_access_code", entity_id: codeRow.id, metadata: { request_id: request.id }, ip: getIp(req) });

  return json({ ok: true, activation_token: activationToken, expires_in: 900, request });
});
