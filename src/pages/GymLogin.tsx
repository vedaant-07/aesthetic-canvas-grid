import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OwnerWorkspacePhase3 from "./gym-owner/OwnerWorkspacePhase3";

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

  const wantsRequestAccess = () => new URLSearchParams(window.location.search).get("next") === "request-access";
  const loginRedirectPath = () => wantsRequestAccess() ? "/gym-management/login?next=request-access" : "/gym-management/login";

  useEffect(() => {
    const stored = sessionStorage.getItem(REQUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRequest(parsed);
        if (parsed.owner_email) setEmail(parsed.owner_email);
      } catch {
        /* Ignore invalid local request state. */
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
    const finishLogin = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const hasActivationToken = Boolean(sessionStorage.getItem(ACTIVATION_KEY));
      if (wantsRequestAccess() && !hasActivationToken) {
        window.location.replace("/gym-management/request-access");
        return;
      }

      const activated = await activateIfNeeded();
      if (activated) setWorkspace(true);
    };
    void finishLogin();
  }, []);

  const continueWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${loginRedirectPath()}` },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error("Google login failed", { description: error.message });
    }
  };

  const sendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}${loginRedirectPath()}`,
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Email not sent", { description: error.message });
      return;
    }

    setEmail(cleanEmail);
    setStep("otp");
    toast.success("Login email sent", { description: "Enter the code from your email, or tap the sign-in link." });
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
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

      if (wantsRequestAccess() && !sessionStorage.getItem(ACTIVATION_KEY)) {
        window.location.replace("/gym-management/request-access");
        return;
      }

      const activated = await activateIfNeeded();
      if (activated) setWorkspace(true);
    } catch (error) {
      toast.error("Code verification failed", {
        description: error instanceof Error ? error.message : "Please check the code and try again, or tap the sign-in link in your email.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (workspace) return <OwnerWorkspacePhase3 />;

  return (
    <Layout>
      <section className="container-wide max-w-3xl py-16 md:py-24">
        <Link to="/gym-management" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Gym Owner and Staff Access</p>
        <h1 className="font-display mb-6 text-[clamp(2.25rem,6vw,5rem)] font-bold leading-[0.95] tracking-[-0.02em]">
          {wantsRequestAccess() ? "Sign up with Google." : "Secure gym login."}
        </h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-foreground/70">
          {wantsRequestAccess()
            ? "Create or sign in to your SE7EN FIT account first. We will use this verified email on the gym access request form."
            : request?.gym_name
              ? `Your code is verified for ${request.gym_name}. Continue with Google or email code to activate the workspace.`
              : "Approved gym owners and invited staff can sign in with Google or a secure email code. Backend permissions determine which management tools are available."}
        </p>

        <div className="space-y-5 border border-separator bg-hover-bg/30 p-6 md:p-8">
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest text-background hover:opacity-90 disabled:opacity-50"
          >
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-background font-bold normal-case tracking-normal text-foreground">G</span>}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-separator" /> or use email code <span className="h-px flex-1 bg-separator" />
          </div>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-foreground/70">Account email</span>
                <input className="lv-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <button disabled={loading || googleLoading} type="submit" className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Send secure email
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="text-sm leading-relaxed text-foreground/70">
                Login email sent to <span className="font-mono text-foreground">{email}</span>. Enter the code or tap the sign-in link.
              </div>
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-widest text-foreground/70">Email code</span>
                <input className="lv-input text-center font-mono tracking-[0.35em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="00000000" />
              </label>
              <div className="flex flex-wrap gap-3">
                <button disabled={loading || otp.length < 6} type="submit" className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Verify code
                </button>
                <button type="button" disabled={loading} onClick={() => setStep("email")} className="border border-separator px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Gym access and every write operation are enforced by backend role, permission and gym-scope checks.
        </p>
      </section>
    </Layout>
  );
};

export default GymLogin;
