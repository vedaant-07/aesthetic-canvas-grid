import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  Check,
  CreditCard,
  Download,
  HandCoins,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, formatMoney, invokeAdmin } from "@/admin/adminApi";

type ViewMode = "payments" | "commissions" | "payouts";
type PaymentStatus = "all" | "paid" | "pending" | "failed" | "unpaid" | "refunded";
type CommissionStatus = "all" | "pending" | "approved" | "paid" | "reversed";
type PayoutStatus = "all" | "pending" | "processing" | "paid" | "failed" | "cancelled";

type Payment = {
  id: string;
  payment_id: string;
  gym_id?: string | null;
  gym_name?: string | null;
  owner_email?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  plan_code?: string | null;
  amount: number;
  currency: string;
  status: string;
  subscription_status?: string | null;
  provider?: string | null;
  provider_payment_id?: string | null;
  created_at: string;
};

type Commission = {
  commission_id: string;
  gym_id: string;
  gym_name?: string | null;
  owner_email?: string | null;
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
  payment_id: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: string;
  available: boolean;
  available_at?: string | null;
  payout_reference?: string | null;
  created_at: string;
};

type Payout = {
  payout_id: string;
  gym_id: string;
  gym_name?: string | null;
  owner_email?: string | null;
  amount: number;
  currency: string;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  payment_reference?: string | null;
  created_at: string;
  paid_at?: string | null;
};

type PaymentResponse = {
  ok: boolean;
  payments: Payment[];
  summary: {
    total_revenue: number;
    monthly_revenue: number;
    paid: number;
    pending: number;
    failed: number;
    unpaid: number;
    refunded: number;
    currency: string;
  };
};

type CommissionResponse = {
  ok: boolean;
  commissions: Commission[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    reversed: number;
    available_count: number;
    currency: string;
  };
};

type PayoutResponse = {
  ok: boolean;
  payouts: Payout[];
  summary: {
    total: number;
    pending: number;
    processing: number;
    paid: number;
    failed: number;
    cancelled: number;
    currency: string;
  };
};

const paymentStatuses: PaymentStatus[] = ["all", "paid", "pending", "failed", "unpaid", "refunded"];
const commissionStatuses: CommissionStatus[] = ["all", "pending", "approved", "paid", "reversed"];
const payoutStatuses: PayoutStatus[] = ["all", "pending", "processing", "paid", "failed", "cancelled"];

const emptyPaymentSummary: PaymentResponse["summary"] = { total_revenue: 0, monthly_revenue: 0, paid: 0, pending: 0, failed: 0, unpaid: 0, refunded: 0, currency: "INR" };
const emptyCommissionSummary: CommissionResponse["summary"] = { total: 0, pending: 0, approved: 0, paid: 0, reversed: 0, available_count: 0, currency: "INR" };
const emptyPayoutSummary: PayoutResponse["summary"] = { total: 0, pending: 0, processing: 0, paid: 0, failed: 0, cancelled: 0, currency: "INR" };

