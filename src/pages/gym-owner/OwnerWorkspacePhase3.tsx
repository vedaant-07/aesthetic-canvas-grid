import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  Dumbbell,
  IndianRupee,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  PlatformApiError,
  platformApi,
  type PageResult,
  type PlatformAnnouncement,
  type PlatformAttendance,
  type PlatformCommission,
  type PlatformEquipment,
  type PlatformLead,
  type PlatformMember,
  type PlatformPayment,
  type PlatformPlan,
  type PlatformStaff,
  type PlatformStaffInvitation,
  type PlatformWorkspace,
} from "@/lib/platformApi";

type TabKey = "overview" | "members" | "attendance" | "equipment" | "leads" | "payments" | "announcements" | "plans" | "team" | "reports" | "settings";
type Tab = { key: TabKey; label: string; icon: LucideIcon; permission?: string; any?: string[]; ownerOnly?: boolean };

const tabs: Tab[] = [
  { key: "overview", label: "Overview", icon: BarChart3, permission: "dashboard:read" },
  { key: "members", label: "Members", icon: Users, permission: "members:read" },
  { key: "attendance", label: "Attendance", icon: CalendarCheck, permission: "attendance:read" },
  { key: "equipment", label: "Equipment", icon: Dumbbell, permission: "equipment:read" },
  { key: "leads", label: "Leads", icon: UserCheck, permission: "leads:read" },
  { key: "payments", label: "Gym Payments", icon: CreditCard, permission: "payments:read" },
  { key: "announcements", label: "Announcements", icon: Bell, permission: "announcements:read" },
  { key: "plans", label: "Plans", icon: ClipboardList, permission: "plans:read" },
  { key: "team", label: "Team Access", icon: ShieldCheck, ownerOnly: true },
  { key: "reports", label: "Commission & Reports", icon: Wallet, permission: "reports:read" },
  { key: "settings", label: "Settings", icon: Settings, permission: "settings:write" },
];

const emptyMember = { name: "", email: "", phone: "", notes: "" };
const emptyEquipment = { name: "", category: "Strength", quantity: 1 };
const emptyLead = { name: "", phone: "", email: "", source: "Walk-in", message: "" };
const emptyPayment = { member_id: "", amount: "", method: "cash", notes: "", payment_reference: "" };
const emptyAnnouncement = { title: "", body: "", audience: "all_members" };
const emptyPlan = { name: "", price: "", billing_cycle: "monthly", duration_days: "30", features: "" };
const emptyInvite = { name: "", email: "", phone: "", role: "trainer", expires_in_days: 7 };

const todayKey = () => new Date().toLocaleDateString("en-CA");
const itemId = (item: { id?: string; membership_id?: string; log_id?: string; equipment_id?: string; lead_id?: string; plan_id?: string }) => item.id || item.membership_id || item.log_id || item.equipment_id || item.lead_id || item.plan_id || "";
const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};
const formatMoney = (value: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));

function messageFromError(error: unknown) {
  if (error instanceof PlatformApiError || error instanceof Error) return error.message;
  return "The action could not be completed.";
}

function allowed(workspace: PlatformWorkspace | null, permission: string) {
  return Boolean(workspace && (["owner", "admin"].includes(workspace.access) || workspace.permissions?.includes(permission)));
}

function visible(workspace: PlatformWorkspace, tab: Tab) {
  if (tab.ownerOnly) return ["owner", "admin"].includes(workspace.access);
  if (tab.permission) return allowed(workspace, tab.permission);
  return tab.any?.some((permission) => allowed(workspace, permission)) ?? false;
}

