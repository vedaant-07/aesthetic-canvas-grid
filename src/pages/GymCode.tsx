import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTIVATION_KEY = "se7en.gym.activation";
const REQUEST_KEY = "se7en.gym.activation.request";

function friendlyCodeError(error?: string) {
  switch (error) {
    case "code_already_used":
      return "This access code was already used. Sign in with the approved owner email to open the dashboard.";
    case "code_expired":
      return "This access code expired. Ask admin to re-send a new code.";
    case "code_not_active":
      return "This access code is not active. Ask admin to re-send a new code.";
    case "request_not_approved":
      return "This request is not approved anymore. Contact admin support.";
    case "invalid_code":
    case "invalid_or_expired_code":
      return "Code not found. Check the latest email and paste the full code exactly.";
    default:
      return error || "Invalid, expired, used, or inactive code.";
  }
}

const GymCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validGym, setValidGym] = useState<string | null>(null);

  useEffect(() => {
    const runPendingActivation = async () => {
      const token = sessionStorage.getItem(ACTIVATION_KEY);
      if (!token) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) await activateNow(token);
    };
    runPendingActivation();
  }, []);

  const activateNow = async (activationToken: string) => {
    const { data, error } = await supabase.functions.invoke("activate-gym-owner", {
      body: { activation_token: activationToken },
    });

    if (error || !data?.ok) {
      const reason = data?.error || error?.message || "Could not activate this gym for the signed-in account.";
      toast.error("Activation failed", { description: reason === "email_mismatch" ? "Sign in with the same email that received the access code." : reason });
      return false;
    }

    sessionStorage.removeItem(ACTIVATION_KEY);
    sessionStorage.removeItem(REQUEST_KEY);
    toast.success("Gym activated", { description: `${data.gym?.name || "Your gym"} is now connected.` });
    navigate("/gym-management/login", { replace: true });
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setValidGym(null);

    const { data, error } = await supabase.functions.invoke("validate-gym-code", { body: { code: clean } });

    if (error || !data?.ok) {
      setLoading(false);
      const message = friendlyCodeError(data?.error || error?.message);
      toast.error("Code not accepted", { description: message });
      if (data?.error === "code_already_used") {
        setTimeout(() => navigate("/gym-management/login"), 1000);
      }
      return;
    }

    sessionStorage.setItem(ACTIVATION_KEY, data.activation_token);
    sessionStorage.setItem(REQUEST_KEY, JSON.stringify(data.request));
    setValidGym(data.request?.gym_name || "Approved gym");

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await activateNow(data.activation_token);
      setLoading(false);
      return;
    }

    setLoading(false);
    toast.success("Code verified", { description: "Now sign in with the approved owner email to activate your gym workspace." });
  };

  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Enter Unique Code</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-8">
          Activate your gym.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl">
          Use the latest single-use access code from your approval email. If the code was already used, sign in directly.
        </p>

        <form onSubmit={submit} className="mt-10 border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-widest text-foreground/70">Unique access code</span>
            <input
              className="lv-input font-mono tracking-wider uppercase"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SE7EN-GYM-XXXX-XXXX-XXXX"
              required
            />
          </label>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? "Checking…" : "Validate code"}
          </button>
        </form>

        <div className="mt-6 border border-separator bg-hover-bg/20 p-5 text-sm text-foreground/70 leading-relaxed">
          <p className="mb-4">
            Code already used? That normally means your gym is already activated. Open Owner Portal and sign in with the approved owner email.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest">
            <Link to="/gym-management/login" className="text-accent hover:opacity-80">Owner Portal</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/gym-management/request-access" className="text-foreground/70 hover:text-foreground">Request approval</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/support" className="text-foreground/70 hover:text-foreground">Contact support</Link>
          </div>
        </div>

        {validGym && (
          <div className="mt-8 border border-accent/40 bg-accent/10 p-6 animate-fade-in">
            <div className="flex gap-4 items-start">
              <CheckCircle2 className="text-accent shrink-0 mt-1" size={22} />
              <div>
                <h2 className="font-display font-semibold text-2xl">{validGym} is approved.</h2>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                  Continue with Google or email code using the approved owner email to activate the gym workspace.
                </p>
                <button onClick={() => navigate("/gym-management/login")} className="mt-5 inline-flex px-5 py-3 bg-foreground text-background text-xs uppercase tracking-widest font-medium">
                  Continue to Owner Portal →
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default GymCode;
