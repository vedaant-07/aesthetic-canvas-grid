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
  action: z.enum(["list", "approve", "reject", "generate_code", "save_notes"]),
  request_id: z.string().uuid().optional(),
  status: z.enum(["all", "pending", "approved", "activated", "rejected"]).optional(),
  search: z.string().trim().max(120).optional(),
  notes: z.string().max(1000).optional(),
  expires_in_days: z.number().int().min(1).max(90).optional(),
});

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
async function hashCode(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(`${cleanCode(value)}:${codePepper}`));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `SE7EN-GYM-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("unauthorized", { status: 401 });
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("unauthorized", { status: 401 });
  const session = await verifyToken(sessionSecret, "admin_session", req.headers.get("x-admin-session") ?? "");
  if (!session || session.sub !== userData.user.id) throw new Response("session_required", { status: 401 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) throw new Response("forbidden", { status: 403 });
  return { admin, user: userData.user };
}

async function createActivationCode(admin: ReturnType<typeof createClient>, request_id: string, expires_in_days = 14) {
  const { data: request } = await admin.from("gym_owner_requests").select("id, status, owner_email, owner_full_name, gym_name").eq("id", request_id).maybeSingle();
  if (!request || request.status !== "approved") return { error: "request_not_approved" as const };
  const code = makeCode();
  const code_hash = await hashCode(code);
  const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();
  const { data: codeRow, error } = await admin.from("unique_access_codes").insert({ request_id, code_hash, code_prefix: code.slice(0, 16), expires_at, status: "unused" }).select("id, code_prefix, expires_at, status, created_at").single();
  if (error) return { error: error.message as string };
  return { request, code, code_record: codeRow };
}

async function listRequests(admin: ReturnType<typeof createClient>, body: z.infer<typeof Body>) {
  let query = admin.from("gym_owner_requests").select("*").order("created_at", { ascending: false }).limit(300);
  if (body.status && body.status !== "all") query = query.eq("status", body.status);
  if (body.search) {
    const safe = body.search.replace(/[%_,]/g, "");
    const term = `%${safe}%`;
    query = query.or(`gym_name.ilike.${term},owner_full_name.ilike.${term},owner_email.ilike.${term},owner_phone.ilike.${term},city.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) return { error: error.message };
  const ids = (data ?? []).map((row: any) => row.id);
  const codeMap = new Map<string, any[]>();
  if (ids.length) {
    const { data: codes } = await admin.from("unique_access_codes").select("id, request_id, code_prefix, status, expires_at, used_at, created_at").in("request_id", ids).order("created_at", { ascending: false });
    for (const code of codes ?? []) codeMap.set(code.request_id, [...(codeMap.get(code.request_id) ?? []), code]);
  }
  return { requests: (data ?? []).map((row: any) => ({ ...row, access_codes: codeMap.get(row.id) ?? [] })) };
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
      const result = await listRequests(admin, body);
      if ("error" in result) return json({ error: result.error }, 500);
      return json({ ok: true, requests: result.requests });
    }
    if (!body.request_id) return json({ error: "request_id_required" }, 400);

    if (body.action === "save_notes") {
      const { data, error } = await admin.from("gym_owner_requests").update({ reviewer_notes: body.notes ?? null, updated_at: new Date().toISOString() }).eq("id", body.request_id).select("*").single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_request.notes_saved", entity_type: "gym_owner_request", entity_id: body.request_id, metadata: {}, ip: getIp(req) });
      return json({ ok: true, request: data });
    }

    if (body.action === "approve") {
      const { data, error } = await admin.from("gym_owner_requests").update({ status: "approved", reviewer_id: user.id, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", body.request_id).select("*").single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_request.approve", entity_type: "gym_owner_request", entity_id: body.request_id, metadata: { status: "approved" }, ip: getIp(req) });
      const codeResult = await createActivationCode(admin, body.request_id, body.expires_in_days ?? 14);
      if ("error" in codeResult) return json({ ok: true, request: data, code_error: codeResult.error });
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_code.generated", entity_type: "unique_access_code", entity_id: codeResult.code_record.id, metadata: { request_id: body.request_id }, ip: getIp(req) });
      return json({ ok: true, request: data, code: codeResult.code, code_record: codeResult.code_record, email_sent: false, email_error: "Manual delivery required from dashboard." });
    }

    if (body.action === "reject") {
      const { data, error } = await admin.from("gym_owner_requests").update({ status: "rejected", reviewer_id: user.id, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", body.request_id).select("*").single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_request.reject", entity_type: "gym_owner_request", entity_id: body.request_id, metadata: { status: "rejected" }, ip: getIp(req) });
      return json({ ok: true, request: data });
    }

    const codeResult = await createActivationCode(admin, body.request_id, body.expires_in_days ?? 14);
    if ("error" in codeResult) return json({ error: codeResult.error }, 400);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_code.generated", entity_type: "unique_access_code", entity_id: codeResult.code_record.id, metadata: { request_id: body.request_id }, ip: getIp(req) });
    return json({ ok: true, code: codeResult.code, code_record: codeResult.code_record, email_sent: false, email_error: "Manual delivery required from dashboard." });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
