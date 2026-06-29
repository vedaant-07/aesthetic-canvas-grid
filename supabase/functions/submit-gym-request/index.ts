// SE7EN FIT — Stage 3: public gym-owner request submission
// Public endpoint (no JWT). Validates with zod, rate-limits per IP, inserts
// via service role into public.gym_owner_requests, and writes an audit row.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  gym_name: z.string().trim().min(2).max(120),
  owner_full_name: z.string().trim().min(2).max(120),
  owner_email: z.string().trim().toLowerCase().email().max(255),
  owner_phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  gym_type: z.enum([
    "commercial", "boutique", "crossfit", "studio",
    "hotel", "corporate", "private", "other",
  ]),
  estimated_members: z.coerce.number().int().min(0).max(1_000_000).optional(),
  current_software: z.string().trim().max(120).optional().or(z.literal("")),
  requirements: z.string().trim().max(2000).optional().or(z.literal("")),
  // anti-bot honeypot — must be empty
  website: z.string().max(0).optional(),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(400, {
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const data = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Rate limit: max 3 submissions per email/IP in the last hour.
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("gym_owner_requests")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", data.owner_email)
    .gte("created_at", sinceIso);

  if ((recentCount ?? 0) >= 3) {
    return json(429, {
      error: "Too many recent applications. Please contact support@se7en.fit.",
    });
  }

  const insertPayload = {
    gym_name: data.gym_name,
    owner_full_name: data.owner_full_name,
    owner_email: data.owner_email,
    owner_phone: data.owner_phone || null,
    city: data.city || null,
    country: data.country || null,
    gym_type: data.gym_type,
    estimated_members: data.estimated_members ?? null,
    current_software: data.current_software || null,
    requirements: data.requirements || null,
    source_ip: ip,
    status: "pending" as const,
  };

  const { data: inserted, error } = await supabase
    .from("gym_owner_requests")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[submit-gym-request] insert error", error);
    return json(500, { error: "Could not save your application. Try again shortly." });
  }

  await supabase.from("audit_logs").insert({
    actor_id: null,
    action: "gym_request.submitted",
    entity_type: "gym_owner_request",
    entity_id: inserted.id,
    metadata: { gym_name: data.gym_name, owner_email: data.owner_email },
    ip,
  });

  return json(200, {
    ok: true,
    request_id: inserted.id,
    submitted_at: inserted.created_at,
  });
});
