import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, RefreshCw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type CodeStatus = "all" | "unused" | "used" | "expired" | "revoked";
type AccessCode = { id: string; code_prefix: string; status: string; expires_at: string; used_at?: string | null; used_by?: string | null; created_at: string; request_id?: string | null; request?: { gym_name?: string; owner_email?: string; owner_full_name?: string; status?: string } | null };
type ResponseShape = { ok: boolean; codes: AccessCode[]; summary: { total: number; unused: number; used: number; expired: number; revoked: number } };
const statuses: CodeStatus[] = ["unused", "used", "expired", "revoked", "all"];

export default function AdminAccessCodes() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [summary, setSummary] = useState({ total: 0, unused: 0, used: 0, expired: 0, revoked: 0 });
  const [status, setStatus] = useState<CodeStatus>("unused");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await invokeAdmin<ResponseShape>("admin-access-codes", { action: "list", status, search: search.trim() || undefined });
      setCodes(data.codes ?? []); setSummary(data.summary ?? summary);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load activation codes.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const retire = async (code: AccessCode) => {
    setBusy(code.id);
    try {
      await invokeAdmin("admin-access-codes", { action: "revoke", code_id: code.id });
      toast.success("Activation code retired");
      await load();
    } catch (err) {
      toast.error("Code action failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally { setBusy(null); }
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="security" title="Activation codes" body="Track single-use gym activation records by status. The dashboard only shows prefixes and metadata." actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><AdminMetricCard icon={KeyRound} label="Total" value={summary.total} /><AdminMetricCard icon={KeyRound} label="Unused" value={summary.unused} /><AdminMetricCard icon={KeyRound} label="Used" value={summary.used} /><AdminMetricCard icon={KeyRound} label="Expired" value={summary.expired} /><AdminMetricCard icon={KeyRound} label="Retired" value={summary.revoked} /></div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]"><form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3"><Search size={16} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prefix, gym, owner email…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></form><div className="flex flex-wrap gap-2">{statuses.map((value) => <button key={value} onClick={() => setStatus(value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value}</button>)}</div></div>

      {loading && <AdminLoadingState label="Loading activation codes…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && codes.length === 0 && <AdminEmptyState title="No activation codes found" body="Codes are generated from the Gym Requests page after approval." />}
      {!loading && !error && codes.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{codes.map((code) => <article key={code.id} className="border border-separator bg-background p-5"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="font-mono text-lg text-accent">{code.code_prefix}••••</p><p className="mt-1 text-sm text-muted-foreground">{code.request?.gym_name || "No gym linked"}</p></div><StatusBadge status={code.status} /></div><div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><p>Owner: {code.request?.owner_email || "—"}</p><p>Request: {code.request_id?.slice(0, 8) || "—"}</p><p>Created: {formatDateTime(code.created_at)}</p><p>Expires: {formatDateTime(code.expires_at)}</p><p>Used: {formatDateTime(code.used_at)}</p><p>Used by: {code.used_by?.slice(0, 8) || "—"}</p></div>{code.status === "unused" && <button disabled={busy === code.id} onClick={() => retire(code)} className="mt-5 inline-flex items-center gap-2 border border-orange-500/40 px-4 py-3 text-xs uppercase tracking-widest text-orange-300 hover:bg-orange-500/10 disabled:opacity-40"><XCircle size={14} /> {busy === code.id ? "Retiring…" : "Retire code"}</button>}</article>)}</div>}
    </AdminControlLayout>
  );
}
