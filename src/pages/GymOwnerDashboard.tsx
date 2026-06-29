import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, CreditCard, Loader2, LogOut, ShieldAlert, Users } from "lucide-react";

type Gym = { id: string; name: string; city: string | null; status: string };
type Counts = { members: number; attendance: number; payments: number };

export default function GymOwnerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<Gym | null>(null);
  const [counts, setCounts] = useState<Counts>({ members: 0, attendance: 0, payments: 0 });
  const [denied, setDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getSession();
    const user = auth.session?.user;
    if (!user) { navigate("/gym-management/login", { replace: true }); return; }

    const { data: role } = await supabase
      .from("user_roles")
      .select("gym_id, role")
      .eq("user_id", user.id)
      .eq("role", "gym_owner")
      .maybeSingle();

    if (!role?.gym_id) { setDenied(true); setLoading(false); return; }

    const { data: gymRow } = await supabase
      .from("gyms")
      .select("id, name, city, status")
      .eq("id", role.gym_id)
      .maybeSingle();

    if (!gymRow || gymRow.status !== "active") { setDenied(true); setLoading(false); return; }
    setGym(gymRow);

    const [members, attendance, payments] = await Promise.all([
      supabase.from("gym_members").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.id),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.id),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("gym_id", gymRow.id),
    ]);
    setCounts({ members: members.count ?? 0, attendance: attendance.count ?? 0, payments: payments.count ?? 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return <Layout><div className="container-wide py-24 flex justify-center"><Loader2 className="animate-spin" /></div></Layout>;
  }

  if (denied) {
    return (
      <Layout>
        <section className="container-wide py-20 max-w-xl">
          <ShieldAlert className="text-destructive mb-4" />
          <h1 className="font-display text-3xl font-bold mb-3">Access not active</h1>
          <p className="text-foreground/70 leading-relaxed">This account is not linked to an active approved gym. Validate your unique code or contact SE7EN FIT support.</p>
          <button onClick={() => navigate("/gym-management/code")} className="mt-6 px-5 py-3 bg-accent text-accent-foreground text-xs uppercase tracking-widest">Validate code</button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <section className="container-wide py-10">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div>
            <p className="text-label mb-2">Gym owner dashboard</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.02em]">{gym?.name}</h1>
            <p className="mt-3 text-sm text-foreground/60">{gym?.city || "City not set"} · {gym?.status}</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 px-4 py-2 border border-separator text-xs uppercase tracking-widest"><LogOut size={14} /> Sign out</button>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-separator border border-separator mb-10">
          <Metric icon={Users} label="Members" value={counts.members} />
          <Metric icon={CalendarCheck} label="Attendance logs" value={counts.attendance} />
          <Metric icon={CreditCard} label="Payments" value={counts.payments} />
        </div>

        <div className="border border-separator p-8 bg-hover-bg/30">
          <p className="text-label mb-3">Production note</p>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-3xl">
            This dashboard is now protected by Supabase auth and gym-owner role scoping. The next expansion should add the full management modules here: members CRUD, leads, QR attendance, equipment, challenges, rewards, announcements, payouts and reports using this same gym_id scope.
          </p>
        </div>
      </section>
    </Layout>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-background p-6 md:p-8">
      <Icon className="text-accent mb-6" size={22} />
      <p className="text-label mb-2">{label}</p>
      <p className="font-display text-5xl font-bold">{value}</p>
    </div>
  );
}
