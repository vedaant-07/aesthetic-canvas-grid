import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

type AdminClient = ReturnType<typeof createClient>;

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { error: json({ error: "unauthorized" }, 401) };

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return { error: json({ error: "unauthorized" }, 401) };

  const sessionToken = req.headers.get("x-admin-session") ?? "";
  const session = await verifyToken(SESSION_SECRET, "admin_session", sessionToken);
  if (!session || session.sub !== userData.user.id) return { error: json({ error: "session_required" }, 401) };

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) return { error: json({ error: "forbidden" }, 403) };

  return { admin, user: userData.user };
}

async function countRows(admin: AdminClient, table: string, column = "id", filter?: (query: any) => any) {
  let query = admin.from(table).select(column, { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const { admin } = auth;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const [
    pending,
    approved,
    activated,
    rejected,
    totalGyms,
    activeGyms,
    owners,
    unusedCodes,
    todayRequests,
    audit,
    paidPayments,
    monthlyPayments,
  ] = await Promise.all([
    countRows(admin, "gym_owner_requests", "id", (q) => q.eq("status", "pending")),
    countRows(admin, "gym_owner_requests", "id", (q) => q.eq("status", "approved")),
    countRows(admin, "gym_owner_requests", "id", (q) => q.eq("status", "activated")),
    countRows(admin, "gym_owner_requests", "id", (q) => q.eq("status", "rejected")),
    countRows(admin, "gyms"),
    countRows(admin, "gyms", "id", (q) => q.eq("status", "active")),
    countRows(admin, "gym_owners"),
    countRows(admin, "unique_access_codes", "id", (q) => q.eq("status", "unused")),
    countRows(admin, "gym_owner_requests", "id", (q) => q.gte("created_at", today.toISOString())),
    admin.from("audit_logs").select("id, action, actor_id, ip, created_at, metadata").order("created_at", { ascending: false }).limit(12),
    admin.from("payments").select("amount, currency, status, paid_at, created_at").eq("status", "paid").limit(1000),
    admin.from("payments").select("amount, currency, status, paid_at, created_at").eq("status", "paid").gte("paid_at", month.toISOString()).limit(1000),
  ]);

  const totalRevenue = (paidPayments.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
  const monthlyRevenue = (monthlyPayments.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
  const currency = String((paidPayments.data ?? [])[0]?.currency || "INR");

  return json({
    counts: {
      pending_requests: pending,
      approved_requests: approved,
      activated_requests: activated,
      rejected_requests: rejected,
      total_gyms: totalGyms,
      active_gyms: activeGyms,
      gym_owners: owners,
      unused_codes: unusedCodes,
      today_requests: todayRequests,
    },
    revenue: { total_revenue: totalRevenue, monthly_revenue: monthlyRevenue, currency },
    recent_audit: audit.data ?? [],
  });
});
