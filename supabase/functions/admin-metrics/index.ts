// Returns dashboard metrics. Requires Supabase auth + admin role + an
// admin_session token (issued by admin-session after 2FA verify).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, verifyToken } from "../_shared/admin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) return json({ error: "forbidden" }, 403);

  const sessionToken = req.headers.get("x-admin-session") ?? "";
  const session = await verifyToken(SESSION_SECRET, "admin_session", sessionToken);
  if (!session || session.sub !== userData.user.id) {
    return json({ error: "session_required" }, 401);
  }

  const [pending, gyms, owners, audit] = await Promise.all([
    admin.from("gym_owner_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("gyms").select("id", { count: "exact", head: true }),
    admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "gym_owner"),
    admin.from("audit_logs").select("id, action, actor_id, ip, created_at, metadata").order("created_at", { ascending: false }).limit(20),
  ]);

  return json({
    counts: {
      pending_requests: pending.count ?? 0,
      gyms: gyms.count ?? 0,
      gym_owners: owners.count ?? 0,
    },
    recent_audit: audit.data ?? [],
  });
});
