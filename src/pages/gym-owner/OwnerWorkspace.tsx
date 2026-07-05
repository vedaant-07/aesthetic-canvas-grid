import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  UserCheck,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Gym = {
  id: string;
  name: string;
  city: string | null;
  country?: string | null;
  status: string;
  email?: string | null;
  phone?: string | null;
  gym_type?: string | null;
  member_capacity?: number | null;
};

type Member = {
  id: string;
  gym_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  membership_tier: string | null;
  active: boolean;
  joined_at: string;
};

type AttendanceRow = {
  id: string;
  gym_id: string;
  member_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  method: string | null;
};

type EquipmentRow = {
  id: string;
  gym_id: string;
  name: string;
  category: string | null;
  quantity: number;
  status: string;
  notes: string | null;
};

type TabKey = "overview" | "members" | "attendance" | "equipment" | "reports" | "settings";

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "members", label: "Members", icon: Users },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "equipment", label: "Equipment", icon: Dumbbell },
  { key: "reports", label: "Reports", icon: ClipboardList },
  { key: "settings", label: "Settings", icon: Settings },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";
const sameMonth = (value: string) => {
  const d = new Date(value);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export default function OwnerWorkspace() {
  const db = supabase as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [gym, setGym] = useState<Gym | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [memberForm, setMemberForm] = useState({ full_name: "", email: "", phone: "", membership_tier: "Monthly" });
  const [attendanceMemberId, setAttendanceMemberId] = useState("");
  const [equipmentForm, setEquipmentForm] = useState({ name: "", category: "Strength", quantity: 1, notes: "" });

  const activeMembers = useMemo(() => members.filter((m) => m.active !== false), [members]);
  const todayAttendance = useMemo(() => attendance.filter((a) => a.checked_in_at?.slice(0, 10) === todayKey()), [attendance]);
  const openAttendance = useMemo(() => attendance.filter((a) => !a.checked_out_at), [attendance]);
  const monthlyAttendance = useMemo(() => attendance.filter((a) => sameMonth(a.checked_in_at)), [attendance]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setGym(null);
        return;
      }

      const { data: roleRows } = await db
        .from("user_roles")
        .select("gym_id")
        .eq("user_id", user.id)
        .eq("role", "gym_owner")
        .limit(1);

      let gymRow: Gym | null = null;
      const linkedGymId = roleRows?.[0]?.gym_id;
      if (linkedGymId) {
        const { data } = await db
          .from("gyms")
          .select("id,name,city,country,status,email,phone,gym_type,member_capacity")
          .eq("id", linkedGymId)
          .maybeSingle();
        gymRow = data;
      }

      if (!gymRow) {
        const { data } = await db
          .from("gyms")
          .select("id,name,city,country,status,email,phone,gym_type,member_capacity")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        gymRow = data;
      }

      if (!gymRow) {
        setGym(null);
        return;
      }

      setGym(gymRow);
      const [memberRes, attendanceRes, equipmentRes] = await Promise.all([
        db.from("gym_members").select("*").eq("gym_id", gymRow.id).order("joined_at", { ascending: false }),
        db.from("attendance").select("*").eq("gym_id", gymRow.id).order("checked_in_at", { ascending: false }).limit(200),
        db.from("equipment").select("*").eq("gym_id", gymRow.id).order("created_at", { ascending: false }),
      ]);

      setMembers(memberRes.data ?? []);
      setAttendance(attendanceRes.data ?? []);
      setEquipment(equipmentRes.data ?? []);
    } catch (error) {
      toast.error("Could not load gym workspace", { description: error instanceof Error ? error.message : "Please refresh and try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym || !memberForm.full_name.trim()) return;
    setSaving(true);
    const { error } = await db.from("gym_members").insert({
      gym_id: gym.id,
      full_name: memberForm.full_name.trim(),
      email: memberForm.email.trim() || null,
      phone: memberForm.phone.trim() || null,
      membership_tier: memberForm.membership_tier.trim() || "Monthly",
      active: true,
    });
    setSaving(false);
    if (error) return toast.error("Member not added", { description: error.message });
    toast.success("Member added");
    setMemberForm({ full_name: "", email: "", phone: "", membership_tier: "Monthly" });
    load();
  };

  const toggleMember = async (member: Member) => {
    const { error } = await db.from("gym_members").update({ active: !member.active }).eq("id", member.id).eq("gym_id", member.gym_id);
    if (error) return toast.error("Could not update member", { description: error.message });
    toast.success(member.active ? "Member deactivated" : "Member activated");
    load();
  };

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym || !attendanceMemberId) return;
    setSaving(true);
    const { error } = await db.from("attendance").insert({
      gym_id: gym.id,
      member_id: attendanceMemberId,
      method: "manual",
      checked_in_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error("Check-in failed", { description: error.message });
    toast.success("Member checked in");
    setAttendanceMemberId("");
    load();
  };

  const checkOut = async (row: AttendanceRow) => {
    const { error } = await db.from("attendance").update({ checked_out_at: new Date().toISOString() }).eq("id", row.id).eq("gym_id", row.gym_id);
    if (error) return toast.error("Check-out failed", { description: error.message });
    toast.success("Member checked out");
    load();
  };

  const addEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym || !equipmentForm.name.trim()) return;
    setSaving(true);
    const { error } = await db.from("equipment").insert({
      gym_id: gym.id,
      name: equipmentForm.name.trim(),
      category: equipmentForm.category.trim() || null,
      quantity: Number(equipmentForm.quantity || 1),
      status: "active",
      notes: equipmentForm.notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Equipment not added", { description: error.message });
    toast.success("Equipment added");
    setEquipmentForm({ name: "", category: "Strength", quantity: 1, notes: "" });
    load();
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name || "Unknown member";

  return (
    <Layout hideFooter>
      <section className="container-wide py-8 md:py-10">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>
        ) : !gym ? (
          <div className="max-w-xl py-20">
            <h1 className="font-display text-3xl font-bold mb-3">Access not active</h1>
            <p className="text-foreground/70">This account is not linked to an active approved gym. Validate your access code or contact support.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 border-b border-separator pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label mb-2">Gym owner workspace</p>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.04em]">{gym.name}</h1>
                <p className="mt-3 text-sm text-foreground/60">{gym.city || "City not set"} · {gym.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 border border-separator text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>
                <button onClick={logout} className="inline-flex items-center gap-2 px-4 py-2 border border-separator text-xs uppercase tracking-widest hover:bg-hover-bg"><LogOut size={14} /> Sign out</button>
              </div>
            </div>

            <div className="my-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-separator border border-separator">
              <Metric icon={Users} label="Active members" value={activeMembers.length} />
              <Metric icon={CalendarCheck} label="Today check-ins" value={todayAttendance.length} />
              <Metric icon={Activity} label="Open sessions" value={openAttendance.length} />
              <Metric icon={Dumbbell} label="Equipment" value={equipment.length} />
            </div>

            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
              {tabs.map((item) => (
                <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex items-center gap-2 border px-4 py-3 text-xs uppercase tracking-widest whitespace-nowrap ${tab === item.key ? "border-accent bg-accent text-accent-foreground" : "border-separator text-foreground/70 hover:bg-hover-bg"}`}>
                  <item.icon size={14} /> {item.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <Panel title="Today at a glance">
                  <div className="grid md:grid-cols-3 gap-px bg-separator border border-separator">
                    <MiniStat label="Members" value={`${activeMembers.length}/${gym.member_capacity || "∞"}`} />
                    <MiniStat label="Check-ins today" value={String(todayAttendance.length)} />
                    <MiniStat label="Attendance this month" value={String(monthlyAttendance.length)} />
                  </div>
                </Panel>
                <Panel title="Quick actions">
                  <div className="grid gap-3">
                    <button onClick={() => setTab("members")} className="ActionButton"><Plus size={15} /> Add member</button>
                    <button onClick={() => setTab("attendance")} className="ActionButton"><UserCheck size={15} /> Manual check-in</button>
                    <button onClick={() => setTab("equipment")} className="ActionButton"><Dumbbell size={15} /> Add equipment</button>
                  </div>
                </Panel>
              </div>
            )}

            {tab === "members" && (
              <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
                <Panel title="Add member">
                  <form onSubmit={addMember} className="space-y-4">
                    <Input label="Full name" value={memberForm.full_name} onChange={(v) => setMemberForm({ ...memberForm, full_name: v })} required />
                    <Input label="Email" value={memberForm.email} onChange={(v) => setMemberForm({ ...memberForm, email: v })} type="email" />
                    <Input label="Phone" value={memberForm.phone} onChange={(v) => setMemberForm({ ...memberForm, phone: v })} />
                    <Input label="Membership tier" value={memberForm.membership_tier} onChange={(v) => setMemberForm({ ...memberForm, membership_tier: v })} />
                    <button disabled={saving} className="w-full inline-flex justify-center gap-2 bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />} Save member</button>
                  </form>
                </Panel>
                <Panel title="Members">
                  <Rows empty="No members added yet.">
                    {members.map((member) => <MemberRow key={member.id} member={member} onToggle={() => toggleMember(member)} />)}
                  </Rows>
                </Panel>
              </div>
            )}

            {tab === "attendance" && (
              <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
                <Panel title="Manual check-in">
                  <form onSubmit={checkIn} className="space-y-4">
                    <label className="block space-y-2">
                      <span className="text-xs uppercase tracking-widest text-foreground/60">Member</span>
                      <select value={attendanceMemberId} onChange={(e) => setAttendanceMemberId(e.target.value)} className="lv-input" required>
                        <option value="">Select member…</option>
                        {activeMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </label>
                    <button disabled={saving || !attendanceMemberId} className="w-full inline-flex justify-center gap-2 bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />} Check in</button>
                  </form>
                </Panel>
                <Panel title="Recent attendance">
                  <Rows empty="No attendance logs yet.">
                    {attendance.map((row) => <AttendanceItem key={row.id} row={row} name={memberName(row.member_id)} onCheckout={() => checkOut(row)} />)}
                  </Rows>
                </Panel>
              </div>
            )}

            {tab === "equipment" && (
              <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
                <Panel title="Add equipment">
                  <form onSubmit={addEquipment} className="space-y-4">
                    <Input label="Name" value={equipmentForm.name} onChange={(v) => setEquipmentForm({ ...equipmentForm, name: v })} required />
                    <Input label="Category" value={equipmentForm.category} onChange={(v) => setEquipmentForm({ ...equipmentForm, category: v })} />
                    <Input label="Quantity" type="number" value={String(equipmentForm.quantity)} onChange={(v) => setEquipmentForm({ ...equipmentForm, quantity: Number(v) })} />
                    <Input label="Notes" value={equipmentForm.notes} onChange={(v) => setEquipmentForm({ ...equipmentForm, notes: v })} />
                    <button disabled={saving} className="w-full inline-flex justify-center gap-2 bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />} Save equipment</button>
                  </form>
                </Panel>
                <Panel title="Equipment inventory">
                  <Rows empty="No equipment added yet.">
                    {equipment.map((item) => <EquipmentItem key={item.id} item={item} />)}
                  </Rows>
                </Panel>
              </div>
            )}

            {tab === "reports" && (
              <Panel title="Reports">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-separator border border-separator mb-8">
                  <MiniStat label="Total members" value={String(members.length)} />
                  <MiniStat label="Inactive members" value={String(members.filter((m) => m.active === false).length)} />
                  <MiniStat label="Monthly check-ins" value={String(monthlyAttendance.length)} />
                  <MiniStat label="Equipment units" value={String(equipment.reduce((sum, item) => sum + Number(item.quantity || 0), 0))} />
                </div>
                <p className="text-sm text-foreground/65 leading-relaxed">Use these live numbers for daily operations. Payment revenue, payout reports, and automated exports should be connected after the payments table and payment gateway are finalized.</p>
              </Panel>
            )}

            {tab === "settings" && (
              <Panel title="Gym settings">
                <div className="grid md:grid-cols-2 gap-px bg-separator border border-separator">
                  <MiniStat label="Gym" value={gym.name} />
                  <MiniStat label="Type" value={gym.gym_type || "Not set"} />
                  <MiniStat label="Email" value={gym.email || "Not set"} />
                  <MiniStat label="Phone" value={gym.phone || "Not set"} />
                </div>
              </Panel>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return <div className="bg-background p-5 md:p-6"><Icon className="text-accent mb-5" size={20} /><p className="text-label mb-2">{label}</p><p className="font-display text-4xl md:text-5xl font-bold tracking-[-0.04em]">{value}</p></div>;
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="bg-background p-5"><p className="text-label mb-2">{label}</p><p className="font-display text-2xl font-bold break-words">{value}</p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-separator bg-hover-bg/20 p-5 md:p-6"><p className="text-label mb-5">{title}</p>{children}</section>;
}
function Rows({ children, empty }: { children: React.ReactNode; empty: string }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;
  return <div className="border border-separator divide-y divide-separator">{count ? children : <div className="p-6 text-sm text-muted-foreground">{empty}</div>}</div>;
}
function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-foreground/60">{label}</span><input className="lv-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}
function MemberRow({ member, onToggle }: { member: Member; onToggle: () => void }) {
  return <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{member.full_name}</p><p className="text-xs text-muted-foreground">{member.email || "No email"} · {member.phone || "No phone"} · {member.membership_tier || "No plan"}</p></div><button onClick={onToggle} className={`inline-flex items-center gap-2 px-3 py-2 border text-xs uppercase tracking-widest ${member.active ? "border-accent/40 text-accent" : "border-destructive/40 text-destructive"}`}>{member.active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{member.active ? "Active" : "Inactive"}</button></div>;
}
function AttendanceItem({ row, name, onCheckout }: { row: AttendanceRow; name: string; onCheckout: () => void }) {
  return <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{name}</p><p className="text-xs text-muted-foreground">In: {formatDate(row.checked_in_at)} · Out: {formatDate(row.checked_out_at)}</p></div>{!row.checked_out_at && <button onClick={onCheckout} className="inline-flex items-center justify-center gap-2 bg-accent px-3 py-2 text-xs uppercase tracking-widest text-accent-foreground">Check out</button>}</div>;
}
function EquipmentItem({ item }: { item: EquipmentRow }) {
  return <div className="p-4"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.category || "Uncategorized"} · Qty {item.quantity} · {item.status}</p>{item.notes && <p className="mt-2 text-sm text-foreground/60">{item.notes}</p>}</div>;
}
