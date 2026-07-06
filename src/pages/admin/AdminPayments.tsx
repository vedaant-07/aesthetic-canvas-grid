import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeIndianRupee, Download, RefreshCw, Search } from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, formatMoney, invokeAdmin } from "@/admin/adminApi";

type PaymentStatus = "all" | "paid" | "pending" | "failed" | "unpaid";
type Payment = { id: string; gym_id?: string | null; gym_name?: string | null; owner_email?: string | null; amount: number; currency: string; status: string; subscription_status?: string | null; provider?: string | null; provider_payment_id?: string | null; paid_at?: string | null; created_at: string };
type ResponseShape = { ok: boolean; payments: Payment[]; summary: { total_revenue: number; monthly_revenue: number; paid: number; pending: number; failed: number; unpaid: number; currency: string } };
const statuses: PaymentStatus[] = ["all", "paid", "pending", "failed", "unpaid"];

export default function AdminPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({ total_revenue: 0, monthly_revenue: 0, paid: 0, pending: 0, failed: 0, unpaid: 0, currency: "INR" });
  const [status, setStatus] = useState<PaymentStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await invokeAdmin<ResponseShape>("admin-payments", { action: "list", status, search: search.trim() || undefined });
      setPayments(data.payments ?? []); setSummary(data.summary ?? summary);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load payments.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  return (
    <AdminControlLayout>
      <AdminSectionHeader eyebrow="monetization" title="Payments" body="Monitor subscription status, pending and failed payments, paid revenue, and export-ready payment rows from Supabase." actions={<><button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button><button disabled className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest text-muted-foreground"><Download size={14} /> Export ready</button></>} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminMetricCard icon={BadgeIndianRupee} label="Monthly revenue" value={formatMoney(summary.monthly_revenue, summary.currency)} /><AdminMetricCard icon={BadgeIndianRupee} label="Total revenue" value={formatMoney(summary.total_revenue, summary.currency)} /><AdminMetricCard icon={BadgeIndianRupee} label="Pending payments" value={summary.pending} /><AdminMetricCard icon={BadgeIndianRupee} label="Failed payments" value={summary.failed} /></div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]"><form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3"><Search size={16} className="text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gym, owner, provider id…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></form><div className="flex flex-wrap gap-2">{statuses.map((value) => <button key={value} onClick={() => setStatus(value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value}</button>)}</div></div>

      {loading && <AdminLoadingState label="Loading payments…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}
      {!loading && !error && payments.length === 0 && <AdminEmptyState title="No payments found" body="Payment rows will appear after subscriptions or manual payment entries are created." />}
      {!loading && !error && payments.length > 0 && <div className="overflow-hidden border border-separator"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-separator bg-hover-bg/40 text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-4">Gym</th><th className="p-4">Owner</th><th className="p-4">Amount</th><th className="p-4">Payment</th><th className="p-4">Subscription</th><th className="p-4">Provider</th><th className="p-4">Created</th></tr></thead><tbody className="divide-y divide-separator">{payments.map((payment) => <tr key={payment.id} className="bg-background hover:bg-hover-bg"><td className="p-4 font-medium">{payment.gym_name || payment.gym_id || "—"}</td><td className="p-4 text-muted-foreground">{payment.owner_email || "—"}</td><td className="p-4 font-mono">{formatMoney(payment.amount, payment.currency)}</td><td className="p-4"><StatusBadge status={payment.status} /></td><td className="p-4"><StatusBadge status={payment.subscription_status || "unknown"} /></td><td className="p-4 text-xs text-muted-foreground">{payment.provider || "manual"}<br />{payment.provider_payment_id || ""}</td><td className="p-4 text-xs text-muted-foreground">{formatDateTime(payment.created_at)}</td></tr>)}</tbody></table></div></div>}
    </AdminControlLayout>
  );
}
