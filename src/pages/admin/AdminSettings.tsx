import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";

const envVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SESSION_SECRET",
  "ACCESS_CODE_PEPPER",
  "PUBLIC_SITE_URL",
  "ALLOWED_ORIGINS",
  "BREVO_API_KEY",
  "BREVO_FROM_EMAIL",
  "ADMIN_NOTIFY_EMAIL",
];

const deploymentSteps = [
  "Run the Supabase migration in supabase/migrations before deploying functions.",
  "Deploy admin-session, admin-metrics, admin-requests, admin-users, admin-gyms, admin-payments, admin-access-codes, admin-audit-logs, search-router, validate-gym-code, and activate-gym-owner.",
  "Set all function secrets in Supabase; never put service_role keys in Render or frontend env variables.",
  "Create at least one Supabase Auth user with the super_admin role in public.user_roles.",
  "Configure Render build command as npm run build and publish directory as dist.",
  "Confirm the hidden search phrase unlocks /x7-control/login and public navigation has no admin links.",
];

export default function AdminSettings() {
  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="production" title="Settings" body="Operational checklist for keeping the SE7EN FIT admin dashboard secure in production." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-separator bg-background p-6">
          <div className="mb-5 flex items-center gap-3"><ShieldCheck className="text-accent" size={20} /><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Security checklist</h2></div>
          <div className="space-y-3">{deploymentSteps.map((step) => <div key={step} className="flex gap-3 text-sm text-foreground/75"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{step}</span></div>)}</div>
        </section>
        <section className="border border-separator bg-background p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Required environment</h2><StatusBadge status="server only" /></div>
          <div className="grid gap-2 sm:grid-cols-2">{envVars.map((name) => <div key={name} className="border border-separator bg-hover-bg/20 p-3 font-mono text-xs text-muted-foreground">{name}</div>)}</div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Only the two VITE_ variables belong in the frontend deployment. Supabase service_role, session signing, code pepper, and email provider secrets must stay in Supabase Edge Function secrets.</p>
        </section>
      </div>
    </AdminControlLayout>
  );
}
