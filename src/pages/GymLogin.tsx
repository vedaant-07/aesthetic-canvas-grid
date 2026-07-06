import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OwnerWorkspace from "./gym-owner/OwnerWorkspace";

const ACTIVATION_KEY = "se7en.gym.activation";
const REQUEST_KEY = "se7en.gym.activation.request";
type OtpStep = "email" | "otp";

const GymLogin = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<OtpStep>("email");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [request, setRequest] = useState<{ gym_name?: string; owner_email?: string } | null>(null);
  const [workspace, setWorkspace] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(REQUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRequest(parsed);
        if (parsed.owner_email) setEmail(parsed.owner_email);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const activateIfNeeded = async () => {
    const activationToken = sessionStorage.getItem(ACTIVATION_KEY);
    if (!activationToken) return true;

    const { data, error } = await supabase.functions.invoke("activate-gym-owner", {
      body: { activation_token: activationToken },
    });

    if (error || !data?.ok) {
      toast.error("Activation failed", {
        description: data?.error || error?.message || "The access code could not be linked to this account.",
      });
      return false;
    }

    sessionStorage.removeItem(ACTIVATION_KEY);
    sessionStorage.removeItem(REQUEST_KEY);
    toast.success("Gym activated", { description: `${data.gym?.name || "Your gym"} is now connected.` });
    return true;
  };

  useEffect(() => {
    const finishMagicLinkLogin = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const activated = await activateIfNeeded();
      if (activated) setWorkspace(true);
    };
    finishMagicLinkLogin();
  }, []);

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/gym-management/login` },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error("Google login failed", { description: error.message });
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/gym-management/login`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Email not sent", { description: error.message });
      return;
    }

    setEmail(cleanEmail);
    setStep("otp");
    toast.success("Login email sent", { description: "Use the 6-digit OTP if shown, or tap the sign-in link in the email." });
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "email",
      });
      if (error) throw error;
      const activated = await activateIfNeeded();
      if (activated) setWorkspace(true);
    } catch (err) {
      toast.error("OTP verification failed", {
        description: err instanceof Error ? err.message : "Please check the code and try again, or tap the sign-in link in your email.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (workspace) return <OwnerWorkspace />;

  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Gym Owner Access</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-6">
          Secure owner login.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl mb-10">
          {request?.gym_name
            ? `Your code is verified for ${request.gym_name}. Continue with Google or email OTP to activate the workspace.`
            : "Approved gym owners can sign in with Google or secure email OTP. New owners should validate their unique access code first."}
        </p>

        <div className="border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 px-6 py-3 bg-foreground text-background uppercase tracking-widest text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-background text-foreground font-bold normal-case tracking-normal">G</span>}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-separator" /> or use email OTP <span className="h-px flex-1 bg-separator" />
          </div>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-foreground/70">Owner email</span>
                <input className="lv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </label>
              <button disabled={loading || googleLoading} type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Send secure email
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="text-sm text-foreground/70 leading-relaxed">
                Login email sent to <span className="font-mono text-foreground">{email}</span>. If your email only shows a sign-in link, tap that link instead of entering an OTP.
              </div>
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-foreground/70">Email OTP</span>
                <input className="lv-input font-mono tracking-[0.35em] text-center" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" />
              </label>
              <div className="flex flex-wrap gap-3">
                <button disabled={loading || otp.length !== 6} type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Verify OTP
                </button>
                <button type="button" disabled={loading} onClick={() => setStep("email")} className="px-6 py-3 border border-separator uppercase tracking-widest text-xs disabled:opacity-50">
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Gym access is enforced by backend role and gym-scope checks, not by frontend UI alone.
        </p>
      </section>
    </Layout>
  );
};

export default GymLogin;
