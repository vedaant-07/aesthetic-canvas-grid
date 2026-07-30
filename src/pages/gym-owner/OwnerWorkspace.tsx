import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  IndianRupee,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  PlatformApiError,
  platformApi,
  type PlatformAnnouncement,
  type PlatformAttendance,
  type PlatformEquipment,
  type PlatformLead,
  type PlatformMember,
  type PlatformWorkspace,
} from "@/lib/platformApi";

type TabKey = "overview" | "members" | "attendance" | "equipment" | "leads" | "payments" | "announcements" | "reports" | "settings";

type MemberForm = { name: string; email: string; phone: string; notes: string };
type EquipmentForm = { name: string; category: string; quantity: number };
type LeadForm = { name: string; phone: string; email: string; source: string; message: string };
type PaymentForm = { member_id: string; amount: string; method: string; notes: string };
type AnnouncementForm = { title: string; body: string; audience: string };
type ProfileForm = { name: string; phone: string; email: string; address: string; city: string; state: string; pincode: string; description: string };

const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "members", label: "Members", icon: Users },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "equipment", label: "Equipment", icon: Dumbbell },
  { key: "leads", label: "Leads", icon: UserCheck },
  { key: "payments", label: "Gym Payments", icon: CreditCard },
  { key: "announcements", label: "Announcements", icon: Bell },
  { key: "reports", label: "Commission & Reports", icon: ClipboardList },
  { key: "settings", label: "Settings", icon: Settings },
];

const emptyMember: MemberForm = { name: "", email: "", phone: "", notes: "" };
const emptyEquipment: EquipmentForm = { name: "", category: "Strength", quantity: 1 };
const emptyLead: LeadForm = { name: "", phone: "", email: "", source: "Walk-in", message: "" };
const emptyPayment: PaymentForm = { member_id: "", amount: "", method: "cash", notes: "" };
const emptyAnnouncement: AnnouncementForm = { title: "", body: "", audience: "all_members" };

const todayKey = () => new Date().toLocaleDateString("en-CA");
const itemId = (item: { id?: string; membership_id?: string; log_id?: string; equipment_id?: string; lead_id?: string }) => item.id || item.membership_id || item.log_id || item.equipment_id || item.lead_id || "";
const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const formatMoney = (value: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));

