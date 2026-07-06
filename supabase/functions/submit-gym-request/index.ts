// SE7EN FIT — public gym-owner request submission
// Validates gym-owner applications, stores them safely, sends confirmation emails,
// and writes audit logs for admin review.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { emailConfig, emailShell, escapeHtml, sendBrevoEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  gym_name: z.string().trim().min(2).max(120),
  owner_full_name: z.string().trim().min(2).max(120),
  owner_email: z.string().trim().toLowerCase().email().max(255),
  owner_phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  gym_type: z.enum(["commercial", "boutique", "crossfit", "studio", "hotel", "corporate", "private", "other"]),
  estimated_members: z.coerce.number().int().min(0).max(1_000_000).optional(),
  current_software: z.string().trim().max(120).optional().or(z.literal("")),
  requirements: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().max(0).optional(),
});

type RequestEmailData = z.infer<typeof BodySchema> & { request_id: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sendOwnerConfirmation(data: RequestEmailData) {
  const html = emailShell("Gym access request received", `
    <p style="color:#c8c8c8;margin:0 0 18px">Hi ${escapeHtml(data.owner_full_name)},</p>
    <p style="color:#c8c8c8;margin:0 0 18px">We received your SE7EN FIT gym management access request for <strong>${escapeHtml(data.gym_name)}</strong>.</p>
    <p style="color:#c8c8c8;margin:0 0 18px">Our admin team will review your details. If approved, you will receive a unique single-use access code by email.</p>
    <div style="border:1px solid #333;background:#111;padding:14px;margin-top:20px;color:#c8c8c8">
      <div><strong>Request ID:</strong> ${escapeHtml(data.request_id)}</div>
      <div><strong>Status:</strong> Pending review</div>
    </div>
  `);
  return sendBrevoEmail({
    to: data.owner_email,
    toName: data.owner_full_name,
    subject: "SE7EN FIT gym access request received",
    html,
    text: `We received your SE7EN FIT gym access request for ${data.gym_name}. Request ID: ${data.request_id}. If approved, you will receive a unique access code by email.`,
  });
}

async function sendAdminNotification(data: RequestEmailData) {
  if (!emailConfig.adminNotifyEmail) return { sent: false, error: "ADMIN_NOTIFY_EMAIL is not configured" };
  const html = emailShell("New gym owner request", `
    <p style="color:#c8c8c8;margin:0 0 18px">A new gym owner submitted an access request and is waiting for review.</p>
    <div style="border:1px solid #333;background:#111;padding:16px;color:#c8c8c8">
      <div><strong>Gym:</strong> ${escapeHtml(data.gym_name)}</div>
      <div><strong>Owner:</strong> ${escapeHtml(data.owner_full_name)}</div>
      <div><strong>Email:</strong> ${escapeHtml(data.owner_email)}</div>
      <div><strong>Phone:</strong> ${escapeHtml(data.owner_phone || "-")}</div>
      <div><strong>City:</strong> ${escapeHtml(data.city || "-")}</div>
      <div><strong>Type:</strong> ${escapeHtml(data.gym_type)}</div>
      <div><strong>Members:</strong> ${escapeHtml(String(data.estimated_members ?? "-"))}</div>
    </div>
    ${data.requirements ? `<p style="color:#c8c8c8;margin-top:18px"><strong>Requirements:</strong><br>${escapeHtml(data.requirements)}</p>` : ""}
  `);
  return sendBrevoEmail({
    to: emailConfig.adminNotifyEmail,
    toName: "SE7EN FIT Admin",
    subject: `New SE7EN FIT gym request: ${data.gym_name}`,
    html,
    text: `New gym request. Gym: ${data.gym_name}. Owner: ${data.owner_full_name}. Email: ${data.owner_email}.`,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || null;

  let raw: unknown;
  try { raw = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  const data = parsed.data;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("gym_owner_requests")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", data.owner_email)
    .gte("created_at", sinceIso);

  if ((recentCount ?? 0) >= 3) return json(429, { error: "Too many recent applications. Please contact support@se7en.fit." });

  const { data: inserted, error } = await supabase
    .from("gym_owner_requests")
    .insert({
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
      status: "pending",
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[submit-gym-request] insert error", error);
    return json(500, { error: "Could not save your application. Try again shortly." });
  }

  const emailData = { ...data, request_id: inserted.id };
  const [ownerEmail, adminEmail] = await Promise.all([sendOwnerConfirmation(emailData), sendAdminNotification(emailData)]);

  await supabase.from("audit_logs").insert({
    actor_id: null,
    action: "gym_request.submitted",
    entity_type: "gym_owner_request",
    entity_id: inserted.id,
    metadata: {
      gym_name: data.gym_name,
      owner_email: data.owner_email,
      owner_confirmation_sent: ownerEmail.sent,
      owner_confirmation_error: ownerEmail.error,
      admin_notification_sent: adminEmail.sent,
      admin_notification_error: adminEmail.error,
    },
    ip,
  });

  return json(200, {
    ok: true,
    request_id: inserted.id,
    submitted_at: inserted.created_at,
    owner_confirmation_sent: ownerEmail.sent,
    admin_notification_sent: adminEmail.sent,
  });
});
