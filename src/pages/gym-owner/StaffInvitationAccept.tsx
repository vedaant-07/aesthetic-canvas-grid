import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { platformApi, PlatformApiError } from "@/lib/platformApi";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

type Step = "checking" | "signin" | "otp" | "accepting" | "success" | "error";

function errorMessage(error: unknown) {
  if (error instanceof PlatformApiError || error instanceof Error) return error.message;
  return "The invitation could not be accepted.";
}

export default function StaffInvitationAccept() {
  const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
  const [step, setStep] = useState<Step>("checking");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const acceptInvitation = async () => {
    if (!token) {
      setMessage("This invitation link is incomplete.");
      setStep("error");
      return;
    }
    setStep("accepting");
    try {
      await platformApi.acceptStaffInvitation(token);
      setStep("success");
      window.setTimeout(() => window.location.replace("/gym-management/login"), 1300);
    } catch (error) {
      setMessage(errorMessage(error));
      setStep("error");
    }
  };

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!token) {
        if (active) {
          setMessage("This invitation link is incomplete.");
          setStep("error");
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) await acceptInvitation();
      else setStep("signin");
    };
    void check();
    return () => { active = false; };
  }, [token]);

  const continueWithGoogle = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}?token=${encodeURIComponent(token)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setLoading(false);
      toast.error("Google sign-in failed", { description: error.message });
    }
  };

  const sendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}?token=${encodeURIComponent(token)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) {
      toast.error("Email code not sent", { description: error.message });
      return;
    }
    setEmail(cleanEmail);
    setStep("otp");
    toast.success("Verification code sent");
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.trim().length < 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      await acceptInvitation();
    } catch (error) {
      toast.error("Code verification failed", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <section className="container-wide flex min-h-[78vh] items-center justify-center py-14">
        <div className="w-full max-w-xl border border-separator bg-background p-6 md:p-10">
          <Link to="/gym-management" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={14} /> Gym management
          </Link>

          <div className="mb-8 flex h-14 w-14 items-center justify-center border border-accent/30 bg-accent/10 text-accent">
            {step === "success" ? <CheckCircle2 size={25} /> : <Users size={25} />}
          </div>

          <p className="text-label mb-3">SE7EN FIT Team Access</p>
          <h1 className="font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl">
            {step === "success" ? "Access activated." : "Accept gym invitation."}
          </h1>

          {(step === "checking" || step === "accepting") && (
            <div className="mt-10 flex items-center gap-3 border border-separator bg-hover-bg/30 p-5 text-sm text-foreground/70">
              <Loader2 size={18} className="animate-spin text-accent" />
              {step === "checking" ? "Checking your secure invitation…" : "Connecting your account to the gym…"}
            </div>
          )}

          {step === "signin" && (
            <div className="mt-10 space-y-5">
              <p className="text-sm leading-relaxed text-foreground/65">Sign in with the exact email address that received the invitation. The backend verifies the email before granting any gym permissions.</p>
              <button type="button" onClick={continueWithGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest text-background disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-background font-bold normal-case tracking-normal text-foreground">G</span>}
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-separator" /> or email code <span className="h-px flex-1 bg-separator" /></div>
              <form onSubmit={sendOtp} className="space-y-4">
                <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-foreground/70">Invited email</span><input className="lv-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
                <button disabled={loading} className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50"><Mail size={16} /> Send code</button>
              </form>
            </div>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="mt-10 space-y-5">
              <p className="text-sm leading-relaxed text-foreground/65">Enter the code sent to <span className="font-mono text-foreground">{email}</span>.</p>
              <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-foreground/70">Email code</span><input className="lv-input text-center font-mono tracking-[0.35em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="00000000" /></label>
              <div className="flex flex-wrap gap-3"><button disabled={loading || otp.length < 6} className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify and accept</button><button type="button" disabled={loading} onClick={() => setStep("signin")} className="border border-separator px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50">Change email</button></div>
            </form>
          )}

          {step === "success" && <div className="mt-10 border border-accent/30 bg-accent/10 p-5 text-sm text-foreground/75">Your role and permissions are active. Opening the shared gym workspace…</div>}

          {step === "error" && (
            <div className="mt-10 space-y-5">
              <div className="border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{message}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">Ask the gym owner to create a fresh invitation if this link expired, was revoked, or belongs to another email.</p>
              <Link to="/gym-management/login" className="inline-flex border border-separator px-5 py-3 text-xs uppercase tracking-widest hover:bg-hover-bg">Open gym login</Link>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
