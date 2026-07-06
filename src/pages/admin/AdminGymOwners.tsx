import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminSectionHeader, DataPill, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type GymOwner = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  roles: Array<{ id: string; role: string; gym_id?: string | null; created_at: string }>;
  owned_gyms?: Array<{ id: string; name: string; status: string; city?: string | null }>;
};

type ResponseShape = { ok: boolean; users: GymOwner[] };

export default function AdminGymOwners() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<GymOwner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await invokeAdmin<ResponseShape>("admin-users", { action: "list", filter: "gym_owners", search: search.trim() || undefined });
      setOwners(data.users ?? []);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load gym owners.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="partners" title="Gym owners" body="Directory of approved gym owners, their linked gyms, role scope, and last login visibility when Supabase Auth provides it." actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>} />

      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-6 flex items-center gap-3 border border-separator bg-background px-4 py-3">
        <Search size={16} className="text-muted-foreground" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gym owner email, name or phone…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </form>

      {loading && <AdminLoadingState label="Loading gym owners…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && owners.length === 0 && <AdminEmptyState title="No gym owners found" body="Gym owners appear after activation or manual role assignment." />}
      {!loading && !error && owners.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{owners.map((owner) => <article key={owner.id} className="border border-separator bg-background p-5"><div className="mb-5 flex items-start justify-between gap-4"><div><ShieldCheck className="mb-4 text-accent" size={20} /><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{owner.full_name || owner.email || "Unnamed owner"}</h2><p className="mt-1 text-sm text-muted-foreground">{owner.email || "No email"}</p></div><StatusBadge status="gym_owner" /></div><div className="grid gap-2 sm:grid-cols-2"><DataPill label="Phone" value={owner.phone} /><DataPill label="Last login" value={formatDateTime(owner.last_sign_in_at)} /><DataPill label="Created" value={formatDateTime(owner.created_at)} /><DataPill label="Roles" value={owner.roles.length} /></div><div className="mt-5 border-t border-separator pt-4"><p className="text-label mb-3">Linked gyms</p>{!owner.owned_gyms?.length && <p className="text-sm text-muted-foreground">No linked gym found.</p>}{owner.owned_gyms?.map((gym) => <div key={gym.id} className="mb-2 flex items-center justify-between gap-3 border border-separator p-3"><div><p className="font-medium">{gym.name}</p><p className="text-xs text-muted-foreground">{gym.city || "No city"}</p></div><StatusBadge status={gym.status} /></div>)}</div></article>)}</div>}
    </AdminControlLayout>
  );
}
