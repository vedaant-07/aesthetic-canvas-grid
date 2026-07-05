import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, getIp, json, verifyToken } from "../_shared/admin.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const codePepper = Deno.env.get("ACCESS_CODE_PEPPER") ?? "";
const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? "";
const fromEmail = Deno.env.get("BREVO_FROM_EMAIL") || Deno.env.get("SE7ENFIT_FROM_EMAIL") || "";
const fromName = Deno.env.get("BREVO_FROM_NAME") || "SE7EN FIT";
const publicSiteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "https://aesthetic-canvas-grid.onrender.com").replace(/\/$/, "");
const encoder = new TextEncoder();

const Body = z.object({
  action: z.enum(["list", "approve", "reject", "suspend", "generate_code"]),
  request_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  expires_in_days: z.number().int().min(1).max(90).optional(),
});

async function sha256(input: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(`${input}:${codePepper}`));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let s = "SE7EN-GYM-";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}

function codeEmailHtml(params: { gymName: string; code: string; expiresAt: string }) {
  const codeUrl = `${publicSiteUrl}/gym-management/code`;
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#050505;color:#ffffff;padding:32px;line-height:1.5">
    <div style="max-width:620px;margin:0 auto;border:1px solid #222;padding:28px;background:#0b0b0b">
      <h1 style="margin:0 0 12px;font-size:28px;letter-spacing:-0.02em">SE7EN FIT gym access approved</h1>
      <p style="color:#c8c8c8;margin:0 0 20px">Your gym management request for <strong>${params.gymName}</strong> has been approved.</p>
      <p style="color:#c8c8c8;margin:0 0 10px">Enter this unique single-use code:</p>
      <div style="font-size:24px;letter-spacing:3px;font-weight:700;color:#7CFF00;border:1px solid #7CFF00;padding:16px;margin:18px 0;background:#111">${params.code}</div>
      <p style="color:#c8c8c8;margin:0 0 20px">This code expires on ${new Date(params.expiresAt).toLocaleString()}.</p>
      <p style="margin:24px 0"><a href="${codeUrl}" style="background:#7CFF00;color:#000;text-decoration:none;padding:12px 18px;font-weight:700;display:inline-block">Enter code</a></p>
      <p style="font-size:12px;color:#888;margin-top:28px">If you did not request this access, ignore this email.</p>
    </div>
  </div>`;
}

async function sendAccessCodeEmail(request: { owner_email: string; owner_full_name?: string | null; gym_name: string }, code: string, expiresAt: string) {
  if (!brevoApiKey || !fromEmail) {
    return { sent: false, error: "BREVO_API_KEY or BREVO_FROM_EMAIL is not configured" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: request.owner_email, name: request.owner_full_name || request.owner_email }],
      subject: `SE7EN FIT access code for ${request.gym_name}`,
      htmlContent: codeEmailHtml({ gymName: request.gym_name, code, expiresAt }),
      textContent: `SE7EN FIT gym access approved. Your single-use code for ${request.gym_name}: ${code}. Enter it at ${publicSiteUrl}/gym-management/code. Expires: ${expiresAt}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { sent: false, error: text || `Brevo API failed with ${res.status}` };
  }
  return { sent: true, error: null };
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Response("unauthorized", { status: 401 });
  const sessionToken = req.headers.get("x-admin-session") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) throw new Response("unauthorized", { status: 401 });
  const session = await verifyToken(sessionSecret, "admin_session", sessionToken);
  if (!session || session.sub !== userData.user.id) throw new Response("session_required", { status: 401 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: ok } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!ok) throw new Response("forbidden", { status: 403 });
  return { admin, user: userData.user };
}

async function createCode(admin: ReturnType<typeof createClient>, request_id: string, expires_in_days = 14) {
  const { data: request } = await admin
    .from("gym_owner_requests")
    .select("id, status, owner_email, owner_full_name, gym_name")
    .eq("id", request_id)
    .maybeSingle();
  if (!request || request.status !== "approved") return { error: "request_not_approved" as const };

  const code = makeCode();
  const code_hash = await sha256(code);
  const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();
  const { data: codeRow, error } = await admin
    .from("unique_access_codes")
    .insert({ request_id, code_hash, code_prefix: code.slice(0, 12), expires_at, status: "unused" })
    .select("id, code_prefix, expires_at, status")
    .single();
  if (error) return { error: error.message as string };

  const email = await sendAccessCodeEmail(request, code, expires_at);
  return { request, code, code_record: codeRow, email_sent: email.sent, email_error: email.error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { admin, user } = await requireAdmin(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "bad_request" }, 400);
    const body = parsed.data;

    if (body.action === "list") {
      const { data, error } = await admin.from("gym_owner_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, requests: data ?? [] });
    }

    if (!body.request_id) return json({ error: "request_id_required" }, 400);

    if (body.action === "approve") {
      const { data, error } = await admin
        .from("gym_owner_requests")
        .update({ status: "approved", reviewer_id: user.id, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", body.request_id)
        .select("*")
        .single();
      if (error) return json({ error: error.message }, 500);

      await admin.from("audit_logs").insert({ actor_id: user.id, action: "gym_request.approve", entity_type: "gym_owner_request", entity_id: body.request_id, metadata: { status: "approved" }, ip: getIp(req) });

      const codeResult = await createCode(admin, body.request_id, body.expires_in_days ?? 14);
      if ("error" in codeResult) return json({ ok: true, request: data, code_error: codeResult.error });

      await admin.from("audit_logs").insert({
        actor_id: user.id,
        action: codeResult.email_sent ? "gym_code.generated_and_emailed" : "gym_code.generated_email_failed",
        entity_type: "unique_access_code",
        entity_id: codeResult.code_record.id,
        metadata: { request_id: body.request_id, email_sent: codeResult.email_sent, email_error: codeResult.email_error },
        ip: getIp(req),
      });

      return json({ ok: true, request: data, code: codeResult.code, code_record: codeResult.code_record, email_sent: codeResult.email_sent, email_error: codeResult.email_error });
    }

    if (["reject", "suspend"].includes(body.action)) {
      const { data, error } = await admin
        .from("gym_owner_requests")
        .update({ status: "rejected", reviewer_id: user.id, reviewer_notes: body.notes ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", body.request_id)
        .select("*")
        .single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({ actor_id: user.id, action: `gym_request.${body.action}`, entity_type: "gym_owner_request", entity_id: body.request_id, metadata: { status: "rejected" }, ip: getIp(req) });
      return json({ ok: true, request: data });
    }

    const codeResult = await createCode(admin, body.request_id, body.expires_in_days ?? 14);
    if ("error" in codeResult) return json({ error: codeResult.error }, 400);

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: codeResult.email_sent ? "gym_code.generated_and_emailed" : "gym_code.generated_email_failed",
      entity_type: "unique_access_code",
      entity_id: codeResult.code_record.id,
      metadata: { request_id: body.request_id, email_sent: codeResult.email_sent, email_error: codeResult.email_error },
      ip: getIp(req),
    });
    return json({ ok: true, code: codeResult.code, code_record: codeResult.code_record, email_sent: codeResult.email_sent, email_error: codeResult.email_error });
  } catch (e) {
    if (e instanceof Response) return json({ error: await e.text() }, e.status);
    console.error("[admin-requests]", e);
    return json({ error: "server_error" }, 500);
  }
});
