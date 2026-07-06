import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, RefreshCw, RotateCcw, Search, ShieldOff, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, DataPill, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type GymStatus = "all" | "active" | "suspended" | "pending" | "cancelled";

type Gym = {
  id: string;
  name: string;
  slug?: string | null;
  owner_id?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  gym_type?: string | null;
  member_capacity?: number | null;
  created_at: string;
  updated_at: string;
  stats?: { members: number; attendance: number; payments: number };
};

type GymsResponse = { ok: boolean; gyms: Gym[]; summary: { total: number; active: number; suspended: number } };
const statuses: GymStatus[] = ["active", "suspended", "pending", "cancelled", "all"];

export default function AdminGyms() {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, suspended: 0 });
  const [status, setStatus] = useState<GymStatus>("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => gyms.find((gym) => gym.id === selectedId) ?? gyms[0] ?? null, [gyms, selectedId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeAdmin<GymsResponse>("admin-gyms", { action: "list", status, search: search.trim() || undefined });
      setGyms(data.gyms ?? []);
      setSummary(data.summary ?? { total: 0, active: 0, suspended: 0 });
      if (!selectedId && data.gyms?.[0]) setSelectedId(data.gyms[0].id);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load gyms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);
  useEffect(() => {
    if (!selected) return;
    setForm({ name: selected.name || "", city: selected.city || "", phone: selected.phone || "", email: selected.email || "" });
  }, [selected?.id]);

  const runAction = async (action: "update" | "suspend" | "reactivate") => {
    if (!selected) return;
    setBusy(action);
    try {
      await invokeAdmin("admin-gyms", {
        action,
        gym_id: selected.id,
        updates: action === "update" ? form : undefined,
      });
      toast.success(action === "suspend" ? "Gym suspended" : action === "reactivate" ? "Gym reactivated" : "Gym updated");
      await load();
    } catch (err) {
      toast.error("Gym action failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="operations" title="Gyms" body="View all gyms, edit basic details, monitor members, attendance and payments, and suspend or reactivate access." actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <AdminMetricCard icon={Building2} label="Total gyms" value={summary.total} />
        <AdminMetricCard icon={Building2} label="Active gyms" value={summary.active} />
        <AdminMetricCard icon={ShieldOff} label="Suspended gyms" value={summary.suspended} />
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by gym, owner, city, phone or email…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </form>
        <div className="flex flex-wrap gap-2">
          {statuses.map((value) => <button key={value} onClick={() => setStatus(value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value}</button>)}
        </div>
      </div>

      {loading && <AdminLoadingState label="Loading gyms…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="border border-separator divide-y divide-separator bg-background">
            {gyms.length === 0 && <AdminEmptyState title="No gyms found" body="Try another status or search query." />}
            {gyms.map((gym) => (
              <button key={gym.id} onClick={() => setSelectedId(gym.id)} className={`block w-full p-5 text-left hover:bg-hover-bg ${selected?.id === gym.id ? "bg-hover-bg" : ""}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{gym.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{gym.owner_name || gym.owner_email || "No owner linked"}</p>
                  </div>
                  <StatusBadge status={gym.status} />
                </div>
                <div className="grid gap-2 text-xs text-foreground/65 sm:grid-cols-4">
                  <span>{gym.city || "No city"}</span><span>{gym.phone || "No phone"}</span><span>{gym.stats?.members ?? 0} members</span><span>{gym.stats?.payments ?? 0} payments</span>
                </div>
              </button>
            ))}
          </div>

          <aside>
            {!selected && <AdminEmptyState title="Select a gym" />}
            {selected && (
              <div className="border border-separator bg-black/40 p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-label mb-2">Gym profile</p>
                    <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{selected.name}</h2>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <DataPill label="Owner" value={selected.owner_name || selected.owner_email} />
                  <DataPill label="Slug" value={selected.slug} />
                  <DataPill label="Members" value={selected.stats?.members ?? 0} />
                  <DataPill label="Attendance" value={selected.stats?.attendance ?? 0} />
                  <DataPill label="Payments" value={selected.stats?.payments ?? 0} />
                  <DataPill label="Created" value={formatDateTime(selected.created_at)} />
                </div>

                <div className="mt-5 space-y-3">
                  <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Gym name</span><input className="lv-input" value={form.name} onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))} /></label>
                  <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">City</span><input className="lv-input" value={form.city} onChange={(event) => setForm((old) => ({ ...old, city: event.target.value }))} /></label>
                  <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Phone</span><input className="lv-input" value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} /></label>
                  <label className="block space-y-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Email</span><input className="lv-input" value={form.email} onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))} /></label>
                </div>

                <div className="mt-5 grid gap-2">
                  <button disabled={!!busy} onClick={() => runAction("update")} className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground disabled:opacity-40">{busy === "update" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save details</button>
                  {selected.status === "suspended" ? (
                    <button disabled={!!busy} onClick={() => runAction("reactivate")} className="inline-flex items-center justify-center gap-2 border border-separator px-4 py-3 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-40">{busy === "reactivate" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reactivate gym</button>
                  ) : (
                    <button disabled={!!busy} onClick={() => runAction("suspend")} className="inline-flex items-center justify-center gap-2 border border-orange-500/50 px-4 py-3 text-xs uppercase tracking-widest text-orange-300 hover:bg-orange-500/10 disabled:opacity-40">{busy === "suspend" ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />} Suspend gym</button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </section>
      )}
    </AdminControlLayout>
  );
}
