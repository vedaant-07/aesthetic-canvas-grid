import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, RefreshCw, Search } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, compactId, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type AuditLog = { id: string; action: string; actor_id?: string | null; actor_email?: string | null; entity_type?: string | null; entity_id?: string | null; ip?: string | null; metadata?: Record<string, unknown>; created_at: string };
type ResponseShape = { ok: boolean; logs: AuditLog[]; summary: { total: number; admin_actions: number; request_actions: number; code_actions: number; security_actions: number } };

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState({ total: 0, admin_actions: 0, request_actions: 0, code_actions: 0, security_actions: 0 });
  const [actionType, setActionType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await invokeAdmin<ResponseShape>("admin-audit-logs", { action: "list", action_type: actionType, search: search.trim() || undefined });
      setLogs(data.logs ?? []); setSummary(data.summary ?? summary);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load audit logs.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [actionType]);

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="security trail" title="Audit logs" body="Every production admin action should leave a server-side audit event with actor, entity, IP address and metadata preview." actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><AdminMetricCard icon={Activity} label="Total logs" value={summary.total} /><AdminMetricCard icon={Activity} label="Admin actions" value={summary.admin_actions} /><AdminMetricCard icon={Activity} label="Requests" value={summary.request_actions} /><AdminMetricCard icon={Activity} label="Codes" value={summary.code_actions} /><AdminMetricCard icon={Activity} label="Security" value={summary.security_actions} /></div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]"><form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3"><Search size={16} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, actor, entity, IP…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></form><select value={actionType} onChange={(event) => setActionType(event.target.value)} className="lv-input min-w-[220px]"><option value="all">All action types</option><option value="admin">Admin</option><option value="gym_request">Gym request</option><option value="gym_code">Activation code</option><option value="gym">Gym</option><option value="payment">Payment</option><option value="security">Security</option></select></div>

      {loading && <AdminLoadingState label="Loading audit logs…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && logs.length === 0 && <AdminEmptyState title="No audit logs found" body="Try another action filter or search query." />}
      {!loading && !error && logs.length > 0 && <div className="border border-separator divide-y divide-separator bg-background">{logs.map((log) => <article key={log.id} className="p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-mono text-sm text-accent">{log.action}</h2><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p></div><StatusBadge status={log.entity_type || "event"} /></div><div className="grid gap-3 text-sm text-foreground/70 md:grid-cols-4"><p><span className="text-muted-foreground">Actor:</span><br />{log.actor_email || compactId(log.actor_id)}</p><p><span className="text-muted-foreground">Target:</span><br />{log.entity_type || "—"} · {compactId(log.entity_id)}</p><p><span className="text-muted-foreground">IP:</span><br />{log.ip || "—"}</p><p><span className="text-muted-foreground">Metadata:</span><br /><code className="line-clamp-2 text-[11px] text-muted-foreground">{JSON.stringify(log.metadata ?? {}).slice(0, 160)}</code></p></div></article>)}</div>}
    </AdminControlLayout>
  );
}
