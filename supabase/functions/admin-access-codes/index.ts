import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({
  action: z.enum(["list", "revoke"]),
  code_id: z.string().uuid().optional(),
  status: z.enum(["all", "unused", "used", "expired", "revoked"]).optional(),
  search: z.string().trim().max(120).optional(),
});

type AdminClient = ReturnType<typeof createClient>;

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("unauthorized", { status: 401 });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("unauthorized", { status: 401 });
  const session = await verifyToken(SESSION_SECRET, "admin_session", req.headers.get("x-admin-session") ?? "");
  if (!session || session.sub !== userData.user.id) throw new Response("session_required", { status: 401 });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) throw new Response("forbidden", { status: 403 });
  return { admin, user: userData.user };
}

async function countStatus(admin: AdminClient, status: string) {
  const { count, error } = await admin.from("unique_access_codes").select("id", { count: "exact", head: true }).eq("status", status);
  return error ? 0 : count ?? 0;
}

async function listCodes(admin: AdminClient, body: z.infer<typeof Body>) {
  let query = admin.from("unique_access_codes").select("id, request_id, code_prefix, status, expires_at, used_at, used_by, created_at").order("created_at", { ascending: false }).limit(500);
  if (body.status && body.status !== "all") query = query.eq("status", body.status);
  const { data, error } = await query;
  if (error) return { error: error.message };

  const rows = data ?? [];
  const requestIds = [...new Set(rows.map((row: any) => row.request_id).filter(Boolean))];
  const requestMap = new Map<string, any>();
  if (requestIds.length) {
    const { data: requests } = await admin.from("gym_owner_requests").select("id, gym_name, owner_email, owner_full_name, status").in("id", requestIds);
    for (const request of requests ?? []) requestMap.set(request.id, request);
  }

  let codes = rows.map((row: any) => ({ ...row, request: requestMap.get(row.request_id) ?? null }));
  if (body.search) {
    const term = body.search.toLowerCase();
    codes = codes.filter((code: any) => [code.code_prefix, code.request?.gym_name, code.request?.owner_email, code.status].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }

  const [total, unused, used, expired, revoked] = await Promise.all([
    admin.from("unique_access_codes").select("id", { count: "exact", head: true }),
    countStatus(admin, "unused"),
    countStatus(admin, "used"),
    countStatus(admin, "expired"),
    countStatus(admin, "revoked"),
  ]);

  return { codes, summary: { total: total.count ?? 0, unused, used, expired, revoked } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { admin, user } = await requireAdmin(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "bad_request", details: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    if (body.action === "list") {
      const result = await listCodes(admin, body);
      if ("error" in result) return json({ error: result.error }, 500);
      return json({ ok: true, codes: result.codes, summary: result.summary });
    }

    if (!body.code_id) return json({ error: "code_id_required" }, 400);
    const { data, error } = await admin.from("unique_access_codes").update({ status: "revoked" }).eq("id", body.code_id).eq("status", "unused").select("id, request_id, status").maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "code_not_unused" }, 409);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_code.revoked", entity_type: "unique_access_code", entity_id: body.code_id, metadata: { request_id: data.request_id }, ip: getIp(req) });
    return json({ ok: true, code: data });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
