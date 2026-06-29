import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTIVATION_KEY = "se7en.gym.activation";
const REQUEST_KEY = "se7en.gym.activation.request";

const GymCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validGym, setValidGym] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setValidGym(null);
    const { data, error } = await supabase.functions.invoke("validate-gym-code", { body: { code: clean } });
    setLoading(false);

    if (error || !data?.ok) {
      toast.error("Code not accepted", { description: data?.error || error?.message || "Invalid, expired, used, or inactive code." });
      return;
    }

    sessionStorage.setItem(ACTIVATION_KEY, data.activation_token);
    sessionStorage.setItem(REQUEST_KEY, JSON.stringify(data.request));
    setValidGym(data.request?.gym_name || "Approved gym");
    toast.success("Code verified", { description: "Continue to create or sign in to your gym-owner account." });
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
          Enter the single-use access code issued after admin approval. The code is validated server-side against a hashed value and never checked only in the browser.
        </p>

        <form onSubmit={submit} className="mt-10 border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-widest text-foreground/70">Unique access code</span>
            <input
              className="lv-input font-mono tracking-wider uppercase"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SE7EN-GYM-XXXX-XXXX"
              required
            />
          </label>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Validate code
          </button>
        </form>

        {validGym && (
          <div className="mt-8 border border-accent/40 bg-accent/10 p-6 animate-fade-in">
            <div className="flex gap-4 items-start">
              <CheckCircle2 className="text-accent shrink-0 mt-1" size={22} />
              <div>
                <h2 className="font-display font-semibold text-2xl">{validGym} is approved.</h2>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                  Continue to owner login. New owners can create an account with the approved email; existing owners can sign in and activate the gym workspace.
                </p>
                <button onClick={() => navigate("/gym-management/login")} className="mt-5 inline-flex px-5 py-3 bg-foreground text-background text-xs uppercase tracking-widest font-medium">
                  Continue to login →
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
