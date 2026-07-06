import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, DataPill, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type AppRole = "super_admin" | "admin" | "gym_owner" | "gym_staff" | "member";
type UserFilter = "all" | "admins" | "gym_owners" | "users";
type AdminUser = { id: string; email?: string | null; full_name?: string | null; phone?: string | null; created_at?: string | null; last_sign_in_at?: string | null; roles: Array<{ id: string; role: AppRole; gym_id?: string | null; created_at: string }> };
type UsersResponse = { ok: boolean; users: AdminUser[]; summary: { total: number; admins: number; gym_owners: number; normal_users: number; super_admins: number } };

const filters: UserFilter[] = ["all", "admins", "gym_owners", "users"];
const roleOptions: AppRole[] = ["super_admin", "admin", "gym_owner", "gym_staff", "member"];

export default function AdminUsersRoles() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState({ total: 0, admins: 0, gym_owners: 0, normal_users: 0, super_admins: 0 });
  const [filter, setFilter] = useState<UserFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("member");
  const [gymId, setGymId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? users[0] ?? null, [users, selectedId]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await invokeAdmin<UsersResponse>("admin-users", { action: "list", filter, search: search.trim() || undefined });
      setUsers(data.users ?? []); setSummary(data.summary ?? summary);
      if (!selectedId && data.users?.[0]) setSelectedId(data.users[0].id);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const mutateRole = async (action: "assign_role" | "remove_role", targetRole: AppRole, roleId?: string) => {
    if (!selected) return;
    setBusy(roleId || action);
    try {
      await invokeAdmin("admin-users", { action, user_id: selected.id, role: targetRole, role_id: roleId, gym_id: gymId || undefined });
      toast.success(action === "assign_role" ? "Role assigned" : "Role removed");
      await load();
    } catch (err) {
      toast.error("Role update failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally { setBusy(null); }
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="identity" title="Users & roles" body="Manage admins, gym owners, staff and members through server-side role checks. Super-admin changes are protected by the Edge Function." actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <AdminMetricCard icon={Users} label="Total users" value={summary.total} />
        <AdminMetricCard icon={ShieldCheck} label="Admins" value={summary.admins} />
        <AdminMetricCard icon={UserCog} label="Gym owners" value={summary.gym_owners} />
        <AdminMetricCard icon={Users} label="Normal users" value={summary.normal_users} />
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3"><Search size={16} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email, name or phone…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></form>
        <div className="flex flex-wrap gap-2">{filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${filter === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value.replace("_", " ")}</button>)}</div>
      </div>

      {loading && <AdminLoadingState label="Loading users…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border border-separator divide-y divide-separator bg-background">
            {users.length === 0 && <AdminEmptyState title="No users found" body="Try another search or filter." />}
            {users.map((user) => <button key={user.id} onClick={() => setSelectedId(user.id)} className={`block w-full p-5 text-left hover:bg-hover-bg ${selected?.id === user.id ? "bg-hover-bg" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{user.full_name || user.email || "Unnamed user"}</h2><p className="mt-1 text-sm text-muted-foreground">{user.email || "No email"}</p></div><div className="flex flex-wrap gap-2">{user.roles.length ? user.roles.map((r) => <StatusBadge key={r.id} status={r.role} />) : <StatusBadge status="user" />}</div></div><p className="mt-3 text-xs text-muted-foreground">Created {formatDateTime(user.created_at)} · Last login {formatDateTime(user.last_sign_in_at)}</p></button>)}
          </div>

          <aside>
            {!selected && <AdminEmptyState title="Select a user" />}
            {selected && <div className="border border-separator bg-black/40 p-5"><p className="text-label mb-2">User detail</p><h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{selected.full_name || selected.email || "Unnamed user"}</h2><div className="mt-5 grid gap-2 sm:grid-cols-2"><DataPill label="Email" value={selected.email} /><DataPill label="Phone" value={selected.phone} /><DataPill label="Created" value={formatDateTime(selected.created_at)} /><DataPill label="Last login" value={formatDateTime(selected.last_sign_in_at)} /></div><div className="mt-6 border-t border-separator pt-5"><p className="text-label mb-3">Current roles</p><div className="space-y-2">{!selected.roles.length && <p className="text-sm text-muted-foreground">No role assigned.</p>}{selected.roles.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 border border-separator p-3"><div><StatusBadge status={r.role} /><p className="mt-2 font-mono text-[10px] text-muted-foreground">Gym: {r.gym_id || "global"}</p></div><button disabled={busy === r.id} onClick={() => mutateRole("remove_role", r.role, r.id)} className="border border-red-500/40 px-3 py-2 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-40">{busy === r.id ? "Removing…" : "Remove"}</button></div>)}</div></div><div className="mt-6 border-t border-separator pt-5"><p className="text-label mb-3">Assign role</p><div className="grid gap-3"><select className="lv-input" value={role} onChange={(event) => setRole(event.target.value as AppRole)}>{roleOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select><input className="lv-input" value={gymId} onChange={(event) => setGymId(event.target.value)} placeholder="Optional gym ID for scoped roles" /><button disabled={!!busy} onClick={() => mutateRole("assign_role", role)} className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-40">{busy === "assign_role" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Assign role</button></div></div></div>}
          </aside>
        </section>
      )}
    </AdminControlLayout>
  );
}