export default function OwnerWorkspacePhase3() {
  const [workspace, setWorkspace] = useState<PlatformWorkspace | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [equipmentForm, setEquipmentForm] = useState(emptyEquipment);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncement);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", description: "" });
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberDirectory, setMemberDirectory] = useState<{ app: PageResult<PlatformMember>; manual: PageResult<PlatformMember>; items: PlatformMember[]; totalPages: number; total: number } | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  const load = async ({ background = false }: { background?: boolean } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [data, commissionData] = await Promise.all([
        platformApi.getWorkspace(),
        platformApi.getCommissions().catch(() => null),
      ]);
      const merged: PlatformWorkspace = {
        ...data,
        commissions: commissionData?.items || data.commissions || [],
        commission_summary: commissionData?.summary || data.commission_summary,
      };
      setWorkspace(merged);
      setProfileForm({
        name: merged.gym.name || "",
        phone: merged.gym.phone || "",
        email: merged.gym.email || merged.gym.contact_email || "",
        address: merged.gym.address || "",
        city: merged.gym.city || "",
        state: merged.gym.state || "",
        pincode: merged.gym.pincode || "",
        description: merged.gym.description || "",
      });
      const currentTab = tabs.find((item) => item.key === tab);
      if (!currentTab || !visible(merged, currentTab)) setTab(tabs.find((item) => visible(merged, item))?.key || "overview");
    } catch (requestError) {
      const message = messageFromError(requestError);
      if (requestError instanceof PlatformApiError && requestError.sessionExpired) {
        await supabase.auth.signOut({ scope: "local" });
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

  const loadMembers = async (page = memberPage, search = memberSearch) => {
    if (!workspace || !allowed(workspace, "members:read")) return;
    setMemberLoading(true);
    try {
      const [app, manual] = await Promise.all([
        platformApi.getCollection<PlatformMember>("app-members", { page, page_size: 25, search }),
        platformApi.getCollection<PlatformMember>("manual-members", { page, page_size: 25, search }),
      ]);
      setMemberDirectory({
        app,
        manual,
        items: [...app.items, ...manual.items].sort((a, b) => new Date(b.joined_at || b.created_at || 0).getTime() - new Date(a.joined_at || a.created_at || 0).getTime()),
        totalPages: Math.max(app.total_pages, manual.total_pages),
        total: app.total + manual.total,
      });
      setMemberPage(page);
    } catch (requestError) {
      toast.error("Member directory unavailable", { description: messageFromError(requestError) });
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "members" && workspace && !memberDirectory) void loadMembers(1, "");
  }, [tab, workspace]);

  const members = memberDirectory?.items || workspace?.members || [];
  const activeMembers = useMemo(() => (workspace?.members || []).filter((member) => ["active", "approved"].includes(member.status)), [workspace]);
  const openAttendance = useMemo(() => (workspace?.attendance || []).filter((row) => row.status === "checked_in" && !row.check_out_at), [workspace]);
  const todayAttendance = useMemo(() => (workspace?.attendance || []).filter((row) => row.date === todayKey() || String(row.check_in_at || "").startsWith(todayKey())), [workspace]);
  const monthlyGymRevenue = useMemo(() => {
    const now = new Date();
    return (workspace?.payments || []).filter((payment) => {
      const date = new Date(payment.paid_at);
      return payment.status === "paid" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }, [workspace]);

  const memberMap = useMemo(() => new Map((workspace?.members || []).map((member) => [`${member.member_type}:${member.id}`, member])), [workspace]);
  const memberForAttendance = (row: PlatformAttendance) => {
    if (row.membership_id) return memberMap.get(`app:${row.membership_id}`);
    if (row.manual_member_id) return memberMap.get(`manual:${row.manual_member_id}`);
    return (workspace?.members || []).find((member) => member.user_id && member.user_id === row.user_id);
  };

  const mutate = async (operation: () => Promise<unknown>, success: string, after?: (result: unknown) => void) => {
    setSaving(true);
    setError(null);
    try {
      const result = await operation();
      toast.success(success);
      after?.(result);
      setMemberDirectory(null);
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
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
  };

  const copy = async (value: string, label = "Copied") => {
    await navigator.clipboard.writeText(value).catch(() => null);
    toast.success(label);
  };

  const exportCsv = async (resource: string) => {
    setSaving(true);
    try {
      const blob = await platformApi.exportCsv(resource);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${resource} export ready`);
    } catch (requestError) {
      toast.error("Export failed", { description: messageFromError(requestError) });
    } finally {
      setSaving(false);
    }
  };

  const addMember = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addManualMember(memberForm), "Member added", () => setMemberForm(emptyMember));
  };
  const updateMemberStatus = (member: PlatformMember, status: string) => void mutate(() => platformApi.updateMember(member.member_type, member.id, { status }), "Member status updated");
  const archiveMember = (member: PlatformMember) => {
    if (!window.confirm(`Archive ${member.full_name}?`)) return;
    void mutate(() => platformApi.archiveManualMember(member.id), "Member archived");
  };
  const checkIn = (member: PlatformMember) => void mutate(() => platformApi.checkIn({ member_type: member.member_type, member_id: member.id, method: "manual", date: todayKey() }), `${member.full_name} checked in`);
  const checkOut = (row: PlatformAttendance) => void mutate(() => platformApi.checkOut(row.log_id), "Member checked out");

  const addEquipment = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addEquipment({ ...equipmentForm, available: true }), "Equipment added", () => setEquipmentForm(emptyEquipment));
  };
  const toggleEquipment = (item: PlatformEquipment) => void mutate(() => platformApi.updateEquipment(item.equipment_id || item.id || "", { available: !item.available }), item.available ? "Equipment marked unavailable" : "Equipment marked available");
  const deleteEquipment = (item: PlatformEquipment) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    void mutate(() => platformApi.deleteEquipment(item.equipment_id || item.id || ""), "Equipment deleted");
  };

  const addLead = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addLead(leadForm), "Lead added", () => setLeadForm(emptyLead));
  };
  const setLeadStatus = (lead: PlatformLead, status: string) => void mutate(() => platformApi.updateLead(lead.lead_id || lead.id || "", { status }), "Lead updated");
  const deleteLead = (lead: PlatformLead) => {
    if (!window.confirm(`Delete ${lead.name || lead.full_name}?`)) return;
    void mutate(() => platformApi.deleteLead(lead.lead_id || lead.id || ""), "Lead deleted");
  };

  const addPayment = (event: FormEvent) => {
    event.preventDefault();
    const member = (workspace?.members || []).find((item) => item.id === paymentForm.member_id);
    void mutate(() => platformApi.addPayment({
      member_id: paymentForm.member_id || null,
      member_type: member?.member_type,
      amount: Number(paymentForm.amount),
      currency: "INR",
      status: "paid",
      method: paymentForm.method,
      notes: paymentForm.notes,
      payment_reference: paymentForm.payment_reference || null,
    }), "Payment recorded", () => setPaymentForm(emptyPayment));
  };
  const setPaymentStatus = (payment: PlatformPayment, status: string) => void mutate(() => platformApi.updatePayment(payment.id, { status }), `Payment marked ${status}`);

  const addAnnouncement = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addAnnouncement({ ...announcementForm, is_published: true }), "Announcement published", () => setAnnouncementForm(emptyAnnouncement));
  };
  const toggleAnnouncement = (announcement: PlatformAnnouncement) => void mutate(() => platformApi.updateAnnouncement(announcement.id, { is_published: !announcement.is_published }), announcement.is_published ? "Announcement hidden" : "Announcement published");
  const deleteAnnouncement = (announcement: PlatformAnnouncement) => {
    if (!window.confirm(`Delete “${announcement.title}”?`)) return;
    void mutate(() => platformApi.deleteAnnouncement(announcement.id), "Announcement deleted");
  };

  const addPlan = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.addPlan({
      name: planForm.name,
      price: Number(planForm.price),
      billing_cycle: planForm.billing_cycle,
      duration_days: planForm.duration_days ? Number(planForm.duration_days) : null,
      features: planForm.features.split(",").map((feature) => feature.trim()).filter(Boolean),
      active: true,
    }), "Membership plan created", () => setPlanForm(emptyPlan));
  };
  const togglePlan = (plan: PlatformPlan) => void mutate(() => platformApi.updatePlan(plan.plan_id, { active: !plan.active }), plan.active ? "Plan paused" : "Plan activated");

  const inviteStaff = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.inviteStaff(inviteForm), "Staff invitation created", (result) => {
      setInviteForm(emptyInvite);
      const response = result as { invitation_url?: string | null; invitation_path?: string; delivery?: string; configuration_required?: boolean } | undefined;
      const shareUrl = response?.invitation_url || (response?.invitation_path ? `${window.location.origin}${response.invitation_path}` : "");
      if (shareUrl) void copy(shareUrl, response?.delivery === "email" ? "Invitation emailed and copied" : "Invitation link copied");
      if (response?.configuration_required) toast.warning("Automatic invitation email needs STAFF_INVITATION_URL on Render. The manual link was copied.");
    });
  };
  const revokeInvite = (invite: PlatformStaffInvitation) => void mutate(() => platformApi.revokeStaffInvitation(invite.invitation_id), "Invitation revoked");
  const updateStaffStatus = (staff: PlatformStaff, status: string) => void mutate(() => platformApi.updateStaff(staff.id, { status }), "Staff access updated");
  const removeStaff = (staff: PlatformStaff) => {
    if (!window.confirm(`Remove ${staff.name || staff.email} from this gym?`)) return;
    void mutate(() => platformApi.removeStaff(staff.id), "Staff access removed");
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    void mutate(() => platformApi.updateProfile(profileForm), "Gym profile updated");
  };

  if (loading) return <Layout hideFooter><div className="container-wide flex min-h-[65vh] items-center justify-center"><Loader2 className="animate-spin text-accent" size={28} /></div></Layout>;
  if (!workspace) return <Layout><section className="container-wide max-w-2xl py-24"><StatusPanel title="Gym workspace unavailable" message={error || "This account is not connected to an approved gym."} onRetry={() => void load()} /></section></Layout>;

  const gym = workspace.gym;
  const commissions = workspace.commission_summary;
  const visibleTabs = tabs.filter((item) => visible(workspace, item));
  const isOwner = ["owner", "admin"].includes(workspace.access);

  return (
    <Layout hideFooter>
      <section className="container-wide py-8 md:py-10">
        <header className="flex flex-col gap-6 border-b border-separator pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-label"><ShieldCheck size={14} /> {workspace.access === "staff" ? `${workspace.staff_profile?.role || "Staff"} permission workspace` : "Shared app + website workspace"}</div>
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
          <Metric icon={Users} label="Active members" value={allowed(workspace, "members:read") ? String(activeMembers.length) : "Restricted"} />
          <Metric icon={CalendarCheck} label="Today check-ins" value={allowed(workspace, "attendance:read") ? String(todayAttendance.length) : "Restricted"} />
          <Metric icon={IndianRupee} label="Gym revenue" value={allowed(workspace, "payments:read") ? formatMoney(monthlyGymRevenue) : "Restricted"} />
          <Metric icon={BadgeIndianRupee} label="Pending commission" value={allowed(workspace, "reports:read") ? formatMoney(commissions.pending, commissions.currency) : "Restricted"} />
          <Metric icon={Dumbbell} label="Equipment" value={allowed(workspace, "equipment:read") ? String(workspace.equipment.length) : "Restricted"} />
        </div>

        <nav className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {visibleTabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex items-center gap-2 whitespace-nowrap border px-4 py-3 text-xs uppercase tracking-widest ${tab === item.key ? "border-accent bg-accent text-accent-foreground" : "border-separator text-foreground/70 hover:bg-hover-bg"}`}><item.icon size={14} /> {item.label}</button>)}
        </nav>

        {tab === "overview" && <Overview workspace={workspace} activeMembers={activeMembers.length} openAttendance={openAttendance.length} monthlyRevenue={monthlyGymRevenue} onTab={setTab} onCopy={copy} />}

        {tab === "members" && (
          <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            {allowed(workspace, "members:write") ? <Panel title="Add manual member" description="App users join through the referral code; use this form for offline members."><form onSubmit={addMember} className="space-y-4"><Field label="Full name"><input className="lv-input" value={memberForm.name} onChange={(event) => setMemberForm((form) => ({ ...form, name: event.target.value }))} required maxLength={120} /></Field><Field label="Email"><input className="lv-input" type="email" value={memberForm.email} onChange={(event) => setMemberForm((form) => ({ ...form, email: event.target.value }))} /></Field><Field label="Phone"><input className="lv-input" value={memberForm.phone} onChange={(event) => setMemberForm((form) => ({ ...form, phone: event.target.value }))} /></Field><Field label="Notes"><textarea className="lv-input min-h-24" value={memberForm.notes} onChange={(event) => setMemberForm((form) => ({ ...form, notes: event.target.value }))} maxLength={500} /></Field><SubmitButton saving={saving} label="Add member" /></form></Panel> : <RestrictedPanel />}
            <Panel title="Member directory" description={`${memberDirectory?.total ?? workspace.members.length} matching records`} action={allowed(workspace, "reports:read") ? <ExportButton onClick={() => void exportCsv("members")} /> : undefined}>
              <form onSubmit={(event) => { event.preventDefault(); void loadMembers(1, memberSearch); }} className="mb-5 flex gap-2"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="lv-input pl-9" placeholder="Search name, email or phone" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></div><button className="border border-separator px-4 text-xs uppercase tracking-widest" disabled={memberLoading}>Search</button></form>
              {memberLoading ? <LoadingRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Member</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-separator">{members.map((member) => { const active = ["active", "approved"].includes(member.status); return <tr key={`${member.member_type}-${member.id}`}><td className="p-3"><p className="font-medium">{member.full_name}</p><p className="text-xs text-muted-foreground">{member.email || member.phone || "No contact"}</p></td><td className="p-3"><Badge text={member.member_type === "app" ? "App member" : "Manual"} tone={member.member_type === "app" ? "green" : "neutral"} /></td><td className="p-3"><Badge text={member.status} tone={active ? "green" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(member.joined_at || member.created_at)}</td><td className="p-3"><div className="flex justify-end gap-2">{allowed(workspace, "attendance:write") && <SmallButton disabled={!active || saving} onClick={() => checkIn(member)}>Check in</SmallButton>}{allowed(workspace, "members:write") && <SmallButton disabled={saving} onClick={() => updateMemberStatus(member, active ? "inactive" : "active")}>{active ? "Deactivate" : "Activate"}</SmallButton>}{member.member_type === "manual" && allowed(workspace, "members:write") && <SmallButton destructive disabled={saving} onClick={() => archiveMember(member)}>Archive</SmallButton>}</div></td></tr>; })}</tbody></table>{!members.length && <EmptyState icon={Users} title="No members" body="Add a manual member or change the search." />}</div>}
              {memberDirectory && memberDirectory.totalPages > 1 && <Pagination page={memberPage} totalPages={memberDirectory.totalPages} loading={memberLoading} onPage={(page) => void loadMembers(page, memberSearch)} />}
            </Panel>
          </div>
        )}

        {tab === "attendance" && (
          <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel title="Currently inside" description={`${openAttendance.length} open sessions`}><div className="space-y-3">{openAttendance.map((row) => { const member = memberForAttendance(row); return <div key={row.log_id} className="flex items-center gap-3 border border-accent/30 bg-accent/5 p-4"><CheckCircle2 size={18} className="text-accent" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{member?.full_name || "Gym member"}</p><p className="text-xs text-muted-foreground">In since {formatDate(row.check_in_at)}</p></div>{allowed(workspace, "attendance:write") && <SmallButton disabled={saving} onClick={() => checkOut(row)}>Check out</SmallButton>}</div>; })}{!openAttendance.length && <EmptyState icon={UserCheck} title="No active check-ins" body="Use the member directory to check someone in." />}</div></Panel>
            <Panel title="Attendance history" description={`${todayAttendance.length} visits today`} action={allowed(workspace, "reports:read") ? <ExportButton onClick={() => void exportCsv("attendance")} /> : undefined}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Member</th><th className="p-3">Check in</th><th className="p-3">Check out</th><th className="p-3">Duration</th><th className="p-3">Method</th></tr></thead><tbody className="divide-y divide-separator">{workspace.attendance.map((row) => { const member = memberForAttendance(row); return <tr key={row.log_id}><td className="p-3 font-medium">{member?.full_name || "Gym member"}</td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.check_in_at)}</td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.check_out_at)}</td><td className="p-3 font-mono text-xs">{row.duration_minutes == null ? "—" : `${row.duration_minutes} min`}</td><td className="p-3 text-xs text-muted-foreground">{row.method || "app"}</td></tr>; })}</tbody></table></div></Panel>
          </div>
        )}

        {tab === "equipment" && <EquipmentTab workspace={workspace} saving={saving} form={equipmentForm} setForm={setEquipmentForm} onAdd={addEquipment} onToggle={toggleEquipment} onDelete={deleteEquipment} onExport={() => void exportCsv("equipment")} />}
        {tab === "leads" && <LeadsTab workspace={workspace} saving={saving} form={leadForm} setForm={setLeadForm} onAdd={addLead} onStatus={setLeadStatus} onDelete={deleteLead} onExport={() => void exportCsv("leads")} />}
        {tab === "payments" && <PaymentsTab workspace={workspace} saving={saving} form={paymentForm} setForm={setPaymentForm} onAdd={addPayment} onStatus={setPaymentStatus} onExport={() => void exportCsv("payments")} monthlyRevenue={monthlyGymRevenue} />}
        {tab === "announcements" && <AnnouncementsTab workspace={workspace} saving={saving} form={announcementForm} setForm={setAnnouncementForm} onAdd={addAnnouncement} onToggle={toggleAnnouncement} onDelete={deleteAnnouncement} />}
        {tab === "plans" && <PlansTab workspace={workspace} saving={saving} form={planForm} setForm={setPlanForm} onAdd={addPlan} onToggle={togglePlan} onExport={() => void exportCsv("plans")} />}
        {tab === "team" && isOwner && <TeamTab workspace={workspace} saving={saving} form={inviteForm} setForm={setInviteForm} onInvite={inviteStaff} onRevoke={revokeInvite} onStatus={updateStaffStatus} onRemove={removeStaff} onExport={() => void exportCsv("staff")} />}
        {tab === "reports" && <ReportsTab workspace={workspace} commissions={workspace.commissions || []} onExport={exportCsv} />}

        {tab === "settings" && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="Gym profile" description="The same profile is displayed across the website and mobile app."><form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2"><Field label="Gym name"><input className="lv-input" value={profileForm.name} onChange={(event) => setProfileForm((form) => ({ ...form, name: event.target.value }))} required /></Field><Field label="Phone"><input className="lv-input" value={profileForm.phone} onChange={(event) => setProfileForm((form) => ({ ...form, phone: event.target.value }))} /></Field><Field label="Email"><input className="lv-input" type="email" value={profileForm.email} onChange={(event) => setProfileForm((form) => ({ ...form, email: event.target.value }))} /></Field><Field label="Address"><input className="lv-input" value={profileForm.address} onChange={(event) => setProfileForm((form) => ({ ...form, address: event.target.value }))} /></Field><Field label="City"><input className="lv-input" value={profileForm.city} onChange={(event) => setProfileForm((form) => ({ ...form, city: event.target.value }))} /></Field><Field label="State"><input className="lv-input" value={profileForm.state} onChange={(event) => setProfileForm((form) => ({ ...form, state: event.target.value }))} /></Field><Field label="Pincode"><input className="lv-input" value={profileForm.pincode} onChange={(event) => setProfileForm((form) => ({ ...form, pincode: event.target.value }))} /></Field><div className="md:col-span-2"><Field label="Description"><textarea className="lv-input min-h-32" value={profileForm.description} onChange={(event) => setProfileForm((form) => ({ ...form, description: event.target.value }))} maxLength={2000} /></Field></div><div className="md:col-span-2"><SubmitButton saving={saving} label="Save shared profile" /></div></form></Panel>
            <Panel title="Connection status"><div className="space-y-3"><ConnectionRow label="Supabase database" value="Connected" /><ConnectionRow label="Native app backend" value="Connected" /><ConnectionRow label="Website workspace" value="Canonical API" /><ConnectionRow label="Gym ID" value={gym.gym_id} mono /><ConnectionRow label="Access" value={workspace.access} /><ConnectionRow label="Permissions" value={String(workspace.permissions?.length || "Owner full access")} /></div></Panel>
          </div>
        )}
      </section>
    </Layout>
  );
}

