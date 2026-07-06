import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Building2, CheckCircle2, Clock3, Dumbbell, KeyRound, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, AuditMiniList } from "@/admin/AdminUI";
import { AdminApiError, formatMoney, invokeAdmin } from "@/admin/adminApi";

type Metrics = {
  counts: {
    pending_requests: number;
    approved_requests: number;
    activated_requests: number;
    rejected_requests: number;
    total_gyms: number;
    active_gyms: number;
    gym_owners: number;
    unused_codes: number;
    today_requests: number;
  };
  revenue: { total_revenue: number; monthly_revenue: number; currency: string };
  recent_audit: Array<{ id: string; action: string; actor_id: string | null; ip: string | null; created_at: string }>;
};

export default function AdminOverview() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeAdmin<Metrics>("admin-metrics", { action: "overview" });
      setMetrics(data);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="control room"
        title="Admin dashboard"
        body="Production admin surface for gym applications, active gyms, access codes, payments, user roles, and audit activity."
        actions={
          <button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {loading && <AdminLoadingState />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}

      {!loading && metrics && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard icon={Clock3} label="Pending gym requests" value={metrics.counts.pending_requests} />
            <AdminMetricCard icon={CheckCircle2} label="Approved requests" value={metrics.counts.approved_requests} />
            <AdminMetricCard icon={Dumbbell} label="Activated gyms" value={metrics.counts.activated_requests} />
            <AdminMetricCard icon={XCircle} label="Rejected requests" value={metrics.counts.rejected_requests} />
            <AdminMetricCard icon={Building2} label="Total active gyms" value={metrics.counts.active_gyms} />
            <AdminMetricCard icon={ShieldCheck} label="Total gym owners" value={metrics.counts.gym_owners} />
            <AdminMetricCard icon={KeyRound} label="Unused access codes" value={metrics.counts.unused_codes} />
            <AdminMetricCard icon={Activity} label="Today’s new requests" value={metrics.counts.today_requests} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="border border-separator bg-hover-bg/20 p-6">
              <p className="text-label mb-6">Revenue monitor</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminMetricCard icon={Activity} label="Monthly revenue" value={formatMoney(metrics.revenue.monthly_revenue, metrics.revenue.currency)} hint="paid" />
                <AdminMetricCard icon={Activity} label="Total revenue" value={formatMoney(metrics.revenue.total_revenue, metrics.revenue.currency)} hint="lifetime" />
              </div>
            </section>

            <aside>
              <p className="text-label mb-4">Recent admin actions</p>
              {metrics.recent_audit?.length ? <AuditMiniList logs={metrics.recent_audit} /> : <AdminEmptyState title="No audit activity yet" body="Admin actions will appear here after requests, codes, roles, gyms, or payments are changed." />}
            </aside>
          </div>
        </div>
      )}
    </AdminControlLayout>
  );
}
