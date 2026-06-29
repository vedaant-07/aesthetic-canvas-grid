import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const codePepper = Deno.env.get("ACCESS_CODE_PEPPER") ?? "";
const encoder = new TextEncoder();

const Body = z.object({
  action: z.enum(["list", "approve", "reject", "suspend", "generate_code"]),
  request_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  expires_in_days: z.number().int().min(1).max(90).optional(),
});

async function sha256(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(`${input}:${codePepper}`));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let s = "SE7EN-GYM-";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("unauthorized", { status: 401 });
  const sessionToken = req.headers.get("x-admin-session") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("unauthorized", { status: 401 });
  const session = await verifyToken(sessionSecret, "admin_session", sessionToken);
  if (!session || session.sub !== userData.user.id) throw new Response("session_required", { status: 401 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) throw new Response("forbidden", { status: 403 });
  return { admin, user: userData.user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { admin, user } = await requireAdmin(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "bad_request" }, 400);
    const body = parsed.data;

    if (body.action === "list") {
      const { data, error } = await admin.from("gym_owner_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, requests: data ?? [] });
    }

    if (!body.request_id) return json({ error: "request_id_required" }, 400);

    if (["approve", "reject", "suspend"].includes(body.action)) {
      const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "rejected";
      const { data, error } = await admin
        .from("gym_owner_requests")
        .update({ status, reviewer_id: user.id, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", body.request_id)
        .select("*")
        .single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: `gym_request.${body.action}`, entity_type: "gym_owner_request", entity_id: body.request_id, metadata: { status }, ip: getIp(req) });
      return json({ ok: true, request: data });
    }

    const { data: request } = await admin.from("gym_owner_requests").select("id, status, owner_email, gym_name").eq("id", body.request_id).maybeSingle();
    if (!request || request.status !== "approved") return json({ error: "request_not_approved" }, 400);

    const code = makeCode();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + (body.expires_in_days ?? 14) * 24 * 60 * 60 * 1000).toISOString();
    const { data: codeRow, error } = await admin
      .from("unique_access_codes")
      .insert({ request_id: body.request_id, code_hash, code_prefix: code.slice(0, 12), expires_at, status: "unused" })
      .select("id, code_prefix, expires_at, status")
      .single();
    if (error) return json({ error: error.message }, 500);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_code.generated", entity_type: "unique_access_code", entity_id: codeRow.id, metadata: { request_id: body.request_id }, ip: getIp(req) });
    return json({ ok: true, code, code_record: codeRow });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    console.error("[admin-requests]", e);
    return json({ error: "server_error" }, 500);
  }
});
