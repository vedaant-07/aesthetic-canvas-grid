import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Role = z.enum(["super_admin", "admin", "gym_owner", "gym_staff", "member"]);
const Body = z.object({
  action: z.enum(["list", "assign_role", "remove_role"]),
  filter: z.enum(["all", "active", "subscription_active", "subscription_expired", "subscription_none", "admins", "gym_owners", "users"]).optional(),
  search: z.string().trim().max(120).optional(),
  user_id: z.string().uuid().optional(),
  role_id: z.string().uuid().optional(),
  role: Role.optional(),
  gym_id: z.string().uuid().optional(),
});

type AdminClient = ReturnType<typeof createClient>;

type PaymentRow = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: string;
  subscription_status: string;
  paid_at: string | null;
  created_at: string | null;
};

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

function hasAnyRole(user: any, roles: string[]) {
  return user.roles.some((role: any) => roles.includes(role.role));
}

function isAccountActive(authUser: any) {
  const bannedUntil = authUser.banned_until ? new Date(authUser.banned_until).getTime() : 0;
  const isBanned = Number.isFinite(bannedUntil) && bannedUntil > Date.now();
  const hasVerifiedContact = Boolean(authUser.email_confirmed_at || authUser.phone_confirmed_at || authUser.confirmed_at || authUser.last_sign_in_at);
  return !isBanned && hasVerifiedContact;
}

function getSubscriptionState(payment?: PaymentRow | null): "active" | "expired" | "none" {
  if (!payment) return "none";
  const status = String(payment.subscription_status || payment.status || "").toLowerCase();
  if (["active", "trialing", "paid", "current"].includes(status)) return "active";
  return "expired";
}

async function listUsers(admin: AdminClient, body: z.infer<typeof Body>) {
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (authError) return { error: authError.message };
  const authUsers = authData.users ?? [];
  const ids = authUsers.map((user: any) => user.id);

  const [profilesRes, rolesRes, gymsRes, paymentsRes] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, full_name, phone, avatar_url, created_at, updated_at").in("id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("user_roles").select("id, user_id, role, gym_id, created_at").in("user_id", ids) : Promise.resolve({ data: [] }),
    admin.from("gyms").select("id, name, status, city, owner_id"),
    ids.length ? admin.from("payments").select("id, user_id, amount, currency, status, subscription_status, paid_at, created_at").in("user_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const profiles = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
  const rolesMap = new Map<string, any[]>();
  for (const role of rolesRes.data ?? []) rolesMap.set(role.user_id, [...(rolesMap.get(role.user_id) ?? []), role]);

  const gymsByOwner = new Map<string, any[]>();
  for (const gym of gymsRes.data ?? []) if (gym.owner_id) gymsByOwner.set(gym.owner_id, [...(gymsByOwner.get(gym.owner_id) ?? []), gym]);

  const latestPaymentByUser = new Map<string, PaymentRow>();
  for (const payment of paymentsRes.data ?? []) {
    const row = payment as PaymentRow;
    if (row.user_id && !latestPaymentByUser.has(row.user_id)) latestPaymentByUser.set(row.user_id, row);
  }

  let users = authUsers.map((authUser: any) => {
    const profile = profiles.get(authUser.id) as any;
    const roles = rolesMap.get(authUser.id) ?? [];
    const latestPayment = latestPaymentByUser.get(authUser.id) ?? null;
    const subscriptionState = getSubscriptionState(latestPayment);
    return {
      id: authUser.id,
      email: authUser.email ?? null,
      full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? null,
      phone: profile?.phone ?? authUser.phone ?? null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      banned_until: authUser.banned_until ?? null,
      is_active: isAccountActive(authUser),
      subscription_state: subscriptionState,
      subscription_status: latestPayment?.subscription_status ?? null,
      latest_payment: latestPayment,
      roles,
      owned_gyms: gymsByOwner.get(authUser.id) ?? [],
    };
  });

  const allUsers = users;
  const term = body.search?.toLowerCase();
  if (term) users = users.filter((user: any) => [user.email, user.full_name, user.phone].some((value) => String(value ?? "").toLowerCase().includes(term)));
  if (body.filter === "active") users = users.filter((user: any) => user.is_active);
  if (body.filter === "subscription_active") users = users.filter((user: any) => user.subscription_state === "active");
  if (body.filter === "subscription_expired") users = users.filter((user: any) => user.subscription_state === "expired");
  if (body.filter === "subscription_none") users = users.filter((user: any) => user.subscription_state === "none");
  if (body.filter === "admins") users = users.filter((user: any) => hasAnyRole(user, ["admin", "super_admin"]));
  if (body.filter === "gym_owners") users = users.filter((user: any) => hasAnyRole(user, ["gym_owner"]));
  if (body.filter === "users") users = users.filter((user: any) => !hasAnyRole(user, ["admin", "super_admin", "gym_owner"]));

  const summary = {
    total: allUsers.length,
    active_users: allUsers.filter((u: any) => u.is_active).length,
    active_subscriptions: allUsers.filter((u: any) => u.subscription_state === "active").length,
    expired_subscriptions: allUsers.filter((u: any) => u.subscription_state === "expired").length,
    no_subscription: allUsers.filter((u: any) => u.subscription_state === "none").length,
    admins: allUsers.filter((u: any) => hasAnyRole(u, ["admin", "super_admin"])).length,
    gym_owners: allUsers.filter((u: any) => hasAnyRole(u, ["gym_owner"])).length,
    normal_users: allUsers.filter((u: any) => !hasAnyRole(u, ["admin", "super_admin", "gym_owner"])).length,
    super_admins: allUsers.filter((u: any) => hasAnyRole(u, ["super_admin"])).length,
  };

  return { users, summary };
}

async function requireSuperAdmin(admin: AdminClient, userId: string) {
  const { data: ok } = await admin.rpc("is_super_admin", { _user_id: userId });
  return !!ok;
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
      const result = await listUsers(admin, body);
      if ("error" in result) return json({ error: result.error }, 500);
      return json({ ok: true, users: result.users, summary: result.summary });
    }

    if (!body.user_id || !body.role) return json({ error: "user_and_role_required" }, 400);
    if (!(await requireSuperAdmin(admin, user.id))) return json({ error: "super_admin_required" }, 403);

    if (body.action === "assign_role") {
      const { data, error } = await admin.from("user_roles").insert({ user_id: body.user_id, role: body.role, gym_id: body.gym_id ?? null }).select("*").single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: "user_role.assign", entity_type: "user", entity_id: body.user_id, metadata: { role: body.role, gym_id: body.gym_id ?? null }, ip: getIp(req) });
      return json({ ok: true, role: data });
    }

    if (body.role === "super_admin") {
      const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
      const targetRows = await admin.from("user_roles").select("id").eq("user_id", body.user_id).eq("role", "super_admin");
      if ((count ?? 0) <= 1 && (targetRows.data?.length ?? 0) > 0) return json({ error: "last_super_admin_protected" }, 409);
    }

    let query = admin.from("user_roles").delete();
    if (body.role_id) {
      query = query.eq("id", body.role_id);
    } else {
      query = query.eq("user_id", body.user_id).eq("role", body.role);
      query = body.gym_id ? query.eq("gym_id", body.gym_id) : query.is("gym_id", null);
    }
    const { error } = await query;
    if (error) return json({ error: error.message }, 500);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "user_role.remove", entity_type: "user", entity_id: body.user_id, metadata: { role: body.role }, ip: getIp(req) });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
