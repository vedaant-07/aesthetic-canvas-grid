import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";

const backendEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECURITY_SECRET",
  "OTP_HASH_SECRET",
  "ADMIN_SESSION_SECRET",
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
  "MAILJET_FROM_EMAIL",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

const frontendEnvVars = [
  "VITE_API_BASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

const deploymentSteps = [
  "Treat the Render Node/Express API as the production business-logic authority.",
  "Create all new production schema migrations in SE7EN-FIT/server/supabase/migrations only.",
  "Do not add new production database migrations to this website repository.",
  "Keep Supabase service-role, signing, mail, payment and provider secrets out of all VITE_ variables and frontend files.",
  "Migrate the remaining super-admin Edge Function operations into the shared Render API before retiring the legacy Supabase function set.",
  "Require production-gate, Android/native checks where applicable, dependency audit and CodeQL before release.",
  "Rotate any credential that may have appeared in Git history, logs or copied configuration.",
];

export default function AdminSettings() {
  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="production"
        title="Settings"
        body="Operational guardrails for the unified SE7EN FIT platform: one API authority, one migration authority, and server-side authorization for privileged work."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-separator bg-background p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="text-accent" size={20} />
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Production checklist</h2>
          </div>
          <div className="space-y-3">
            {deploymentSteps.map((step) => (
              <div key={step} className="flex gap-3 text-sm text-foreground/75">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-separator bg-background p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Environment boundaries</h2>
            <StatusBadge status="least privilege" />
          </div>

          <p className="text-label mb-3">Public frontend configuration</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {frontendEnvVars.map((name) => (
              <div key={name} className="border border-separator bg-hover-bg/20 p-3 font-mono text-xs text-muted-foreground">{name}</div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Every VITE_ value is visible to browser users. It must be safe to expose publicly.</p>

          <p className="text-label mb-3 mt-6">Backend-only secrets</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {backendEnvVars.map((name) => (
              <div key={name} className="border border-separator bg-hover-bg/20 p-3 font-mono text-xs text-muted-foreground">{name}</div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Backend-only secrets belong in Render/Supabase/provider secret stores and must never be committed or compiled into this website.</p>
        </section>
      </div>
    </AdminControlLayout>
  );
}
