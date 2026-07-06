import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({
  action: z.enum(["list"]),
  action_type: z.enum(["all", "admin", "gym_request", "gym_code", "gym", "payment", "security"]).optional(),
  search: z.string().trim().max(120).optional(),
});

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
  return { admin };
}

function actionPrefix(actionType?: string) {
  if (!actionType || actionType === "all") return null;
  if (actionType === "security") return "admin.session";
  return actionType;
}

async function countLike(admin: ReturnType<typeof createClient>, prefix: string) {
  const { count, error } = await admin.from("audit_logs").select("id", { count: "exact", head: true }).ilike("action", `${prefix}%`);
  return error ? 0 : count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { admin } = await requireAdmin(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "bad_request", details: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    let query = admin.from("audit_logs").select("id, action, actor_id, entity_type, entity_id, ip, metadata, created_at").order("created_at", { ascending: false }).limit(300);
    const prefix = actionPrefix(body.action_type);
    if (prefix) query = query.ilike("action", `${prefix}%`);
    if (body.search) {
      const term = `%${body.search.replace(/[%_,]/g, "")}%`;
      query = query.or(`action.ilike.${term},entity_type.ilike.${term},entity_id.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const actorIds = [...new Set((data ?? []).map((log: any) => log.actor_id).filter(Boolean))];
    const actorEmail = new Map<string, string>();
    await Promise.all(actorIds.slice(0, 50).map(async (id) => {
      const { data: userData } = await admin.auth.admin.getUserById(String(id));
      if (userData?.user?.email) actorEmail.set(String(id), userData.user.email);
    }));

    let logs = (data ?? []).map((log: any) => ({ ...log, actor_email: log.actor_id ? actorEmail.get(log.actor_id) ?? null : null }));
    if (body.search) {
      const term = body.search.toLowerCase();
      logs = logs.filter((log: any) => [log.action, log.entity_type, log.entity_id, log.ip, log.actor_email].some((value) => String(value ?? "").toLowerCase().includes(term)) || JSON.stringify(log.metadata ?? {}).toLowerCase().includes(term));
    }

    const [total, adminActions, requestActions, codeActions, securityActions] = await Promise.all([
      admin.from("audit_logs").select("id", { count: "exact", head: true }),
      countLike(admin, "admin."),
      countLike(admin, "gym_request."),
      countLike(admin, "gym_code."),
      countLike(admin, "admin.session"),
    ]);

    return json({
      ok: true,
      logs,
      summary: {
        total: total.count ?? 0,
        admin_actions: adminActions,
        request_actions: requestActions,
        code_actions: codeActions,
        security_actions: securityActions,
      },
    });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
