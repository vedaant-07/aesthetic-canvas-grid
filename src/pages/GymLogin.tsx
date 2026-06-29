import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, CalendarCheck, CreditCard, Loader2, LogIn, LogOut, Mail, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ACTIVATION_KEY = "se7en.gym.activation";
const REQUEST_KEY = "se7en.gym.activation.request";

type OwnerGym = { id: string; name: string; city: string | null; status: string };
type OtpStep = "email" | "otp";

const GymLogin = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<OtpStep>("email");
  const [loading, setLoading] = useState(false);
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

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
      },
    });
    setLoading(false);

    if (error) {
      toast.error("OTP not sent", { description: error.message });
      return;
    }

    setEmail(cleanEmail);
    setStep("otp");
    toast.success("OTP sent", { description: "Check your email and enter the verification code." });
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
        description: err instanceof Error ? err.message : "Please check the code and try again.",
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
          Email OTP login.
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed max-w-2xl mb-10">
          {request?.gym_name
            ? `Your code is verified for ${request.gym_name}. Enter the OTP sent to the approved owner email to activate the workspace.`
            : "Approved gym owners can sign in with a secure email OTP. New owners should validate their unique access code first."}
        </p>

        {step === "email" ? (
          <form onSubmit={sendOtp} className="border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-foreground/70">Owner email</span>
              <input
                className="lv-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <button disabled={loading} type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="border border-separator bg-hover-bg/30 p-6 md:p-8 space-y-5">
            <div className="text-sm text-foreground/70 leading-relaxed">
              OTP sent to <span className="font-mono text-foreground">{email}</span>
            </div>
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-widest text-foreground/70">Email OTP</span>
              <input
                className="lv-input font-mono tracking-[0.35em] text-center"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                required
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={loading || otp.length !== 6} type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground uppercase tracking-widest text-xs font-medium disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Verify & Continue
              </button>
              <button type="button" disabled={loading} onClick={() => setStep("email")} className="px-6 py-3 border border-separator uppercase tracking-widest text-xs disabled:opacity-50">
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Gym access is enforced by backend role and gym-scope checks, not by frontend UI alone.
        </p>
      </section>
    </Layout>
  );
};

function OwnerWorkspace() {
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<OwnerGym | null>(null);
  const [counts, setCounts] = useState({ members: 0, attendance: 0, payments: 0 });

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getSession();
    const user = auth.session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: ownerLink } = await supabase
      .from("gym_owners")
      .select("gym_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownerLink?.gym_id) {
      setLoading(false);
      return;
    }

    const { data: gymRow } = await supabase
      .from("gyms")
      .select("gym_id, name, city, status")
      .eq("gym_id", ownerLink.gym_id)
      .maybeSingle();

    if (!gymRow || gymRow.status !== "active") {
      setLoading(false);
      return;
    }

    setGym({ id: gymRow.gym_id, name: gymRow.name, city: gymRow.city, status: gymRow.status });

    const [members, attendance, payments] = await Promise.all([
      supabase.from("gym_manual_members").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.gym_id),
      supabase.from("gym_attendance_logs").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.gym_id),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.gym_id),
    ]);

    setCounts({ members: members.count ?? 0, attendance: attendance.count ?? 0, payments: payments.count ?? 0 });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <Layout hideFooter>
      <section className="container-wide py-10">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : !gym ? (
          <div className="max-w-xl py-20">
            <h1 className="font-display text-3xl font-bold mb-3">Access not active</h1>
            <p className="text-foreground/70">This account is not linked to an active approved gym.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-6 mb-10">
              <div>
                <p className="text-label mb-2">Gym owner workspace</p>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.02em]">{gym.name}</h1>
                <p className="mt-3 text-sm text-foreground/60">{gym.city || "City not set"} · {gym.status}</p>
              </div>
              <button onClick={logout} className="inline-flex items-center gap-2 px-4 py-2 border border-separator text-xs uppercase tracking-widest"><LogOut size={14} /> Sign out</button>
            </div>
            <div className="grid md:grid-cols-3 gap-px bg-separator border border-separator mb-10">
              <Metric icon={Users} label="Members" value={counts.members} />
              <Metric icon={CalendarCheck} label="Attendance logs" value={counts.attendance} />
              <Metric icon={CreditCard} label="Payments" value={counts.payments} />
            </div>
            <div className="border border-separator p-8 bg-hover-bg/30">
              <p className="text-label mb-3">Next modules</p>
              <p className="text-sm text-foreground/70 leading-relaxed max-w-3xl">
                The account and gym are now connected. Add the full management modules here using this same gym_id scope: members, leads, QR attendance, equipment, challenges, rewards, announcements, payouts and reports.
              </p>
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="bg-background p-6 md:p-8"><Icon className="text-accent mb-6" size={22} /><p className="text-label mb-2">{label}</p><p className="font-display text-5xl font-bold">{value}</p></div>;
}

export default GymLogin;