function Overview({ workspace, activeMembers, openAttendance, monthlyRevenue, onTab, onCopy }: { workspace: PlatformWorkspace; activeMembers: number; openAttendance: number; monthlyRevenue: number; onTab: (tab: TabKey) => void; onCopy: (value: string, label?: string) => Promise<void> }) {
  const commissions = workspace.commission_summary;
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]"><div className="space-y-8"><Panel title="Live operations" description="Canonical records used by both the native app and website."><div className="grid gap-px border border-separator bg-separator md:grid-cols-4"><MiniStat label="Total members" value={allowed(workspace, "members:read") ? String(workspace.members.length) : "Restricted"} /><MiniStat label="Inside now" value={allowed(workspace, "attendance:read") ? String(openAttendance) : "Restricted"} /><MiniStat label="Open leads" value={allowed(workspace, "leads:read") ? String(workspace.leads.filter((lead) => !["converted", "lost", "closed"].includes(lead.status)).length) : "Restricted"} /><MiniStat label="App commission" value={allowed(workspace, "reports:read") ? formatMoney(commissions.total, commissions.currency) : "Restricted"} /></div></Panel><Panel title="Recent attendance" description="Latest verified gym visits."><div className="space-y-2">{workspace.attendance.slice(0, 8).map((row) => <div key={row.log_id} className="flex items-center gap-3 border border-separator p-3"><CalendarCheck size={16} className="text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Gym member</p><p className="text-xs text-muted-foreground">{formatDate(row.check_in_at)} · {row.status}</p></div>{row.duration_minutes != null && <span className="font-mono text-xs text-muted-foreground">{row.duration_minutes} min</span>}</div>)}{!workspace.attendance.length && <EmptyState icon={CalendarCheck} title="No attendance yet" body="Check in an active member from the Attendance tab." />}</div></Panel></div><div className="space-y-8"><Panel title="Quick actions"><div className="grid gap-3">{allowed(workspace, "members:write") && <QuickAction icon={Users} label="Add member" onClick={() => onTab("members")} />}{allowed(workspace, "attendance:write") && <QuickAction icon={UserCheck} label="Record check-in" onClick={() => onTab("attendance")} />}{allowed(workspace, "payments:write") && <QuickAction icon={CreditCard} label="Record gym payment" onClick={() => onTab("payments")} />}{allowed(workspace, "announcements:write") && <QuickAction icon={Megaphone} label="Publish announcement" onClick={() => onTab("announcements")} />}</div></Panel>{workspace.gym.referral_code && <Panel title="Gym referral" description="Members using this code are attributed to your gym for the 20% commission model."><button onClick={() => void onCopy(workspace.gym.referral_code || "", "Referral code copied")} className="flex w-full items-center justify-between border border-accent/30 bg-accent/5 p-5 text-left"><span className="font-mono text-2xl font-bold tracking-[0.12em] text-accent">{workspace.gym.referral_code}</span><Copy size={18} /></button></Panel>}<Panel title="Performance"><div className="grid grid-cols-2 gap-px bg-separator"><MiniStat label="Active members" value={String(activeMembers)} /><MiniStat label="Revenue this month" value={formatMoney(monthlyRevenue)} /></div></Panel></div></div>;
}

