import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeIndianRupee, Loader2, RefreshCw, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, DataPill, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type AppRole = "super_admin" | "admin" | "gym_owner" | "gym_staff" | "member";
type UserFilter = "all" | "active" | "subscription_active" | "subscription_expired" | "subscription_none";
type SubscriptionState = "active" | "expired" | "none";

type AdminUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  is_active: boolean;
  subscription_state: SubscriptionState;
  subscription_status?: string | null;
  latest_payment?: { id: string; amount: number; currency: string; status: string; subscription_status: string; created_at: string | null; paid_at: string | null } | null;
  roles: Array<{ id: string; role: AppRole; gym_id?: string | null; created_at: string }>;
};

type UsersResponse = {
  ok: boolean;
  users: AdminUser[];
  summary: {
    total: number;
    active_users: number;
    active_subscriptions: number;
    expired_subscriptions: number;
    no_subscription: number;
    admins: number;
    gym_owners: number;
    normal_users: number;
    super_admins: number;
  };
};

const userFilters: Array<{ value: UserFilter; label: string }> = [
  { value: "all", label: "All Users" },
  { value: "active", label: "Active Users" },
  { value: "subscription_active", label: "Active Subscription" },
  { value: "subscription_expired", label: "Expired Subscription" },
  { value: "subscription_none", label: "No Subscription" },
];

const roleOptions: AppRole[] = ["super_admin", "admin", "gym_owner", "gym_staff", "member"];
const defaultSummary: UsersResponse["summary"] = { total: 0, active_users: 0, active_subscriptions: 0, expired_subscriptions: 0, no_subscription: 0, admins: 0, gym_owners: 0, normal_users: 0, super_admins: 0 };

function getValidFilter(value: string | null): UserFilter {
  return userFilters.some((item) => item.value === value) ? value as UserFilter : "all";
}

function subscriptionBadge(user: AdminUser) {
  if (user.subscription_state === "none") return "no subscription";
  if (user.subscription_state === "active") return user.subscription_status || "active";
  return user.subscription_status || "expired";
}

export default function AdminUsersRoles() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = getValidFilter(searchParams.get("view"));
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("member");
  const [gymId, setGymId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? users[0] ?? null, [users, selectedId]);
  const currentFilterLabel = userFilters.find((item) => item.value === filter)?.label ?? "All Users";

  const setFilter = (value: UserFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", value);
    setSearchParams(next);
    setSelectedId(null);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeAdmin<UsersResponse>("admin-users", { action: "list", filter, search: search.trim() || undefined });
      setUsers(data.users ?? []);
      setSummary(data.summary ?? defaultSummary);
      setSelectedId((current) => current && data.users?.some((user) => user.id === current) ? current : data.users?.[0]?.id ?? null);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filter]);

  const mutateRole = async (action: "assign_role" | "remove_role", targetRole: AppRole, roleId?: string) => {
    if (!selected) return;
    setBusy(roleId || action);
    try {
      await invokeAdmin("admin-users", { action, user_id: selected.id, role: targetRole, role_id: roleId, gym_id: gymId || undefined });
      toast.success(action === "assign_role" ? "Role assigned" : "Role removed");
      await load();
    } catch (err) {
      toast.error("Role update failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="user control"
        title="Users"
        body="View all users, active accounts, users with active subscriptions, expired subscriptions, and users without any subscription. Role controls stay protected by the admin Edge Function."
        actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard icon={Users} label="All users" value={summary.total} />
        <AdminMetricCard icon={UserCheck} label="Active users" value={summary.active_users} />
        <AdminMetricCard icon={BadgeIndianRupee} label="Active subscriptions" value={summary.active_subscriptions} />
        <AdminMetricCard icon={BadgeIndianRupee} label="Expired subscriptions" value={summary.expired_subscriptions} />
        <AdminMetricCard icon={Users} label="Without subscription" value={summary.no_subscription} />
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email, name or phone…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </form>
        <div className="flex flex-wrap gap-2">
          {userFilters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${filter === item.value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
        </div>
      </div>

      {loading && <AdminLoadingState label={`Loading ${currentFilterLabel.toLowerCase()}…`} />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border border-separator divide-y divide-separator bg-background">
            {users.length === 0 && <AdminEmptyState title="No users found" body="Try another search or user section." />}
            {users.map((user) => (
              <button key={user.id} onClick={() => setSelectedId(user.id)} className={`block w-full p-5 text-left hover:bg-hover-bg ${selected?.id === user.id ? "bg-hover-bg" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{user.full_name || user.email || "Unnamed user"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email || "No email"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusBadge status={user.is_active ? "active" : "inactive"} />
                    <StatusBadge status={subscriptionBadge(user)} />
                    {user.roles.length ? user.roles.map((r) => <StatusBadge key={r.id} status={r.role} />) : <StatusBadge status="user" />}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Created {formatDateTime(user.created_at)} · Last login {formatDateTime(user.last_sign_in_at)}</p>
              </button>
            ))}
          </div>

          <aside>
            {!selected && <AdminEmptyState title="Select a user" />}
            {selected && (
              <div className="border border-separator bg-black/40 p-5">
                <p className="text-label mb-2">User detail</p>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{selected.full_name || selected.email || "Unnamed user"}</h2>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <DataPill label="Email" value={selected.email} />
                  <DataPill label="Phone" value={selected.phone} />
                  <DataPill label="Account" value={selected.is_active ? "active" : "inactive"} />
                  <DataPill label="Subscription" value={subscriptionBadge(selected)} />
                  <DataPill label="Created" value={formatDateTime(selected.created_at)} />
                  <DataPill label="Last login" value={formatDateTime(selected.last_sign_in_at)} />
                </div>
                {selected.latest_payment && (
                  <div className="mt-5 border border-separator bg-hover-bg/20 p-4">
                    <p className="text-label mb-3">Latest subscription payment</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <DataPill label="Payment status" value={selected.latest_payment.status} />
                      <DataPill label="Subscription status" value={selected.latest_payment.subscription_status} />
                      <DataPill label="Amount" value={`${selected.latest_payment.currency} ${selected.latest_payment.amount}`} />
                      <DataPill label="Paid at" value={formatDateTime(selected.latest_payment.paid_at)} />
                    </div>
                  </div>
                )}
                <div className="mt-6 border-t border-separator pt-5">
                  <p className="text-label mb-3">Current roles</p>
                  <div className="space-y-2">
                    {!selected.roles.length && <p className="text-sm text-muted-foreground">No role assigned.</p>}
                    {selected.roles.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 border border-separator p-3">
                        <div><StatusBadge status={r.role} /><p className="mt-2 font-mono text-[10px] text-muted-foreground">Gym: {r.gym_id || "global"}</p></div>
                        <button disabled={busy === r.id} onClick={() => mutateRole("remove_role", r.role, r.id)} className="border border-red-500/40 px-3 py-2 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-40">{busy === r.id ? "Removing…" : "Remove"}</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 border-t border-separator pt-5">
                  <p className="text-label mb-3">Assign role</p>
                  <div className="grid gap-3">
                    <select className="lv-input" value={role} onChange={(event) => setRole(event.target.value as AppRole)}>{roleOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <input className="lv-input" value={gymId} onChange={(event) => setGymId(event.target.value)} placeholder="Optional gym ID for scoped roles" />
                    <button disabled={!!busy} onClick={() => mutateRole("assign_role", role)} className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-40">{busy === "assign_role" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Assign role</button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      )}
    </AdminControlLayout>
  );
}
