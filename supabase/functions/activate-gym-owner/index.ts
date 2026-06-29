import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const Body = z.object({ activation_token: z.string().min(20) });

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "gym";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request" }, 400);

  const token = await verifyToken(sessionSecret, "gym_activation", parsed.data.activation_token);
  if (!token?.code_id || !token?.request_id) return json({ error: "invalid_or_expired_activation" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: codeRow } = await admin.from("unique_access_codes").select("id, request_id, status, used_at").eq("id", String(token.code_id)).maybeSingle();
  if (!codeRow || codeRow.status !== "unused" || codeRow.used_at) return json({ error: "code_already_used" }, 409);

  const { data: request } = await admin
    .from("gym_owner_requests")
    .select("id, gym_name, owner_email, owner_full_name, owner_phone, city, country, gym_type, estimated_members, status")
    .eq("id", String(token.request_id))
    .maybeSingle();
  if (!request || request.status !== "approved") return json({ error: "request_not_approved" }, 403);

  if (request.owner_email.toLowerCase() !== String(user.email || "").toLowerCase()) {
    return json({ error: "email_mismatch" }, 403);
  }

  const slug = `${slugify(request.gym_name)}-${String(request.id).slice(0, 8)}`;
  const { data: gym, error: gymError } = await admin
    .from("gyms")
    .insert({
      name: request.gym_name,
      slug,
      owner_id: user.id,
      email: request.owner_email,
      phone: request.owner_phone,
      city: request.city,
      country: request.country,
      gym_type: request.gym_type,
      member_capacity: request.estimated_members,
      status: "active",
      branding: {},
    })
    .select("id, name, slug, status")
    .single();
  if (gymError) {
    console.error("[activate-gym-owner] gym insert error", gymError);
    return json({ error: "could_not_create_gym" }, 500);
  }

  await admin.from("user_roles").insert({ user_id: user.id, role: "gym_owner", gym_id: gym.id });
  await admin.from("profiles").upsert({ id: user.id, full_name: request.owner_full_name, phone: request.owner_phone, updated_at: new Date().toISOString() });
  await admin.from("unique_access_codes").update({ status: "used", used_at: new Date().toISOString(), used_by: user.id }).eq("id", codeRow.id);
  await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_owner.activated", entity_type: "gym", entity_id: gym.id, metadata: { request_id: request.id, code_id: codeRow.id }, ip: getIp(req) });

  return json({ ok: true, gym });
});
