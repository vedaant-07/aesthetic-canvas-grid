import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTIVATION_KEY = "se7en.gym.activation";
const REQUEST_KEY = "se7en.gym.activation.request";

type Mode = "login" | "signup";

const GymLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<{ gym_name?: string; owner_email?: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(REQUEST_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRequest(parsed);
        if (parsed.owner_email) setEmail(parsed.owner_email);
        setMode("signup");
      } catch { /* ignore */ }
    }
  }, []);

  const activateIfNeeded = async () => {
    const activationToken = sessionStorage.getItem(ACTIVATION_KEY);
    if (!activationToken) return true;
    const { data, error } = await supabase.functions.invoke("activate-gym-owner", {
      body: { activation_token: activationToken },
    });
    if (error || !data?.ok) {
      toast.error("Activation failed", { description: data?.error || error?.message || "The access code could not be linked to this account." });
      return false;
    }
    sessionStorage.removeItem(ACTIVATION_KEY);
    sessionStorage.removeItem(REQUEST_KEY);
    toast.success("Gym activated", { description: `${data.gym?.name || "Your gym"} is now connected.` });
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created", { description: "Verify your email, then sign in here to finish activation." });
          setMode("login");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      const activated = await activateIfNeeded();
      if (activated) navigate("/gym-owner/dashboard", { replace: true });
    } catch (err) {
      toast.error(mode === "signup" ? "Signup failed" : "Login failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="container-wide py-16 md:py-24 max-w-3xl">
        <Link to="/gym-management" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <ArrowLeft size={14} /> Back to Gym Management
        </Link>

        <p className="text-label mb-4">Gym Owner Access</p>
        <h1 className="font-display font-bold tracking-[-0.02em] leading-[0.95] text-[clamp(2.25rem,6vw,5rem)] mb-6">
          {mode === "signup" ? "Create owner account." : "Sign in."}
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl mb-10">
          {request?.gym_name
            ? `Your code is verified for ${request.gym_name}. Use the approved owner email to activate the workspace.`
            : "Approved gym owners can sign in here. New owners should validate their unique access code first."}
        </p>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode("login")} className={`px-4 py-2 text-xs uppercase tracking-widest border ${mode === "login" ? "bg-foreground text-background" : "border-separator"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`px-4 py-2 text-xs uppercase tracking-widest border ${mode === "signup" ? "bg-foreground text-background" : "border-separator"}`}>Create account</button>
        </div>

        <form onSubmit={submit} className="border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-widest text-foreground/70">Owner email</span>
            <input className="lv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </label>
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-widest text-foreground/70">Password</span>
            <input className="lv-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
          </label>
          <button disabled={loading} type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === "signup" ? <UserPlus size={16} /> : <LogIn size={16} />}
            {mode === "signup" ? "Create & activate" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Gym access is still enforced by backend role and gym-scope checks. Direct URL access without a valid gym-owner role is rejected.
        </p>
      </section>
    </Layout>
  );
};

export default GymLogin;