function EquipmentTab({ workspace, saving, form, setForm, onAdd, onToggle, onDelete, onExport }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyEquipment; setForm: React.Dispatch<React.SetStateAction<typeof emptyEquipment>>; onAdd: (event: FormEvent) => void; onToggle: (item: PlatformEquipment) => void; onDelete: (item: PlatformEquipment) => void; onExport: () => void }) {
  return <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">{allowed(workspace, "equipment:write") ? <Panel title="Add equipment"><form onSubmit={onAdd} className="space-y-4"><Field label="Name"><input className="lv-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field><Field label="Category"><input className="lv-input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></Field><Field label="Quantity"><input className="lv-input" type="number" min={1} max={100000} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} required /></Field><SubmitButton saving={saving} label="Save equipment" /></form></Panel> : <RestrictedPanel />}<Panel title="Equipment inventory" description="Shared with the mobile owner dashboard." action={allowed(workspace, "reports:read") ? <ExportButton onClick={onExport} /> : undefined}><div className="grid gap-3 md:grid-cols-2">{workspace.equipment.map((item) => <div key={item.equipment_id || item.id} className="flex items-center gap-3 border border-separator p-4"><Dumbbell size={18} className={item.available ? "text-accent" : "text-muted-foreground"} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.category || "General"} · Qty {item.quantity}</p></div>{allowed(workspace, "equipment:write") && <><button onClick={() => onToggle(item)} className="p-2">{item.available ? <ToggleRight className="text-accent" /> : <ToggleLeft />}</button><button onClick={() => onDelete(item)} className="p-2 text-destructive"><Trash2 size={17} /></button></>}</div>)}{!workspace.equipment.length && <EmptyState icon={Dumbbell} title="No equipment" body="Add your first equipment item." />}</div></Panel></div>;
}

