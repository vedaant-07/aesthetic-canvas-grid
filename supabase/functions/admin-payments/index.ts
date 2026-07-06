import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

const Body = z.object({
  action: z.enum(["list"]),
  status: z.enum(["all", "paid", "pending", "failed", "unpaid"]).optional(),
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
  return { admin };
}

async function countStatus(admin: AdminClient, status: string) {
  const { count, error } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("status", status);
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

    let query = admin.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
    if (body.status && body.status !== "all") query = query.eq("status", body.status);
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const rows = data ?? [];
    const gymIds = [...new Set(rows.map((row: any) => row.gym_id).filter(Boolean))];
    const gymMap = new Map<string, any>();
    if (gymIds.length) {
      const { data: gyms } = await admin.from("gyms").select("id, name, email, owner_id").in("id", gymIds);
      for (const gym of gyms ?? []) gymMap.set(gym.id, gym);
    }

    let payments = rows.map((row: any) => {
      const gym = gymMap.get(row.gym_id);
      return {
        ...row,
        gym_name: gym?.name ?? null,
        owner_email: gym?.email ?? null,
      };
    });

    if (body.search) {
      const term = body.search.toLowerCase();
      payments = payments.filter((payment: any) => [payment.gym_name, payment.owner_email, payment.provider, payment.provider_payment_id, payment.status].some((value) => String(value ?? "").toLowerCase().includes(term)));
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const paidRows = rows.filter((row: any) => row.status === "paid");
    const monthlyRows = paidRows.filter((row: any) => String(row.paid_at ?? row.created_at) >= monthStart);
    const currency = String(paidRows[0]?.currency ?? "INR");

    const summary = {
      total_revenue: paidRows.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
      monthly_revenue: monthlyRows.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
      paid: await countStatus(admin, "paid"),
      pending: await countStatus(admin, "pending"),
      failed: await countStatus(admin, "failed"),
      unpaid: await countStatus(admin, "unpaid"),
      currency,
    };

    return json({ ok: true, payments, summary });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    return json({ error: "server_error" }, 500);
  }
});