export default function AdminPayments() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>("payments");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [paymentSummary, setPaymentSummary] = useState(emptyPaymentSummary);
  const [commissionSummary, setCommissionSummary] = useState(emptyCommissionSummary);
  const [payoutSummary, setPayoutSummary] = useState(emptyPayoutSummary);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencePayoutId, setReferencePayoutId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");

  const statuses = mode === "payments" ? paymentStatuses : mode === "commissions" ? commissionStatuses : payoutStatuses;

  const handleError = (requestError: unknown, fallback: string) => {
    if (requestError instanceof AdminApiError && requestError.sessionExpired) {
      navigate("/", { replace: true });
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "payments") {
        const data = await invokeAdmin<PaymentResponse>("admin-payments", { action: "list", status, search: search.trim() || undefined });
        setPayments(data.payments ?? []);
        setPaymentSummary(data.summary ?? emptyPaymentSummary);
      } else if (mode === "commissions") {
        const data = await invokeAdmin<CommissionResponse>("admin-payments", { action: "list_commissions", status, search: search.trim() || undefined });
        setCommissions(data.commissions ?? []);
        setCommissionSummary(data.summary ?? emptyCommissionSummary);
      } else {
        const data = await invokeAdmin<PayoutResponse>("admin-payments", { action: "list_payouts", status, search: search.trim() || undefined });
        setPayouts(data.payouts ?? []);
        setPayoutSummary(data.summary ?? emptyPayoutSummary);
      }
      setSelected(new Set());
    } catch (requestError) {
      handleError(requestError, `Could not load ${mode}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [mode, status]);

  const switchMode = (next: ViewMode) => {
    setMode(next);
    setStatus("all");
    setSearch("");
    setSelected(new Set());
    setError(null);
  };

  const toggleSelection = (commissionId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(commissionId)) next.delete(commissionId);
      else next.add(commissionId);
      return next;
    });
  };

  const selectedRows = useMemo(() => commissions.filter((row) => selected.has(row.commission_id)), [commissions, selected]);
  const selectedPending = selectedRows.filter((row) => row.status === "pending" && row.available);
  const selectedApproved = selectedRows.filter((row) => row.status === "approved" && !row.payout_reference);
  const selectedGymIds = [...new Set(selectedApproved.map((row) => row.gym_id))];
  const selectedCurrencies = [...new Set(selectedApproved.map((row) => row.currency))];
  const payoutSelectionValid = selectedApproved.length === selectedRows.length && selectedApproved.length > 0 && selectedGymIds.length === 1 && selectedCurrencies.length === 1;
  const selectedTotal = selectedRows.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);

  const mutate = async (operation: () => Promise<unknown>) => {
    setMutating(true);
    setError(null);
    try {
      await operation();
      await load();
    } catch (requestError) {
      handleError(requestError, "The finance action could not be completed.");
    } finally {
      setMutating(false);
    }
  };

  const approveSelected = () => {
    if (selectedPending.length !== selectedRows.length || !selectedPending.length) {
      setError("Select only available pending commission rows for approval.");
      return;
    }
    void mutate(() => invokeAdmin("admin-payments", { action: "approve_commissions", commission_ids: selectedPending.map((row) => row.commission_id) }));
  };

  const createPayout = () => {
    if (!payoutSelectionValid) {
      setError("A payout selection must contain only approved, unpaid commission rows from one gym and one currency.");
      return;
    }
    if (!window.confirm(`Create a payout of ${formatMoney(selectedTotal, selectedCurrencies[0])} for ${selectedApproved[0]?.gym_name || selectedGymIds[0]}?`)) return;
    void mutate(() => invokeAdmin("admin-payments", {
      action: "create_payout",
      gym_id: selectedGymIds[0],
      commission_ids: selectedApproved.map((row) => row.commission_id),
      notes: "Created from the SE7EN FIT admin commission ledger",
    }));
  };

  const markPaid = (payout: Payout) => {
    const reference = paymentReference.trim();
    if (reference.length < 3) {
      setError("Enter the bank, UPI or payout transaction reference before marking this payout paid.");
      return;
    }
    void mutate(async () => {
      await invokeAdmin("admin-payments", { action: "mark_payout_paid", payout_id: payout.payout_id, payment_reference: reference });
      setReferencePayoutId(null);
      setPaymentReference("");
    });
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="monetization"
        title="Payments & gym commissions"
        body="Monitor app subscriptions, approve the 20% gym-partner commission after the hold period, create payout batches, and record verified payout references."
        actions={(
          <>
            <button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>
            <button disabled className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest text-muted-foreground"><Download size={14} /> Export planned</button>
          </>
        )}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <ModeButton active={mode === "payments"} icon={CreditCard} label="Subscriptions" onClick={() => switchMode("payments")} />
        <ModeButton active={mode === "commissions"} icon={HandCoins} label="Commission ledger" onClick={() => switchMode("commissions")} />
        <ModeButton active={mode === "payouts"} icon={WalletCards} label="Gym payouts" onClick={() => switchMode("payouts")} />
      </div>

      {mode === "payments" && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard icon={BadgeIndianRupee} label="Monthly revenue" value={formatMoney(paymentSummary.monthly_revenue, paymentSummary.currency)} />
          <AdminMetricCard icon={BadgeIndianRupee} label="Total revenue" value={formatMoney(paymentSummary.total_revenue, paymentSummary.currency)} />
          <AdminMetricCard icon={BadgeIndianRupee} label="Successful payments" value={paymentSummary.paid} />
          <AdminMetricCard icon={BadgeIndianRupee} label="Pending / failed" value={`${paymentSummary.pending} / ${paymentSummary.failed}`} />
        </div>
      )}

      {mode === "commissions" && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard icon={HandCoins} label="Total commission" value={formatMoney(commissionSummary.total, commissionSummary.currency)} />
          <AdminMetricCard icon={HandCoins} label="Pending" value={formatMoney(commissionSummary.pending, commissionSummary.currency)} />
          <AdminMetricCard icon={Check} label="Approved" value={formatMoney(commissionSummary.approved, commissionSummary.currency)} />
          <AdminMetricCard icon={BadgeIndianRupee} label="Paid" value={formatMoney(commissionSummary.paid, commissionSummary.currency)} />
          <AdminMetricCard icon={HandCoins} label="Available rows" value={commissionSummary.available_count} />
        </div>
      )}

      {mode === "payouts" && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard icon={WalletCards} label="Payout total" value={formatMoney(payoutSummary.total, payoutSummary.currency)} />
          <AdminMetricCard icon={WalletCards} label="Pending" value={formatMoney(payoutSummary.pending, payoutSummary.currency)} />
          <AdminMetricCard icon={Check} label="Paid" value={formatMoney(payoutSummary.paid, payoutSummary.currency)} />
          <AdminMetricCard icon={WalletCards} label="Failed / cancelled" value={formatMoney(payoutSummary.failed + payoutSummary.cancelled, payoutSummary.currency)} />
        </div>
      )}

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gym, owner, user, provider or reference…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </form>
        <div className="flex flex-wrap gap-2">
          {statuses.map((value) => <button key={value} onClick={() => setStatus(value)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value}</button>)}
        </div>
      </div>

      {mode === "commissions" && selected.size > 0 && (
        <div className="mb-6 flex flex-col gap-4 border border-accent/30 bg-accent/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-medium uppercase tracking-widest text-accent">{selected.size} rows selected</p><p className="mt-1 font-mono text-lg font-bold">{formatMoney(selectedTotal, selectedRows[0]?.currency || "INR")}</p></div>
          <div className="flex flex-wrap gap-2">
            <button disabled={mutating || selectedPending.length !== selectedRows.length} onClick={approveSelected} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest disabled:opacity-40"><Check size={14} /> Approve available</button>
            <button disabled={mutating || !payoutSelectionValid} onClick={createPayout} className="inline-flex h-10 items-center gap-2 bg-accent px-4 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40"><HandCoins size={14} /> Create payout</button>
          </div>
        </div>
      )}

      {loading && <AdminLoadingState label={`Loading ${mode}…`} />}
      {!loading && error && <AdminErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && mode === "payments" && payments.length === 0 && <AdminEmptyState title="No payments found" body="Verified app subscription payment rows will appear here." />}
      {!loading && !error && mode === "commissions" && commissions.length === 0 && <AdminEmptyState title="No commission rows" body="Commission is generated after an attributed member completes a successful app subscription payment." />}
      {!loading && !error && mode === "payouts" && payouts.length === 0 && <AdminEmptyState title="No payouts" body="Approve eligible commission rows, then create a gym payout batch." />}

      {!loading && !error && mode === "payments" && payments.length > 0 && (
        <div className="overflow-hidden border border-separator"><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="border-b border-separator bg-hover-bg/40 text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="p-4">Gym</th><th className="p-4">Member</th><th className="p-4">Plan</th><th className="p-4">Amount</th><th className="p-4">Payment</th><th className="p-4">Subscription</th><th className="p-4">Provider</th><th className="p-4">Created</th></tr></thead><tbody className="divide-y divide-separator">{payments.map((payment) => <tr key={payment.id} className="bg-background hover:bg-hover-bg"><td className="p-4"><p className="font-medium">{payment.gym_name || payment.gym_id || "Direct"}</p><p className="text-xs text-muted-foreground">{payment.owner_email || "—"}</p></td><td className="p-4"><p className="font-medium">{payment.user_name || "Member"}</p><p className="text-xs text-muted-foreground">{payment.user_email || "—"}</p></td><td className="p-4 font-mono text-xs">{payment.plan_code || "—"}</td><td className="p-4 font-mono">{formatMoney(payment.amount, payment.currency)}</td><td className="p-4"><StatusBadge status={payment.status} /></td><td className="p-4"><StatusBadge status={payment.subscription_status || "unknown"} /></td><td className="p-4 text-xs text-muted-foreground">{payment.provider || "manual"}<br />{payment.provider_payment_id || ""}</td><td className="p-4 text-xs text-muted-foreground">{formatDateTime(payment.created_at)}</td></tr>)}</tbody></table></div></div>
      )}

      {!loading && !error && mode === "commissions" && commissions.length > 0 && (
        <div className="overflow-hidden border border-separator"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="border-b border-separator bg-hover-bg/40 text-xs uppercase tracking-widest text-muted-foreground"><tr><th className="w-12 p-4">Select</th><th className="p-4">Gym</th><th className="p-4">Member</th><th className="p-4">Gross</th><th className="p-4">Rate</th><th className="p-4">Commission</th><th className="p-4">Status</th><th className="p-4">Available</th><th className="p-4">Payout reference</th><th className="p-4">Created</th></tr></thead><tbody className="divide-y divide-separator">{commissions.map((row) => { const selectable = (row.status === "pending" && row.available) || (row.status === "approved" && !row.payout_reference); return <tr key={row.commission_id} className="bg-background hover:bg-hover-bg"><td className="p-4"><input type="checkbox" checked={selected.has(row.commission_id)} disabled={!selectable || mutating} onChange={() => toggleSelection(row.commission_id)} className="h-4 w-4 accent-accent" aria-label={`Select commission for ${row.gym_name || row.gym_id}`} /></td><td className="p-4"><p className="font-medium">{row.gym_name || row.gym_id}</p><p className="text-xs text-muted-foreground">{row.owner_email || "—"}</p></td><td className="p-4"><p className="font-medium">{row.user_name || "Member"}</p><p className="text-xs text-muted-foreground">{row.user_email || "—"}</p></td><td className="p-4 font-mono">{formatMoney(row.gross_amount, row.currency)}</td><td className="p-4 font-mono">{Math.round(Number(row.commission_rate) * 100)}%</td><td className="p-4 font-mono font-bold text-accent">{formatMoney(row.commission_amount, row.currency)}</td><td className="p-4"><StatusBadge status={row.status} /></td><td className="p-4 text-xs text-muted-foreground">{row.status === "pending" ? row.available ? "Ready" : formatDateTime(row.available_at || row.created_at) : "—"}</td><td className="p-4 max-w-[180px] break-all font-mono text-xs text-muted-foreground">{row.payout_reference || "—"}</td><td className="p-4 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td></tr>; })}</tbody></table></div></div>
      )}

      {!loading && !error && mode === "payouts" && payouts.length > 0 && (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div key={payout.payout_id} className="border border-separator bg-background p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{payout.gym_name || payout.gym_id}</p><StatusBadge status={payout.status} /></div><p className="mt-1 text-xs text-muted-foreground">{payout.owner_email || "—"} · {payout.period_start || "—"} to {payout.period_end || "—"}</p><p className="mt-2 break-all font-mono text-xs text-muted-foreground">Payout ID: {payout.payout_id}</p></div>
                <p className="font-mono text-xl font-bold text-accent">{formatMoney(payout.amount, payout.currency)}</p>
                {payout.status === "paid" ? <div className="text-right"><p className="text-xs font-medium text-accent">Paid</p><p className="mt-1 max-w-[240px] break-all font-mono text-xs text-muted-foreground">{payout.payment_reference}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(payout.paid_at || payout.created_at)}</p></div> : referencePayoutId === payout.payout_id ? <div className="flex min-w-[300px] gap-2"><input autoFocus value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Bank / UPI transaction reference" className="h-10 flex-1 border border-separator bg-transparent px-3 text-xs outline-none" maxLength={200} /><button disabled={mutating} onClick={() => markPaid(payout)} className="inline-flex h-10 items-center gap-2 bg-accent px-4 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40">{mutating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm</button></div> : <button disabled={mutating || !["pending", "processing"].includes(payout.status)} onClick={() => { setReferencePayoutId(payout.payout_id); setPaymentReference(""); }} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest disabled:opacity-40"><Check size={14} /> Mark paid</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminControlLayout>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof CreditCard; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`inline-flex h-11 items-center gap-2 border px-4 text-xs uppercase tracking-widest ${active ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}><Icon size={15} />{label}</button>;
}