function LeadsTab({ workspace, saving, form, setForm, onAdd, onStatus, onDelete, onExport }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyLead; setForm: React.Dispatch<React.SetStateAction<typeof emptyLead>>; onAdd: (event: FormEvent) => void; onStatus: (lead: PlatformLead, status: string) => void; onDelete: (lead: PlatformLead) => void; onExport: () => void }) {
  return <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">{allowed(workspace, "leads:write") ? <Panel title="Add lead"><form onSubmit={onAdd} className="space-y-4"><Field label="Name"><input className="lv-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field><Field label="Phone"><input className="lv-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field><Field label="Email"><input className="lv-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field><Field label="Source"><input className="lv-input" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} /></Field><Field label="Message"><textarea className="lv-input min-h-24" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></Field><SubmitButton saving={saving} label="Save lead" /></form></Panel> : <RestrictedPanel />}<Panel title="Lead pipeline" action={allowed(workspace, "reports:read") ? <ExportButton onClick={onExport} /> : undefined}><div className="space-y-3">{workspace.leads.map((lead) => <div key={lead.lead_id || lead.id} className="border border-separator p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{lead.name || lead.full_name}</p><p className="text-xs text-muted-foreground">{lead.phone || lead.email || lead.source || "No contact"}</p></div><Badge text={lead.status} tone={lead.status === "converted" ? "green" : "neutral"} /></div>{allowed(workspace, "leads:write") && <div className="mt-4 flex flex-wrap gap-2"><LeadButton label="Contacted" onClick={() => onStatus(lead, "contacted")} /><LeadButton label="Qualified" onClick={() => onStatus(lead, "qualified")} /><LeadButton label="Converted" onClick={() => onStatus(lead, "converted")} primary /><LeadButton label="Lost" onClick={() => onStatus(lead, "lost")} /><LeadButton label="Delete" onClick={() => onDelete(lead)} destructive /></div>}</div>)}{!workspace.leads.length && <EmptyState icon={ClipboardList} title="No leads" body="Website enquiries and manually added leads appear here." />}</div></Panel></div>;
}

function PaymentsTab({ workspace, saving, form, setForm, onAdd, onStatus, onExport, monthlyRevenue }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyPayment; setForm: React.Dispatch<React.SetStateAction<typeof emptyPayment>>; onAdd: (event: FormEvent) => void; onStatus: (payment: PlatformPayment, status: string) => void; onExport: () => void; monthlyRevenue: number }) {
  return <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">{allowed(workspace, "payments:write") ? <Panel title="Record gym payment" description="Gym membership dues, not app subscriptions."><form onSubmit={onAdd} className="space-y-4"><Field label="Member (optional)"><select className="lv-input" value={form.member_id} onChange={(event) => setForm((current) => ({ ...current, member_id: event.target.value }))}><option value="">Walk-in / unassigned</option>{workspace.members.map((member) => <option key={`${member.member_type}-${member.id}`} value={member.id}>{member.full_name}</option>)}</select></Field><Field label="Amount"><input className="lv-input" type="number" min={1} step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required /></Field><Field label="Method"><select className="lv-input" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option><option value="other">Other</option></select></Field><Field label="Reference"><input className="lv-input" value={form.payment_reference} onChange={(event) => setForm((current) => ({ ...current, payment_reference: event.target.value }))} /></Field><Field label="Notes"><textarea className="lv-input min-h-20" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field><SubmitButton saving={saving} label="Record payment" /></form></Panel> : <RestrictedPanel />}<Panel title="Gym payment history" description={`${formatMoney(monthlyRevenue)} recorded this month`} action={allowed(workspace, "reports:read") ? <ExportButton onClick={onExport} /> : undefined}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-separator">{workspace.payments.map((payment) => <tr key={payment.id}><td className="p-3 font-mono font-medium">{formatMoney(payment.amount, payment.currency)}</td><td className="p-3 text-xs">{payment.method || "manual"}</td><td className="p-3"><Badge text={payment.status} tone={payment.status === "paid" ? "green" : payment.status === "refunded" ? "red" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(payment.paid_at)}</td><td className="p-3 text-xs text-muted-foreground">{payment.payment_reference || "—"}</td><td className="p-3"><div className="flex justify-end gap-2">{allowed(workspace, "payments:write") && payment.status === "paid" && <><SmallButton onClick={() => onStatus(payment, "refunded")}>Refunded</SmallButton><SmallButton onClick={() => onStatus(payment, "cancelled")}>Cancelled</SmallButton></>}</div></td></tr>)}</tbody></table>{!workspace.payments.length && <EmptyState icon={CreditCard} title="No gym payments" body="Record the first gym membership payment." />}</div></Panel></div>;
}

