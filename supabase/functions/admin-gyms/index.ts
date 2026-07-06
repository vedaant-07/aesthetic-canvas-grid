import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({
  action: z.enum(["list", "update", "suspend", "reactivate"]),
  gym_id: z.string().uuid().optional(),
  status: z.enum(["all", "active", "suspended", "pending", "cancelled"]).optional(),
  search: z.string().trim().max(120).optional(),
  updates: z.object({
    name: z.string().trim().min(2).max(160).optional(),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    phone: z.string().trim().max(50).optional().or(z.literal("")),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
  }).optional(),
});

type AdminClient = ReturnType<typeof createClient>;

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("unauthorized", { status: 401 });

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("unauthorized", { status: 401 });

  const session = await verifyToken(SESSION_SECRET, "admin_session", req.headers.get("x-admin-session") ?? "");
  if (!session || session.sub !== userData.user.id) throw new Response("session_required", { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) throw new Response("forbidden", { status: 403 });
  return { admin, user: userData.user };
}

async function safeCount(admin: AdminClient, table: string, gymId: string) {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true }).eq("gym_id", gymId);
  return error ? 0 : count ?? 0;
}

async function safeTotalMembers(admin: AdminClient, gymId: string) {
  const [manual, members] = await Promise.all([
    safeCount(admin, "gym_manual_members", gymId),
    safeCount(admin, "gym_members", gymId),
  ]);
  return Math.max(manual, members);
}

async function listGyms(admin: AdminClient, body: z.infer<typeof Body>) {
  let query = admin.from("gyms").select("*").order("created_at", { ascending: false }).limit(300);
  if (body.status && body.status !== "all") query = query.eq("status", body.status);
  if (body.search) {
    const term = `%${body.search.replace(/[%_,]/g, "")}%`;
    query = query.or(`name.ilike.${term},city.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  const gyms = data ?? [];
  const ids = gyms.map((gym: any) => gym.id);

  const ownerMap = new Map<string, any>();
  if (ids.length) {
    const { data: owners } = await admin.from("gym_owners").select("gym_id, owner_name, email, phone, user_id").in("gym_id", ids);
    for (const owner of owners ?? []) ownerMap.set(owner.gym_id, owner);
  }

  const enriched = await Promise.all(gyms.map(async (gym: any) => {
    const owner = ownerMap.get(gym.id);
    const [members, attendance, payments] = await Promise.all([
      safeTotalMembers(admin, gym.id),
      safeCount(admin, "gym_attendance_logs", gym.id).then(async (value) => value || await safeCount(admin, "attendance", gym.id)),
      safeCount(admin, "payments", gym.id),
    ]);
    return {
      ...gym,
      owner_name: owner?.owner_name ?? null,
      owner_email: owner?.email ?? gym.email ?? null,
      stats: { members, attendance, payments },
    };
  }));

  const [total, active, suspended] = await Promise.all([
    admin.from("gyms").select("id", { count: "exact", head: true }),
    admin.from("gyms").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("gyms").select("id", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  return { gyms: enriched, summary: { total: total.count ?? 0, active: active.count ?? 0, suspended: suspended.count ?? 0 } };
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
      const result = await listGyms(admin, body);
      if ("error" in result) return json({ error: result.error }, 500);
      return json({ ok: true, gyms: result.gyms, summary: result.summary });
    }

    if (!body.gym_id) return json({ error: "gym_id_required" }, 400);
    const now = new Date().toISOString();

    if (body.action === "update") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (body.updates?.name) updates.name = body.updates.name;
      if (body.updates?.city !== undefined) updates.city = body.updates.city || null;
      if (body.updates?.phone !== undefined) updates.phone = body.updates.phone || null;
      if (body.updates?.email !== undefined) updates.email = body.updates.email || null;
      const { data, error } = await admin.from("gyms").update(updates).eq("id", body.gym_id).select("*").single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym.update", entity_type: "gym", entity_id: body.gym_id, metadata: { fields: Object.keys(updates) }, ip: getIp(req) });
      return json({ ok: true, gym: data });
    }

    const nextStatus = body.action === "suspend" ? "suspended" : "active";
    const { data, error } = await admin.from("gyms").update({ status: nextStatus, updated_at: now }).eq("id", body.gym_id).select("*").single();
    if (error) return json({ error: error.message }, 500);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: `gym.${body.action}`, entity_type: "gym", entity_id: body.gym_id, metadata: { status: nextStatus }, ip: getIp(req) });
    return json({ ok: true, gym: data });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