function messageFromError(error: unknown) {
  if (error instanceof PlatformApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The action could not be completed.";
}

export default function OwnerWorkspace() {
  const [workspace, setWorkspace] = useState<PlatformWorkspace | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMember);
  const [equipmentForm, setEquipmentForm] = useState<EquipmentForm>(emptyEquipment);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLead);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementForm>(emptyAnnouncement);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", description: "" });

  const load = async ({ background = false }: { background?: boolean } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await platformApi.getWorkspace();
      setWorkspace(data);
      setProfileForm({
        name: data.gym.name || "",
        phone: data.gym.phone || "",
        email: data.gym.email || data.gym.contact_email || "",
        address: data.gym.address || "",
        city: data.gym.city || "",
        state: data.gym.state || "",
        pincode: data.gym.pincode || "",
        description: data.gym.description || "",
      });
    } catch (requestError) {
      const message = messageFromError(requestError);
      if (requestError instanceof PlatformApiError && requestError.sessionExpired) {
        await supabase.auth.signOut();
        window.location.replace("/gym-management/login");
        return;
      }
      setError(message);
      toast.error("Could not load gym workspace", { description: message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const members = workspace?.members ?? [];
  const activeMembers = useMemo(() => members.filter((member) => ["active", "approved"].includes(member.status)), [members]);
  const openAttendance = useMemo(() => (workspace?.attendance ?? []).filter((row) => row.status === "checked_in" && !row.check_out_at), [workspace]);
  const todayAttendance = useMemo(() => (workspace?.attendance ?? []).filter((row) => row.date === todayKey() || String(row.check_in_at ?? "").startsWith(todayKey())), [workspace]);
  const monthlyGymRevenue = useMemo(() => {
    const now = new Date();
    return (workspace?.payments ?? []).filter((payment) => {
      const date = new Date(payment.paid_at);
      return payment.status === "paid" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [workspace]);

  const memberMap = useMemo(() => new Map(members.map((member) => [`${member.member_type}:${member.id}`, member])), [members]);
  const memberForAttendance = (row: PlatformAttendance) => {
    if (row.membership_id) return memberMap.get(`app:${row.membership_id}`);
    if (row.manual_member_id) return memberMap.get(`manual:${row.manual_member_id}`);
    return members.find((member) => member.user_id && member.user_id === row.user_id);
  };

  const mutate = async (operation: () => Promise<unknown>, success: string, after?: () => void) => {
    setSaving(true);
    setError(null);
    try {
      await operation();
      toast.success(success);
      after?.();
      await load({ background: true });
    } catch (requestError) {
      const message = messageFromError(requestError);
      setError(message);
      toast.error("Action failed", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const addMember = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addManualMember(memberForm), "Member added", () => setMemberForm(emptyMember));
  };

  const updateMemberStatus = (member: PlatformMember, status: string) => {
    void mutate(() => platformApi.updateMember(member.member_type, member.id, { status }), "Member status updated");
  };

  const checkIn = (member: PlatformMember) => {
    void mutate(() => platformApi.checkIn({ member_type: member.member_type, member_id: member.id, method: "manual", date: todayKey() }), `${member.full_name} checked in`);
  };

  const checkOut = (row: PlatformAttendance) => {
    void mutate(() => platformApi.checkOut(row.log_id), "Member checked out");
  };

  const addEquipment = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addEquipment({ ...equipmentForm, available: true }), "Equipment added", () => setEquipmentForm(emptyEquipment));
  };

  const toggleEquipment = (item: PlatformEquipment) => {
    void mutate(() => platformApi.updateEquipment(item.equipment_id || item.id || "", { available: !item.available }), item.available ? "Equipment marked unavailable" : "Equipment marked available");
  };

  const deleteEquipment = (item: PlatformEquipment) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    void mutate(() => platformApi.deleteEquipment(item.equipment_id || item.id || ""), "Equipment deleted");
  };

  const addLead = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addLead(leadForm), "Lead added", () => setLeadForm(emptyLead));
  };

  const setLeadStatus = (lead: PlatformLead, status: string) => {
    void mutate(() => platformApi.updateLead(lead.lead_id || lead.id || "", { status }), "Lead updated");
  };

  const addPayment = (event: React.FormEvent) => {
    event.preventDefault();
    const member = members.find((item) => item.id === paymentForm.member_id);
    void mutate(() => platformApi.addPayment({
      member_id: paymentForm.member_id || null,
      member_type: member?.member_type,
      amount: Number(paymentForm.amount),
      currency: "INR",
      status: "paid",
      method: paymentForm.method,
      notes: paymentForm.notes,
    }), "Payment recorded", () => setPaymentForm(emptyPayment));
  };

  const addAnnouncement = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addAnnouncement({ ...announcementForm, is_published: true }), "Announcement published", () => setAnnouncementForm(emptyAnnouncement));
  };

  const toggleAnnouncement = (announcement: PlatformAnnouncement) => {
    void mutate(() => platformApi.updateAnnouncement(announcement.id, { is_published: !announcement.is_published }), announcement.is_published ? "Announcement hidden" : "Announcement published");
  };

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.updateProfile(profileForm), "Gym profile updated");
  };

  if (loading) {
    return <Layout hideFooter><div className="container-wide flex min-h-[65vh] items-center justify-center"><Loader2 className="animate-spin text-accent" size={28} /></div></Layout>;
  }

  if (!workspace) {
    return (
      <Layout>
        <section className="container-wide max-w-2xl py-24">
          <StatusPanel title="Gym workspace unavailable" message={error || "This account is not connected to an approved gym."} onRetry={() => void load()} />
        </section>
      </Layout>
    );
  }

  const gym = workspace.gym;
  const commissions = workspace.commission_summary;

  return (
    <Layout hideFooter>
      <section className="container-wide py-8 md:py-10">
        <header className="flex flex-col gap-6 border-b border-separator pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-label"><ShieldCheck size={14} /> Shared app + website workspace</div>
            <h1 className="font-display text-4xl font-bold tracking-[-0.04em] md:text-6xl">{gym.name}</h1>
            <p className="mt-3 text-sm text-foreground/60">{[gym.city, gym.state, gym.country].filter(Boolean).join(" · ") || "Location not configured"} · {gym.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load({ background: true })} disabled={refreshing} className="inline-flex items-center gap-2 border border-separator px-4 py-2 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</button>
            <button onClick={logout} className="inline-flex items-center gap-2 border border-separator px-4 py-2 text-xs uppercase tracking-widest hover:bg-hover-bg"><LogOut size={14} /> Sign out</button>
          </div>
        </header>

        {error && <div className="mt-6"><StatusPanel title="Action needs attention" message={error} onRetry={() => void load({ background: true })} /></div>}

        <div className="my-8 grid grid-cols-2 gap-px border border-separator bg-separator lg:grid-cols-5">
          <Metric icon={Users} label="Active members" value={String(activeMembers.length)} />
          <Metric icon={CalendarCheck} label="Today check-ins" value={String(todayAttendance.length)} />
          <Metric icon={IndianRupee} label="Gym revenue" value={formatMoney(monthlyGymRevenue)} />
          <Metric icon={BadgeIndianRupee} label="Pending commission" value={formatMoney(commissions.pending, commissions.currency)} />
          <Metric icon={Dumbbell} label="Equipment" value={String(workspace.equipment.length)} />
        </div>

        <nav className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex items-center gap-2 whitespace-nowrap border px-4 py-3 text-xs uppercase tracking-widest ${tab === item.key ? "border-accent bg-accent text-accent-foreground" : "border-separator text-foreground/70 hover:bg-hover-bg"}`}><item.icon size={14} /> {item.label}</button>)}
        </nav>

        {tab === "overview" && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-8">
              <Panel title="Live operations" description="Canonical records used by both the native app and website.">
                <div className="grid gap-px border border-separator bg-separator md:grid-cols-4">
                  <MiniStat label="Total members" value={String(members.length)} />
                  <MiniStat label="Inside now" value={String(openAttendance.length)} />
                  <MiniStat label="Open leads" value={String(workspace.leads.filter((lead) => !["converted", "lost", "closed"].includes(lead.status)).length)} />
                  <MiniStat label="App commission" value={formatMoney(commissions.total, commissions.currency)} />
                </div>
              </Panel>

              <Panel title="Recent attendance" description="Latest verified gym visits.">
                <div className="space-y-2">
                  {workspace.attendance.slice(0, 8).map((row) => {
                    const member = memberForAttendance(row);
                    return <div key={row.log_id} className="flex items-center gap-3 border border-separator p-3"><CalendarCheck size={16} className="text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member?.full_name || "Gym member"}</p><p className="text-xs text-muted-foreground">{formatDate(row.check_in_at)} · {row.status}</p></div>{row.duration_minutes != null && <span className="font-mono text-xs text-muted-foreground">{row.duration_minutes} min</span>}</div>;
                  })}
                  {!workspace.attendance.length && <EmptyState icon={CalendarCheck} title="No attendance yet" body="Check in an active member from the Attendance tab." />}
                </div>
              </Panel>
            </div>

            <div className="space-y-8">
              <Panel title="Quick actions">
                <div className="grid gap-3">
                  <QuickAction icon={Users} label="Add member" onClick={() => setTab("members")} />
                  <QuickAction icon={UserCheck} label="Record check-in" onClick={() => setTab("attendance")} />
                  <QuickAction icon={CreditCard} label="Record gym payment" onClick={() => setTab("payments")} />
                  <QuickAction icon={Megaphone} label="Publish announcement" onClick={() => setTab("announcements")} />
                </div>
              </Panel>

              <Panel title="Gym referral" description="Members using this code are attributed to your gym for the 20% commission model.">
                <div className="border border-accent/30 bg-accent/5 p-5">
                  <p className="font-mono text-2xl font-bold tracking-[0.12em] text-accent">{gym.referral_code || "Not generated"}</p>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {tab === "members" && (
          <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="Add manual member" description="App users join through the referral code; use this form for offline gym members.">
              <form onSubmit={addMember} className="space-y-4">
                <Field label="Full name"><input className="lv-input" value={memberForm.name} onChange={(event) => setMemberForm((form) => ({ ...form, name: event.target.value }))} required maxLength={120} /></Field>
                <Field label="Email"><input className="lv-input" type="email" value={memberForm.email} onChange={(event) => setMemberForm((form) => ({ ...form, email: event.target.value }))} /></Field>
                <Field label="Phone"><input className="lv-input" value={memberForm.phone} onChange={(event) => setMemberForm((form) => ({ ...form, phone: event.target.value }))} /></Field>
                <Field label="Notes"><textarea className="lv-input min-h-24" value={memberForm.notes} onChange={(event) => setMemberForm((form) => ({ ...form, notes: event.target.value }))} maxLength={500} /></Field>
                <SubmitButton saving={saving} label="Add member" />
              </form>
            </Panel>

            <Panel title="All members" description={`${workspace.app_members.length} app-linked · ${workspace.manual_members.length} manual`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Member</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-separator">
                    {members.map((member) => {
                      const active = ["active", "approved"].includes(member.status);
                      return <tr key={`${member.member_type}-${member.id}`}><td className="p-3"><p className="font-medium">{member.full_name}</p><p className="text-xs text-muted-foreground">{member.email || member.phone || "No contact"}</p></td><td className="p-3"><Badge text={member.member_type === "app" ? "App member" : "Manual"} tone={member.member_type === "app" ? "green" : "neutral"} /></td><td className="p-3"><Badge text={member.status} tone={active ? "green" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(member.joined_at || member.created_at)}</td><td className="p-3"><div className="flex justify-end gap-2"><button disabled={saving || !active} onClick={() => checkIn(member)} className="border border-separator px-3 py-2 text-[10px] uppercase tracking-widest disabled:opacity-40">Check in</button><button disabled={saving} onClick={() => updateMemberStatus(member, active ? "inactive" : "active")} className="border border-separator px-3 py-2 text-[10px] uppercase tracking-widest">{active ? "Deactivate" : "Activate"}</button></div></td></tr>;
                    })}
                  </tbody>
                </table>
                {!members.length && <EmptyState icon={Users} title="No members" body="Add a manual member or share the referral code with app users." />}
              </div>
            </Panel>
          </div>
        )}

        {tab === "attendance" && (
          <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel title="Currently inside" description={`${openAttendance.length} open sessions`}>
              <div className="space-y-3">
                {openAttendance.map((row) => {
                  const member = memberForAttendance(row);
                  return <div key={row.log_id} className="flex items-center gap-3 border border-accent/30 bg-accent/5 p-4"><CheckCircle2 size={18} className="text-accent" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{member?.full_name || "Gym member"}</p><p className="text-xs text-muted-foreground">In since {formatDate(row.check_in_at)}</p></div><button disabled={saving} onClick={() => checkOut(row)} className="border border-separator px-3 py-2 text-[10px] uppercase tracking-widest">Check out</button></div>;
                })}
                {!openAttendance.length && <EmptyState icon={UserCheck} title="No active check-ins" body="Use the member table to check someone in." />}
              </div>
            </Panel>

            <Panel title="Attendance history" description={`${todayAttendance.length} visits today`}>
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Member</th><th className="p-3">Check in</th><th className="p-3">Check out</th><th className="p-3">Duration</th><th className="p-3">Method</th></tr></thead><tbody className="divide-y divide-separator">{workspace.attendance.slice(0, 300).map((row) => { const member = memberForAttendance(row); return <tr key={row.log_id}><td className="p-3 font-medium">{member?.full_name || "Gym member"}</td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.check_in_at)}</td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.check_out_at)}</td><td className="p-3 font-mono text-xs">{row.duration_minutes == null ? "—" : `${row.duration_minutes} min`}</td><td className="p-3 text-xs text-muted-foreground">{row.method || "app"}</td></tr>; })}</tbody></table></div>
            </Panel>
          </div>
        )}

        {tab === "equipment" && (
          <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="Add equipment"><form onSubmit={addEquipment} className="space-y-4"><Field label="Name"><input className="lv-input" value={equipmentForm.name} onChange={(event) => setEquipmentForm((form) => ({ ...form, name: event.target.value }))} required /></Field><Field label="Category"><input className="lv-input" value={equipmentForm.category} onChange={(event) => setEquipmentForm((form) => ({ ...form, category: event.target.value }))} /></Field><Field label="Quantity"><input className="lv-input" type="number" min={1} max={100000} value={equipmentForm.quantity} onChange={(event) => setEquipmentForm((form) => ({ ...form, quantity: Number(event.target.value) }))} required /></Field><SubmitButton saving={saving} label="Save equipment" /></form></Panel>
            <Panel title="Equipment inventory" description="Shared with the mobile owner dashboard."><div className="grid gap-3 md:grid-cols-2">{workspace.equipment.map((item) => <div key={item.equipment_id || item.id} className="flex items-center gap-3 border border-separator p-4"><Dumbbell size={18} className={item.available ? "text-accent" : "text-muted-foreground"} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.category || "General"} · Qty {item.quantity}</p></div><button onClick={() => toggleEquipment(item)} className="p-2">{item.available ? <ToggleRight className="text-accent" /> : <ToggleLeft />}</button><button onClick={() => deleteEquipment(item)} className="p-2 text-destructive"><Trash2 size={17} /></button></div>)}{!workspace.equipment.length && <EmptyState icon={Dumbbell} title="No equipment" body="Add your first equipment item." />}</div></Panel>
          </div>
        )}

        {tab === "leads" && (
          <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="Add lead"><form onSubmit={addLead} className="space-y-4"><Field label="Name"><input className="lv-input" value={leadForm.name} onChange={(event) => setLeadForm((form) => ({ ...form, name: event.target.value }))} required /></Field><Field label="Phone"><input className="lv-input" value={leadForm.phone} onChange={(event) => setLeadForm((form) => ({ ...form, phone: event.target.value }))} /></Field><Field label="Email"><input className="lv-input" type="email" value={leadForm.email} onChange={(event) => setLeadForm((form) => ({ ...form, email: event.target.value }))} /></Field><Field label="Source"><input className="lv-input" value={leadForm.source} onChange={(event) => setLeadForm((form) => ({ ...form, source: event.target.value }))} /></Field><Field label="Message"><textarea className="lv-input min-h-24" value={leadForm.message} onChange={(event) => setLeadForm((form) => ({ ...form, message: event.target.value }))} /></Field><SubmitButton saving={saving} label="Save lead" /></form></Panel>
            <Panel title="Lead pipeline"><div className="space-y-3">{workspace.leads.map((lead) => <div key={lead.lead_id || lead.id} className="border border-separator p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{lead.name || lead.full_name}</p><p className="text-xs text-muted-foreground">{lead.phone || lead.email || lead.source || "No contact"}</p></div><Badge text={lead.status} tone={lead.status === "converted" ? "green" : "neutral"} /></div><div className="mt-4 flex flex-wrap gap-2"><LeadButton label="Contacted" onClick={() => setLeadStatus(lead, "contacted")} /><LeadButton label="Qualified" onClick={() => setLeadStatus(lead, "qualified")} /><LeadButton label="Converted" onClick={() => setLeadStatus(lead, "converted")} primary /><LeadButton label="Lost" onClick={() => setLeadStatus(lead, "lost")} /></div></div>)}{!workspace.leads.length && <EmptyState icon={ClipboardList} title="No leads" body="Website enquiries and manually added leads appear here." />}</div></Panel>
          </div>
        )}

        {tab === "payments" && (
          <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="Record gym payment" description="This records gym membership dues, not SE7EN FIT app subscriptions."><form onSubmit={addPayment} className="space-y-4"><Field label="Member (optional)"><select className="lv-input" value={paymentForm.member_id} onChange={(event) => setPaymentForm((form) => ({ ...form, member_id: event.target.value }))}><option value="">Walk-in / unassigned</option>{members.map((member) => <option key={`${member.member_type}-${member.id}`} value={member.id}>{member.full_name}</option>)}</select></Field><Field label="Amount"><input className="lv-input" type="number" min={1} step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((form) => ({ ...form, amount: event.target.value }))} required /></Field><Field label="Method"><select className="lv-input" value={paymentForm.method} onChange={(event) => setPaymentForm((form) => ({ ...form, method: event.target.value }))}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="other">Other</option></select></Field><Field label="Notes"><textarea className="lv-input min-h-20" value={paymentForm.notes} onChange={(event) => setPaymentForm((form) => ({ ...form, notes: event.target.value }))} /></Field><SubmitButton saving={saving} label="Record payment" /></form></Panel>
            <Panel title="Gym payment history" description={`${formatMoney(monthlyGymRevenue)} recorded this month`}><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Notes</th></tr></thead><tbody className="divide-y divide-separator">{workspace.payments.map((payment) => <tr key={payment.id}><td className="p-3 font-mono font-medium">{formatMoney(payment.amount, payment.currency)}</td><td className="p-3 text-xs">{payment.method || "manual"}</td><td className="p-3"><Badge text={payment.status} tone={payment.status === "paid" ? "green" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(payment.paid_at)}</td><td className="p-3 text-xs text-muted-foreground">{payment.notes || "—"}</td></tr>)}</tbody></table>{!workspace.payments.length && <EmptyState icon={CreditCard} title="No gym payments" body="Record the first gym membership payment." />}</div></Panel>
          </div>
        )}

        {tab === "announcements" && (
          <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel title="Publish announcement"><form onSubmit={addAnnouncement} className="space-y-4"><Field label="Title"><input className="lv-input" value={announcementForm.title} onChange={(event) => setAnnouncementForm((form) => ({ ...form, title: event.target.value }))} required /></Field><Field label="Message"><textarea className="lv-input min-h-40" value={announcementForm.body} onChange={(event) => setAnnouncementForm((form) => ({ ...form, body: event.target.value }))} required maxLength={4000} /></Field><Field label="Audience"><select className="lv-input" value={announcementForm.audience} onChange={(event) => setAnnouncementForm((form) => ({ ...form, audience: event.target.value }))}><option value="all_members">All members</option><option value="active_members">Active members</option><option value="staff">Staff</option></select></Field><SubmitButton saving={saving} label="Publish announcement" /></form></Panel>
            <Panel title="Published updates"><div className="space-y-3">{workspace.announcements.map((announcement) => <div key={announcement.id} className="flex items-start gap-4 border border-separator p-4"><Megaphone size={18} className={announcement.is_published ? "mt-1 text-accent" : "mt-1 text-muted-foreground"} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{announcement.title}</p><Badge text={announcement.is_published ? "Published" : "Hidden"} tone={announcement.is_published ? "green" : "neutral"} /></div><p className="mt-2 text-sm leading-relaxed text-foreground/70">{announcement.body}</p><p className="mt-2 text-xs text-muted-foreground">{announcement.audience} · {formatDate(announcement.created_at)}</p></div><button onClick={() => toggleAnnouncement(announcement)} className="p-2">{announcement.is_published ? <ToggleRight className="text-accent" /> : <ToggleLeft />}</button></div>)}{!workspace.announcements.length && <EmptyState icon={Bell} title="No announcements" body="Publish the first update for gym members." />}</div></Panel>
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-8">
            <div className="grid gap-px border border-separator bg-separator sm:grid-cols-2 xl:grid-cols-5">
              <Metric icon={Wallet} label="Total commission" value={formatMoney(commissions.total, commissions.currency)} />
              <Metric icon={Activity} label="Pending" value={formatMoney(commissions.pending, commissions.currency)} />
              <Metric icon={CheckCircle2} label="Approved" value={formatMoney(commissions.approved, commissions.currency)} />
              <Metric icon={BadgeIndianRupee} label="Paid" value={formatMoney(commissions.paid, commissions.currency)} />
              <Metric icon={XCircle} label="Reversed" value={formatMoney(commissions.reversed, commissions.currency)} />
            </div>
            <Panel title="SE7EN FIT partner commission ledger" description="Commission is 20% of successful attributed app subscription payments. Refunds and chargebacks are reversed before payout."><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Gross subscription</th><th className="p-3">Rate</th><th className="p-3">Commission</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-separator">{workspace.commissions.map((row) => <tr key={row.commission_id}><td className="p-3 font-mono">{formatMoney(row.gross_amount, row.currency)}</td><td className="p-3 font-mono">{Math.round(Number(row.commission_rate) * 100)}%</td><td className="p-3 font-mono font-bold text-accent">{formatMoney(row.commission_amount, row.currency)}</td><td className="p-3"><Badge text={row.status} tone={row.status === "paid" ? "green" : row.status === "reversed" ? "red" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.created_at)}</td></tr>)}</tbody></table>{!workspace.commissions.length && <EmptyState icon={Wallet} title="No commission yet" body="Rows appear after referred members complete successful app subscription payments." />}</div></Panel>
          </div>
        )}

        {tab === "settings" && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="Gym profile" description="The same profile is displayed across the website and mobile app."><form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2"><Field label="Gym name"><input className="lv-input" value={profileForm.name} onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))} required /></Field><Field label="Phone"><input className="lv-input" value={profileForm.phone} onChange={(event) => setProfileForm((form) => ({ ...form, phone: event.target.value }))} /></Field><Field label="Email"><input className="lv-input" type="email" value={profileForm.email} onChange={(event) => setProfileForm((form) => ({ ...form, email: event.target.value }))} /></Field><Field label="Address"><input className="lv-input" value={profileForm.address} onChange={(event) => setProfileForm((form) => ({ ...form, address: event.target.value }))} /></Field><Field label="City"><input className="lv-input" value={profileForm.city} onChange={(event) => setProfileForm((form) => ({ ...form, city: event.target.value }))} /></Field><Field label="State"><input className="lv-input" value={profileForm.state} onChange={(event) => setProfileForm((form) => ({ ...form, state: event.target.value }))} /></Field><Field label="Pincode"><input className="lv-input" value={profileForm.pincode} onChange={(event) => setProfileForm((form) => ({ ...form, pincode: event.target.value }))} /></Field><div className="md:col-span-2"><Field label="Description"><textarea className="lv-input min-h-32" value={profileForm.description} onChange={(event) => setProfileForm((form) => ({ ...form, description: event.target.value }))} maxLength={2000} /></Field></div><div className="md:col-span-2"><SubmitButton saving={saving} label="Save shared profile" /></div></form></Panel>
            <Panel title="Connection status"><div className="space-y-3"><ConnectionRow label="Supabase database" value="Connected" /><ConnectionRow label="Native app backend" value="Connected" /><ConnectionRow label="Website workspace" value="Canonical API" /><ConnectionRow label="Gym ID" value={gym.gym_id} mono /><ConnectionRow label="Access" value={workspace.access} /></div></Panel>
          </div>
        )}
      </section>
    </Layout>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="border border-separator bg-hover-bg/20 p-5 md:p-6"><div className="mb-5"><h2 className="font-display text-xl font-bold tracking-[-0.02em]">{title}</h2>{description && <p className="mt-1 text-sm leading-relaxed text-foreground/60">{description}</p>}</div>{children}</section>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="bg-background p-4"><Icon size={17} className="text-accent" /><p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="bg-background p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-display text-xl font-bold">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-foreground/70">{label}</span>{children}</label>;
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return <button disabled={saving} type="submit" className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{label}</button>;
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-3 border border-separator px-4 py-3 text-left text-xs uppercase tracking-widest hover:bg-hover-bg"><Icon size={16} className="text-accent" />{label}</button>;
}

function Badge({ text, tone }: { text: string; tone: "green" | "neutral" | "red" }) {
  const classes = tone === "green" ? "border-accent/30 bg-accent/10 text-accent" : tone === "red" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-separator text-muted-foreground";
  return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-widest ${classes}`}>{text}</span>;
}

function LeadButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return <button onClick={onClick} className={`border px-3 py-2 text-[9px] uppercase tracking-widest ${primary ? "border-accent bg-accent text-accent-foreground" : "border-separator"}`}>{label}</button>;
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="border border-dashed border-separator p-8 text-center"><Icon size={24} className="mx-auto text-muted-foreground" /><p className="mt-3 font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>;
}

function StatusPanel({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return <div className="border border-destructive/30 bg-destructive/5 p-6"><h2 className="font-display text-xl font-bold">{title}</h2><p className="mt-2 text-sm text-foreground/70">{message}</p><button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 border border-separator px-4 py-2 text-xs uppercase tracking-widest"><RefreshCw size={14} /> Retry</button></div>;
}

function ConnectionRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-separator pb-3"><span className="text-xs text-muted-foreground">{label}</span><span className={`max-w-[60%] break-all text-right text-xs font-medium text-accent ${mono ? "font-mono" : ""}`}>{value}</span></div>;
}