function AnnouncementsTab({ workspace, saving, form, setForm, onAdd, onToggle, onDelete }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyAnnouncement; setForm: React.Dispatch<React.SetStateAction<typeof emptyAnnouncement>>; onAdd: (event: FormEvent) => void; onToggle: (item: PlatformAnnouncement) => void; onDelete: (item: PlatformAnnouncement) => void }) {
  return <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">{allowed(workspace, "announcements:write") ? <Panel title="Publish announcement"><form onSubmit={onAdd} className="space-y-4"><Field label="Title"><input className="lv-input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></Field><Field label="Message"><textarea className="lv-input min-h-40" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} required maxLength={4000} /></Field><Field label="Audience"><select className="lv-input" value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}><option value="all_members">All members</option><option value="active_members">Active members</option><option value="staff">Staff</option></select></Field><SubmitButton saving={saving} label="Publish announcement" /></form></Panel> : <RestrictedPanel />}<Panel title="Published updates"><div className="space-y-3">{workspace.announcements.map((announcement) => <div key={announcement.id} className="flex items-start gap-4 border border-separator p-4"><Megaphone size={18} className={announcement.is_published ? "mt-1 text-accent" : "mt-1 text-muted-foreground"} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{announcement.title}</p><Badge text={announcement.is_published ? "Published" : "Hidden"} tone={announcement.is_published ? "green" : "neutral"} /></div><p className="mt-2 text-sm leading-relaxed text-foreground/70">{announcement.body}</p><p className="mt-2 text-xs text-muted-foreground">{announcement.audience} · {formatDate(announcement.created_at)}</p></div>{allowed(workspace, "announcements:write") && <><button onClick={() => onToggle(announcement)} className="p-2">{announcement.is_published ? <ToggleRight className="text-accent" /> : <ToggleLeft />}</button><button onClick={() => onDelete(announcement)} className="p-2 text-destructive"><Trash2 size={17} /></button></>}</div>)}{!workspace.announcements.length && <EmptyState icon={Bell} title="No announcements" body="Publish the first update for gym members." />}</div></Panel></div>;
}

