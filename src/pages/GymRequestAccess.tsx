import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REQUEST_STATUS_KEY = "se7en.gym.request.status";

const FormSchema = z.object({
  gym_name: z.string().trim().min(2, "Required").max(120),
  owner_full_name: z.string().trim().min(2, "Required").max(120),
  owner_email: z.string().trim().email("Invalid email").max(255),
  owner_phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  gym_type: z.enum([
    "commercial", "boutique", "crossfit", "studio",
    "hotel", "corporate", "private", "other",
  ], { errorMap: () => ({ message: "Pick a gym type" }) }),
  estimated_members: z.coerce.number().int().min(0).max(1_000_000).optional(),
  current_software: z.string().trim().max(120).optional().or(z.literal("")),
  requirements: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().max(0).optional(), // honeypot
});

type FormValues = z.infer<typeof FormSchema>;
type RequestStatus = {
  id: string;
  status: "pending" | "approved" | "activated" | "rejected" | string;
  owner_email?: string;
  gym_name?: string;
};

const gymTypes: { value: FormValues["gym_type"]; label: string }[] = [
  { value: "commercial", label: "Commercial" },
  { value: "boutique", label: "Boutique" },
  { value: "crossfit", label: "CrossFit / Functional" },
  { value: "studio", label: "Studio (Yoga / Pilates)" },
  { value: "hotel", label: "Hotel / Hospitality" },
  { value: "corporate", label: "Corporate" },
  { value: "private", label: "Private / PT studio" },
  { value: "other", label: "Other" },
];

const GymRequestAccess = () => {
  const [submitted, setSubmitted] = useState<RequestStatus | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(REQUEST_STATUS_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RequestStatus;
      if (parsed?.id && parsed.status !== "rejected") setSubmitted(parsed);
    } catch {
      localStorage.removeItem(REQUEST_STATUS_KEY);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { gym_type: undefined, website: "" },
  });

  const saveStatus = (status: RequestStatus) => {
    setSubmitted(status);
    localStorage.setItem(REQUEST_STATUS_KEY, JSON.stringify(status));
  };

  const onSubmit = async (values: FormValues) => {
    const { data, error } = await supabase.functions.invoke("submit-gym-request", {
      body: values,
    });

    if (error) {
      const msg =
        (error as { context?: { error?: string } })?.context?.error ??
        error.message ??
        "Something went wrong. Please try again.";
      toast.error("Application not submitted", { description: msg });
      return;
    }

    if (!data?.ok) {
      toast.error("Application not submitted", {
        description: data?.error ?? "Unknown error",
      });
      return;
    }

    const status: RequestStatus = {
      id: data.request_id,
      status: data.status ?? "pending",
      owner_email: values.owner_email,
      gym_name: values.gym_name,
    };

    saveStatus(status);
    reset();

    if (data.duplicate) {
      toast.info("Request already exists", { description: "Your gym owner request is already in review." });
    }
  };

  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link
          to="/gym-management"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        {submitted ? (
          <RequestStatusCard request={submitted} />
        ) : (
          <>
            <p className="text-label mb-4">Request Access</p>
            <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-6">
              Apply to use SE7EN FIT.
            </h1>
            <p className="text-base md:text-lg text-foreground/70 leading-relaxed max-w-2xl mb-12">
              Every application is reviewed manually. Approved gyms receive a single-use access code by email.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
              <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
                </label>
              </div>

              <fieldset className="space-y-6">
                <legend className="text-label mb-2">Gym</legend>

                <Field label="Gym name *" error={errors.gym_name?.message}>
                  <input className="lv-input" {...register("gym_name")} />
                </Field>

                <Field label="Gym type *" error={errors.gym_type?.message}>
                  <select className="lv-input" defaultValue="" {...register("gym_type")}>
                    <option value="" disabled>Select…</option>
                    {gymTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="City" error={errors.city?.message}>
                    <input className="lv-input" {...register("city")} />
                  </Field>
                  <Field label="Country" error={errors.country?.message}>
                    <input className="lv-input" {...register("country")} />
                  </Field>
                </div>

                <Field label="Estimated active members" error={errors.estimated_members?.message}>
                  <input type="number" min={0} className="lv-input" {...register("estimated_members")} />
                </Field>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-label mb-2">Owner contact</legend>

                <Field label="Full name *" error={errors.owner_full_name?.message}>
                  <input className="lv-input" {...register("owner_full_name")} />
                </Field>

                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Email *" error={errors.owner_email?.message}>
                    <input type="email" className="lv-input" {...register("owner_email")} />
                  </Field>
                  <Field label="Phone" error={errors.owner_phone?.message}>
                    <input type="tel" className="lv-input" {...register("owner_phone")} />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-6">
                <legend className="text-label mb-2">Context</legend>

                <Field label="Current gym software (if any)" error={errors.current_software?.message}>
                  <input className="lv-input" {...register("current_software")} />
                </Field>

                <Field
                  label="What do you need from SE7EN FIT?"
                  error={errors.requirements?.message}
                  hint="Optional — up to 2000 characters."
                >
                  <textarea rows={5} className="lv-input resize-y" {...register("requirements")} />
                </Field>
              </fieldset>

              <div className="flex items-center justify-between pt-4 border-t border-separator">
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  By submitting you confirm the information is accurate. We may contact you for verification.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium tracking-widest uppercase bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </Layout>
  );
};

function RequestStatusCard({ request }: { request: RequestStatus }) {
  const isApproved = request.status === "approved";
  const isActivated = request.status === "activated";

  return (
    <div className="animate-fade-in">
      <p className="text-label mb-4">{isApproved ? "Application approved" : isActivated ? "Workspace activated" : "Application in review"}</p>
      <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-8">
        {isApproved ? "Access approved." : isActivated ? "Gym connected." : "Request pending."}
      </h1>
      <div className="border border-separator p-8 bg-hover-bg/40 space-y-6">
        <div className="flex gap-4 items-start">
          <CheckCircle2 size={22} className="text-accent shrink-0 mt-1" />
          <div className="space-y-2 text-sm text-foreground/75 leading-relaxed">
            <p>
              Your application <span className="font-mono text-foreground">{request.id.slice(0, 8)}</span> is currently
              <span className="font-mono text-foreground uppercase"> {request.status}</span>.
            </p>
            <p>
              {isApproved
                ? "Enter the access code sent by email to activate your gym owner workspace."
                : isActivated
                  ? "Your gym owner workspace is already active. Continue to the gym portal."
                  : "Please wait for admin approval. You cannot submit another request while this one is pending."}
            </p>
            {request.owner_email && <p className="font-mono text-xs text-muted-foreground">{request.owner_email}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-separator">
          <Link to={isActivated ? "/gym-management/login" : "/gym-management/code"} className="inline-flex justify-center px-5 py-3 bg-accent text-accent-foreground text-xs uppercase tracking-widest font-medium hover:opacity-90">
            {isActivated ? "Open gym portal" : "Enter access code"}
          </Link>
          <Link to="/gym-management" className="inline-flex justify-center px-5 py-3 border border-separator text-xs uppercase tracking-widest hover:bg-hover-bg">
            Back to gym management
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest">
          <Link to="/support" className="text-foreground/70 hover:text-foreground">Contact support</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/" className="text-accent hover:opacity-80">Back to home</Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-widest text-foreground/70">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export default GymRequestAccess;