function PlansTab({ workspace, saving, form, setForm, onAdd, onToggle, onExport }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyPlan; setForm: React.Dispatch<React.SetStateAction<typeof emptyPlan>>; onAdd: (event: FormEvent) => void; onToggle: (plan: PlatformPlan) => void; onExport: () => void }) {
  return <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">{allowed(workspace, "plans:write") ? <Panel title="Create gym plan" description="Gym fee plans are separate from SE7EN FIT app subscriptions."><form onSubmit={onAdd} className="space-y-4"><Field label="Plan name"><input className="lv-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field><Field label="Price"><input className="lv-input" type="number" min={0} step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required /></Field><Field label="Billing cycle"><select className="lv-input" value={form.billing_cycle} onChange={(event) => setForm((current) => ({ ...current, billing_cycle: event.target.value }))}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half_yearly">Half-yearly</option><option value="annual">Annual</option><option value="weekly">Weekly</option><option value="custom">Custom</option></select></Field><Field label="Duration days"><input className="lv-input" type="number" min={1} max={3650} value={form.duration_days} onChange={(event) => setForm((current) => ({ ...current, duration_days: event.target.value }))} /></Field><Field label="Features, comma separated"><textarea className="lv-input min-h-20" value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} /></Field><SubmitButton saving={saving} label="Create plan" /></form></Panel> : <RestrictedPanel />}<Panel title="Membership plans" action={allowed(workspace, "reports:read") ? <ExportButton onClick={onExport} /> : undefined}><div className="space-y-3">{workspace.plans.map((plan) => <div key={plan.plan_id} className="flex items-center gap-4 border border-separator p-4"><IndianRupee size={18} className={plan.active ? "text-accent" : "text-muted-foreground"} /><div className="min-w-0 flex-1"><p className="font-medium">{plan.name}</p><p className="text-xs text-muted-foreground">{formatMoney(plan.price)} · {plan.billing_cycle.replaceAll("_", " ")} · {plan.duration_days || "custom"} days</p><p className="mt-1 text-xs text-foreground/55">{plan.features?.join(" · ") || "No feature notes"}</p></div>{allowed(workspace, "plans:write") && <button onClick={() => onToggle(plan)} className="p-2">{plan.active ? <ToggleRight className="text-accent" /> : <ToggleLeft />}</button>}</div>)}{!workspace.plans.length && <EmptyState icon={ClipboardList} title="No plans" body="Create your first gym membership plan." />}</div></Panel></div>;
}

function TeamTab({ workspace, saving, form, setForm, onInvite, onRevoke, onStatus, onRemove, onExport }: { workspace: PlatformWorkspace; saving: boolean; form: typeof emptyInvite; setForm: React.Dispatch<React.SetStateAction<typeof emptyInvite>>; onInvite: (event: FormEvent) => void; onRevoke: (invite: PlatformStaffInvitation) => void; onStatus: (staff: PlatformStaff, status: string) => void; onRemove: (staff: PlatformStaff) => void; onExport: () => void }) {
  return <div className="grid gap-8 xl:grid-cols-[390px_minmax(0,1fr)]"><Panel title="Invite staff" description="The invited email must match the account used to accept access."><form onSubmit={onInvite} className="space-y-4"><Field label="Name"><input className="lv-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="Email"><input className="lv-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field><Field label="Phone"><input className="lv-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field><Field label="Role"><select className="lv-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="manager">Manager</option><option value="receptionist">Receptionist</option><option value="trainer">Trainer</option><option value="accountant">Accountant</option></select></Field><SubmitButton saving={saving} label="Create invitation" /></form><div className="mt-8 border-t border-separator pt-6"><p className="text-label mb-3">Pending invitations</p><div className="space-y-2">{workspace.staff_invitations.filter((invite) => invite.status === "pending").map((invite) => <div key={invite.invitation_id} className="flex items-center gap-3 border border-separator p-3"><UserPlus size={16} className="text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invite.email}</p><p className="text-xs text-muted-foreground">{invite.role} · expires {formatDate(invite.expires_at)}</p></div><SmallButton destructive onClick={() => onRevoke(invite)}>Revoke</SmallButton></div>)}{!workspace.staff_invitations.some((invite) => invite.status === "pending") && <p className="text-sm text-muted-foreground">No pending invitations.</p>}</div></div></Panel><Panel title="Active team" description="Permissions are enforced by the backend for app and website." action={<ExportButton onClick={onExport} />}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Staff</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Permissions</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-separator">{workspace.staff.map((staff) => <tr key={staff.id}><td className="p-3"><p className="font-medium">{staff.name || staff.email}</p><p className="text-xs text-muted-foreground">{staff.email || staff.phone || "No contact"}</p></td><td className="p-3 capitalize">{staff.role}</td><td className="p-3"><Badge text={staff.status} tone={staff.status === "active" ? "green" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{staff.permissions?.length || 0} scopes</td><td className="p-3"><div className="flex justify-end gap-2"><SmallButton disabled={saving} onClick={() => onStatus(staff, staff.status === "active" ? "suspended" : "active")}>{staff.status === "active" ? "Suspend" : "Activate"}</SmallButton><SmallButton destructive disabled={saving} onClick={() => onRemove(staff)}>Remove</SmallButton></div></td></tr>)}</tbody></table>{!workspace.staff.length && <EmptyState icon={Users} title="No staff accounts" body="Invite managers, receptionists, trainers or accountants." />}</div></Panel></div>;
}

function ReportsTab({ workspace, commissions, onExport }: { workspace: PlatformWorkspace; commissions: PlatformCommission[]; onExport: (resource: string) => Promise<void> }) {
  const summary = workspace.commission_summary;
  return <div className="space-y-8"><div className="grid gap-px border border-separator bg-separator sm:grid-cols-2 xl:grid-cols-5"><Metric icon={Wallet} label="Total commission" value={formatMoney(summary.total, summary.currency)} /><Metric icon={Activity} label="Pending" value={formatMoney(summary.pending, summary.currency)} /><Metric icon={CheckCircle2} label="Approved" value={formatMoney(summary.approved, summary.currency)} /><Metric icon={BadgeIndianRupee} label="Paid" value={formatMoney(summary.paid, summary.currency)} /><Metric icon={XCircle} label="Reversed" value={formatMoney(summary.reversed, summary.currency)} /></div><Panel title="SE7EN FIT partner commission ledger" description="20% of successful attributed app subscriptions. Refunds and chargebacks reverse unpaid commission."><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-separator text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-3">Gross subscription</th><th className="p-3">Rate</th><th className="p-3">Commission</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-separator">{commissions.map((row) => <tr key={row.commission_id}><td className="p-3 font-mono">{formatMoney(row.gross_amount, row.currency)}</td><td className="p-3 font-mono">{Math.round(Number(row.commission_rate) * 100)}%</td><td className="p-3 font-mono font-bold text-accent">{formatMoney(row.commission_amount, row.currency)}</td><td className="p-3"><Badge text={row.status} tone={row.status === "paid" ? "green" : row.status === "reversed" ? "red" : "neutral"} /></td><td className="p-3 text-xs text-muted-foreground">{formatDate(row.created_at)}</td></tr>)}</tbody></table>{!commissions.length && <EmptyState icon={Wallet} title="No commission yet" body="Rows appear after referred members complete successful app subscription payments." />}</div></Panel><Panel title="Operational exports" description="CSV files are generated by the server using gym-scoped data and spreadsheet-safe values."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["members", "attendance", "equipment", "leads", "payments", "plans"].map((resource) => <button key={resource} onClick={() => void onExport(resource)} className="inline-flex items-center justify-between border border-separator px-4 py-4 text-sm capitalize hover:bg-hover-bg"><span>{resource}</span><Download size={16} className="text-accent" /></button>)}</div></Panel></div>;
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="border border-separator bg-hover-bg/20 p-5 md:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold tracking-[-0.02em]">{title}</h2>{description && <p className="mt-1 text-sm leading-relaxed text-foreground/60">{description}</p>}</div>{action}</div>{children}</section>;
}
function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="bg-background p-4"><Icon size={17} className="text-accent" /><p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div className="bg-background p-4"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-display text-xl font-bold">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-foreground/70">{label}</span>{children}</label>; }
function SubmitButton({ saving, label }: { saving: boolean; label: string }) { return <button disabled={saving} type="submit" className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-xs font-medium uppercase tracking-widest text-accent-foreground disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{label}</button>; }
function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-3 border border-separator px-4 py-3 text-left text-xs uppercase tracking-widest hover:bg-hover-bg"><Icon size={16} className="text-accent" />{label}</button>; }
function Badge({ text, tone = "neutral" }: { text: string; tone?: "green" | "neutral" | "red" }) { const classes = tone === "green" ? "border-accent/30 bg-accent/10 text-accent" : tone === "red" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-separator text-muted-foreground"; return <span className={`inline-flex border px-2 py-1 text-[10px] uppercase tracking-wider ${classes}`}>{text.replaceAll("_", " ")}</span>; }
function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) { return <div className="border border-dashed border-separator px-5 py-10 text-center"><Icon size={24} className="mx-auto text-muted-foreground" /><p className="mt-3 font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>; }
function StatusPanel({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) { return <div className="border border-destructive/30 bg-destructive/5 p-6"><h2 className="font-display text-2xl font-bold">{title}</h2><p className="mt-2 text-sm text-foreground/65">{message}</p><button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 border border-separator px-4 py-3 text-xs uppercase tracking-widest"><RefreshCw size={14} /> Try again</button></div>; }
function ConnectionRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-3 border-b border-separator pb-3 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className={mono ? "max-w-[200px] truncate font-mono text-xs" : "font-medium capitalize"}>{value}</span></div>; }
function SmallButton({ children, onClick, disabled, destructive = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className={`border px-3 py-2 text-[10px] uppercase tracking-widest disabled:opacity-40 ${destructive ? "border-destructive/30 text-destructive" : "border-separator"}`}>{children}</button>; }
function LeadButton({ label, onClick, primary = false, destructive = false }: { label: string; onClick: () => void; primary?: boolean; destructive?: boolean }) { return <button type="button" onClick={onClick} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${destructive ? "border-destructive/30 text-destructive" : primary ? "border-accent bg-accent text-accent-foreground" : "border-separator"}`}>{label}</button>; }
function ExportButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="inline-flex items-center gap-2 border border-separator px-3 py-2 text-[10px] uppercase tracking-widest hover:bg-hover-bg"><Download size={13} /> Export</button>; }
function RestrictedPanel() { return <Panel title="Read-only access" description="Your staff role does not include permission to create or modify this resource."><div className="border border-separator p-5 text-sm text-muted-foreground">Contact the gym owner to change your permission preset.</div></Panel>; }
function LoadingRows() { return <div className="flex min-h-52 items-center justify-center"><Loader2 className="animate-spin text-accent" size={24} /></div>; }
function Pagination({ page, totalPages, loading, onPage }: { page: number; totalPages: number; loading: boolean; onPage: (page: number) => void }) { return <div className="mt-5 flex items-center justify-between border border-separator p-2"><button disabled={loading || page <= 1} onClick={() => onPage(page - 1)} className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-35"><ChevronLeft size={14} /> Previous</button><span className="font-mono text-xs text-muted-foreground">{page} / {totalPages}</span><button disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)} className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-35">Next <ChevronRight size={14} /></button></div>; }
