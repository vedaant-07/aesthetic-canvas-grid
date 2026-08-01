import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeIndianRupee,
  Check,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminMetricCard, AdminSectionHeader, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, formatMoney } from "@/admin/adminApi";
import {
  billingAdminApi,
  type BillingAdjustment,
  type BillingCommission,
  type BillingOverview,
  type BillingPayment,
  type BillingPayout,
  type BillingPlan,
} from "@/admin/billingAdminApi";

type ViewMode = "overview" | "plans" | "payments" | "commissions" | "payouts";

type PlanDraft = {
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: string;
};

type ReconcileDraft = {
  paymentId: string;
  status: "refunded" | "partially_refunded" | "chargeback" | "cancelled" | "reversed";
  refundedAmount: string;
  note: string;
};

const PAGE_SIZE = 50;
const paymentStatuses = ["all", "pending", "success", "paid", "captured", "failed", "refunded", "partially_refunded", "chargeback", "cancelled", "reversed"];
const commissionStatuses = ["all", "pending", "approved", "paid", "reversed"];
const payoutStatuses = ["all", "pending", "processing", "paid", "failed", "cancelled"];

function emptyPlanDraft(plan: BillingPlan): PlanDraft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: String(Number(plan.price_minor || 0) / 100),
    is_active: plan.is_active,
    is_public: plan.is_public,
    sort_order: String(plan.sort_order ?? 100),
  };
}

function statusOptions(mode: ViewMode) {
  if (mode === "payments") return paymentStatuses;
  if (mode === "commissions") return commissionStatuses;
  if (mode === "payouts") return payoutStatuses;
  return [];
}

function paymentIsSuccessful(status: string) {
  return ["success", "paid", "captured", "succeeded", "completed"].includes(status.toLowerCase());
}

function paymentNet(payment: BillingPayment) {
  return Math.max(0, Number(payment.amount || 0) - Number(payment.refunded_amount || 0));
}

function planInterval(plan: BillingPlan) {
  if (plan.interval_unit === "one_time") return plan.trial_days ? `${plan.trial_days} days` : "included";
  return `${plan.interval_count > 1 ? `${plan.interval_count} ` : ""}${plan.interval_unit}${plan.interval_count > 1 ? "s" : ""}`;
}

function displayUser(payment: BillingPayment) {
  return payment.user?.full_name || payment.user?.email || payment.user_id || "Unknown member";
}

function displayCommissionUser(row: BillingCommission) {
  return row.user?.full_name || row.user?.email || row.user_id;
}

function displayGym(value: { gym?: { name?: string | null } | null; gym_id: string }) {
  return value.gym?.name || value.gym_id;
}

export default function AdminPayments() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>("overview");
  const [overview, setOverview] = useState<BillingOverview["summary"] | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [commissions, setCommissions] = useState<BillingCommission[]>([]);
  const [adjustments, setAdjustments] = useState<BillingAdjustment[]>([]);
  const [payouts, setPayouts] = useState<BillingPayout[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [reconcileDraft, setReconcileDraft] = useState<ReconcileDraft | null>(null);
  const [payoutReferenceId, setPayoutReferenceId] = useState<string | null>(null);
  const [payoutReference, setPayoutReference] = useState("");

  const handleError = useCallback((requestError: unknown, fallback: string) => {
    if (requestError instanceof AdminApiError && requestError.sessionExpired) {
      navigate("/x7-control/login", { replace: true });
      return;
    }
    setError(requestError instanceof Error ? requestError.message : fallback);
  }, [navigate]);

  const loadOverview = useCallback(async () => {
    const response = await billingAdminApi.overview();
    setOverview(response.summary);
  }, []);

  const load = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      await loadOverview();
      if (mode === "plans") {
        const response = await billingAdminApi.plans();
        setPlans(response.plans ?? []);
        setTotalPages(1);
      } else if (mode === "payments") {
        const response = await billingAdminApi.payments({ page, page_size: PAGE_SIZE, status, search: search.trim() || undefined });
        setPayments(response.items ?? []);
        setTotalPages(response.total_pages || 1);
      } else if (mode === "commissions") {
        const response = await billingAdminApi.commissions({ page, page_size: PAGE_SIZE, status, search: search.trim() || undefined });
        setCommissions(response.items ?? []);
        setAdjustments(response.adjustments ?? []);
        setTotalPages(response.total_pages || 1);
      } else if (mode === "payouts") {
        const response = await billingAdminApi.payouts({ page, page_size: PAGE_SIZE, status, search: search.trim() || undefined });
        setPayouts(response.items ?? []);
        setTotalPages(response.total_pages || 1);
      } else {
        setTotalPages(1);
      }
      setSelected(new Set());
    } catch (requestError) {
      handleError(requestError, "Could not load billing operations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError, loadOverview, mode, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchMode = (next: ViewMode) => {
    setMode(next);
    setStatus("all");
    setSearch("");
    setPage(1);
    setSelected(new Set());
    setError(null);
  };

  const mutate = async (operation: () => Promise<unknown>, success?: string) => {
    setMutating(true);
    setError(null);
    try {
      await operation();
      if (success) window.dispatchEvent(new CustomEvent("se7enfit-admin-notice", { detail: success }));
      await load({ background: true });
      return true;
    } catch (requestError) {
      handleError(requestError, "The billing action could not be completed.");
      return false;
    } finally {
      setMutating(false);
    }
  };

  const selectedRows = useMemo(
    () => commissions.filter((row) => selected.has(row.commission_id)),
    [commissions, selected],
  );
  const selectedPending = selectedRows.filter((row) => row.status === "pending" && row.available);
  const selectedApproved = selectedRows.filter((row) => row.status === "approved" && !row.payout_reference);
  const selectedGymIds = [...new Set(selectedApproved.map((row) => row.gym_id))];
  const selectedCurrencies = [...new Set(selectedApproved.map((row) => row.currency))];
  const payoutSelectionValid = selectedApproved.length > 0
    && selectedApproved.length === selectedRows.length
    && selectedGymIds.length === 1
    && selectedCurrencies.length === 1;
  const selectedTotal = selectedRows.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);
  const selectedGymAdjustments = payoutSelectionValid
    ? adjustments.filter((row) => row.gym_id === selectedGymIds[0] && row.status === "pending" && row.currency === selectedCurrencies[0])
    : [];
  const adjustmentTotal = selectedGymAdjustments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payoutNet = selectedTotal + adjustmentTotal;

  const toggleSelection = (commissionId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(commissionId)) next.delete(commissionId);
      else next.add(commissionId);
      return next;
    });
  };

  const approveSelected = () => {
    if (!selectedRows.length || selectedPending.length !== selectedRows.length) {
      setError("Select only pending commission rows whose hold period has finished.");
      return;
    }
    void mutate(() => billingAdminApi.approveCommissions(selectedPending.map((row) => row.commission_id)));
  };

  const createPayout = () => {
    if (!payoutSelectionValid) {
      setError("Select approved, unpaid commission rows from one gym and one currency.");
      return;
    }
    if (payoutNet <= 0) {
      setError("The gym's refund adjustments reduce this payout to zero or below.");
      return;
    }
    const gymName = displayGym(selectedApproved[0]);
    if (!window.confirm(`Create a net payout of ${formatMoney(payoutNet, selectedCurrencies[0])} for ${gymName}?`)) return;
    void mutate(() => billingAdminApi.createPayout({
      gym_id: selectedGymIds[0],
      commission_ids: selectedApproved.map((row) => row.commission_id),
      notes: "Created from the SE7EN FIT Phase 4 commission ledger",
    }));
  };

  const openPlanEditor = (plan: BillingPlan) => {
    setEditingPlan(plan);
    setPlanDraft(emptyPlanDraft(plan));
  };

  const savePlan = () => {
    if (!editingPlan || !planDraft) return;
    const price = Number(planDraft.price);
    const sortOrder = Number(planDraft.sort_order);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(sortOrder) || sortOrder < 0) {
      setError("Enter a valid non-negative price and sort order.");
      return;
    }
    void mutate(async () => {
      await billingAdminApi.updatePlan(editingPlan.plan_code, {
        name: planDraft.name.trim(),
        description: planDraft.description.trim() || null,
        price_minor: Math.round(price * 100),
        is_active: planDraft.is_active,
        is_public: planDraft.is_public,
        sort_order: Math.round(sortOrder),
      });
      setEditingPlan(null);
      setPlanDraft(null);
    });
  };

  const submitReconciliation = () => {
    if (!reconcileDraft) return;
    const amount = reconcileDraft.refundedAmount === "" ? undefined : Number(reconcileDraft.refundedAmount);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (reconcileDraft.note.trim().length < 3) {
      setError("Add a reconciliation note for the audit log.");
      return;
    }
    void mutate(async () => {
      await billingAdminApi.reconcilePayment(reconcileDraft.paymentId, {
        status: reconcileDraft.status,
        refunded_amount: amount,
        note: reconcileDraft.note.trim(),
      });
      setReconcileDraft(null);
    });
  };

  const updatePayoutState = (payout: BillingPayout, action: "processing" | "failed" | "cancelled") => {
    const notes = action === "processing"
      ? window.prompt("Optional processing note:", payout.notes || "")
      : window.prompt(`Reason for marking this payout ${action}:`, "");
    if (notes === null) return;
    if (action !== "processing" && notes.trim().length < 3) {
      setError("A reason is required when releasing a failed or cancelled payout.");
      return;
    }
    void mutate(() => billingAdminApi.updatePayout(payout.payout_id, { action, notes: notes.trim() || undefined }));
  };

  const markPayoutPaid = (payout: BillingPayout) => {
    const reference = payoutReference.trim();
    if (reference.length < 3) {
      setError("Enter the bank, UPI or payout transaction reference.");
      return;
    }
    void mutate(async () => {
      await billingAdminApi.updatePayout(payout.payout_id, { action: "paid", payment_reference: reference });
      setPayoutReferenceId(null);
      setPayoutReference("");
    });
  };

  const paymentPageRevenue = payments.filter((row) => paymentIsSuccessful(row.status)).reduce((sum, row) => sum + paymentNet(row), 0);
  const commissionPageTotal = commissions.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0);
  const payoutPageTotal = payouts.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="monetization control"
        title="Subscriptions, commission & payouts"
        body="One server-controlled catalogue, immutable gym attribution, 20% commission after the hold period, refund clawbacks and auditable payout batches."
        actions={(
          <button
            type="button"
            onClick={() => void load({ background: true })}
            disabled={refreshing || mutating}
            className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-40"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        )}
      />

      <div className={`mb-6 border p-4 ${overview?.checkout_enabled ? "border-accent/35 bg-accent/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <div className="flex items-start gap-3">
          {overview?.checkout_enabled ? <ShieldCheck className="mt-0.5 text-accent" size={18} /> : <AlertTriangle className="mt-0.5 text-yellow-300" size={18} />}
          <div>
            <p className="text-sm font-medium">{overview?.checkout_enabled ? "Secure checkout enabled" : "Checkout safely disabled"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {overview?.checkout_enabled
                ? "Paid plans activate only after backend payment verification."
                : "Razorpay is not active. The app cannot create fake payments or activate paid plans from the frontend."}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <ModeButton active={mode === "overview"} icon={CircleDollarSign} label="Overview" onClick={() => switchMode("overview")} />
        <ModeButton active={mode === "plans"} icon={SlidersHorizontal} label="Plans" onClick={() => switchMode("plans")} />
        <ModeButton active={mode === "payments"} icon={CreditCard} label="Payments" onClick={() => switchMode("payments")} />
        <ModeButton active={mode === "commissions"} icon={HandCoins} label="Commission" onClick={() => switchMode("commissions")} />
        <ModeButton active={mode === "payouts"} icon={WalletCards} label="Payouts" onClick={() => switchMode("payouts")} />
      </div>

      {error && <div className="mb-6"><AdminErrorState message={error} onRetry={() => void load()} /></div>}

      {loading ? (
        <AdminLoadingState label="Loading canonical billing records…" />
      ) : (
        <>
          {mode === "overview" && overview && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard icon={BadgeIndianRupee} label="Net verified revenue" value={formatMoney(overview.net_revenue, overview.currency)} />
                <AdminMetricCard icon={CreditCard} label="Active subscriptions" value={overview.active_subscriptions} />
                <AdminMetricCard icon={HandCoins} label="Pending commission" value={formatMoney(overview.pending_commission, overview.currency)} />
                <AdminMetricCard icon={WalletCards} label="Paid payouts" value={formatMoney(overview.paid_payouts, overview.currency)} />
              </div>
              <div className="grid gap-px border border-separator bg-separator md:grid-cols-3">
                <SummaryBlock label="Published plan records" value={String(overview.plan_count)} />
                <SummaryBlock label="Approved commission" value={formatMoney(overview.approved_commission, overview.currency)} />
                <SummaryBlock label="Outstanding clawbacks" value={formatMoney(overview.outstanding_adjustments, overview.currency)} />
                <SummaryBlock label="Paid commission" value={formatMoney(overview.paid_commission, overview.currency)} />
                <SummaryBlock label="Pending payout batches" value={formatMoney(overview.pending_payouts, overview.currency)} />
                <SummaryBlock label="Checkout state" value={overview.checkout_enabled ? "Enabled" : "Disabled"} />
              </div>
              <div className="border border-separator bg-hover-bg/20 p-6">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Phase 4 controls</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <ControlRow title="Canonical plan catalogue" body="Prices and entitlement limits are loaded from the shared database, not duplicated frontend constants." />
                  <ControlRow title="Immutable gym attribution" body="After a qualifying paid conversion, the member's gym cannot be silently changed or deleted." />
                  <ControlRow title="Refund-aware commission" body="Partial refunds recalculate unpaid commission; post-payout refunds create negative adjustments." />
                  <ControlRow title="Auditable payout batches" body="Only approved rows from one gym and currency can enter a payout, with a required settlement reference." />
                </div>
              </div>
            </div>
          )}

          {mode === "plans" && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {plans.map((plan) => (
                  <article key={plan.plan_code} className="border border-separator bg-background p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{plan.name}</h2>
                          <StatusBadge status={plan.is_active ? "active" : "inactive"} />
                          <span className="border border-separator px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{plan.is_public ? "public" : "hidden"}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description || "No description"}</p>
                      </div>
                      <button type="button" onClick={() => openPlanEditor(plan)} className="flex h-10 w-10 shrink-0 items-center justify-center border border-separator hover:bg-hover-bg"><Pencil size={15} /></button>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-separator pt-4">
                      <div>
                        <p className="font-display text-3xl font-bold">{formatMoney(plan.price, plan.currency)}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">per {planInterval(plan)}</p>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground">{plan.plan_code}</p>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {plan.entitlements.filter((item) => item.enabled).map((item) => (
                        <div key={item.feature_code} className="flex items-center gap-2 border border-separator bg-hover-bg/20 px-3 py-2 text-xs">
                          <Check size={12} className="shrink-0 text-accent" />
                          <span className="truncate">{item.feature_code.replace(/_/g, " ")}{item.quota == null ? " · unlimited" : ` · ${item.quota}/${item.quota_period || "period"}`}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              {!plans.length && <AdminEmptyState title="No subscription plans" body="Apply the Phase 4 billing migration before publishing plans." />}
            </div>
          )}

          {(mode === "payments" || mode === "commissions" || mode === "payouts") && (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {mode === "payments" && (
                  <>
                    <AdminMetricCard icon={BadgeIndianRupee} label="Page net revenue" value={formatMoney(paymentPageRevenue, payments[0]?.currency || "INR")} />
                    <AdminMetricCard icon={CreditCard} label="Rows on page" value={payments.length} />
                    <AdminMetricCard icon={Check} label="Successful" value={payments.filter((row) => paymentIsSuccessful(row.status)).length} />
                    <AdminMetricCard icon={AlertTriangle} label="Refund / dispute" value={payments.filter((row) => Number(row.refunded_amount || 0) > 0 || ["chargeback", "refunded", "reversed"].includes(row.status)).length} />
                  </>
                )}
                {mode === "commissions" && (
                  <>
                    <AdminMetricCard icon={HandCoins} label="Page commission" value={formatMoney(commissionPageTotal, commissions[0]?.currency || "INR")} />
                    <AdminMetricCard icon={Check} label="Available to approve" value={commissions.filter((row) => row.available).length} />
                    <AdminMetricCard icon={WalletCards} label="Approved unpaid" value={commissions.filter((row) => row.status === "approved" && !row.payout_reference).length} />
                    <AdminMetricCard icon={AlertTriangle} label="Pending adjustments" value={adjustments.filter((row) => row.status === "pending").length} />
                  </>
                )}
                {mode === "payouts" && (
                  <>
                    <AdminMetricCard icon={WalletCards} label="Page payout total" value={formatMoney(payoutPageTotal, payouts[0]?.currency || "INR")} />
                    <AdminMetricCard icon={Loader2} label="Pending / processing" value={payouts.filter((row) => ["pending", "processing"].includes(row.status)).length} />
                    <AdminMetricCard icon={Check} label="Paid" value={payouts.filter((row) => row.status === "paid").length} />
                    <AdminMetricCard icon={X} label="Released" value={payouts.filter((row) => ["failed", "cancelled"].includes(row.status)).length} />
                  </>
                )}
              </div>

              <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
                <form onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3">
                  <Search size={16} className="text-muted-foreground" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member, gym, provider or reference…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                </form>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {statusOptions(mode).map((value) => (
                    <button key={value} type="button" onClick={() => { setStatus(value); setPage(1); }} className={`whitespace-nowrap border px-3 py-2 text-[10px] uppercase tracking-widest ${status === value ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>{value.replace(/_/g, " ")}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "payments" && (
            payments.length ? (
              <div className="overflow-x-auto border border-separator">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-separator bg-hover-bg/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr><th className="p-4">Member</th><th className="p-4">Gym</th><th className="p-4">Provider</th><th className="p-4">Gross / net</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-separator">
                    {payments.map((payment) => (
                      <tr key={payment.payment_id}>
                        <td className="p-4"><p className="font-medium">{displayUser(payment)}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{payment.payment_id}</p></td>
                        <td className="p-4 text-xs text-muted-foreground">{payment.gym?.name || payment.gym_id || "Direct"}</td>
                        <td className="p-4"><p>{payment.provider || "—"}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{payment.provider_payment_id || payment.provider_order_id || "No provider reference"}</p></td>
                        <td className="p-4"><p className="font-mono font-medium">{formatMoney(payment.amount, payment.currency)}</p><p className="mt-1 text-[10px] text-muted-foreground">Net {formatMoney(paymentNet(payment), payment.currency)}</p></td>
                        <td className="p-4"><StatusBadge status={payment.status} /></td>
                        <td className="p-4 text-xs text-muted-foreground">{formatDateTime(payment.created_at)}</td>
                        <td className="p-4 text-right"><button type="button" disabled={mutating || ["chargeback", "refunded", "reversed", "cancelled"].includes(payment.status)} onClick={() => setReconcileDraft({ paymentId: payment.payment_id, status: "refunded", refundedAmount: String(payment.amount), note: "" })} className="border border-separator px-3 py-2 text-[10px] uppercase tracking-widest disabled:opacity-35">Reconcile</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <AdminEmptyState title="No payments found" body="Verified provider payments will appear here after secure checkout is enabled." />
          )}

          {mode === "commissions" && (
            <div className="space-y-5">
              {selected.size > 0 && (
                <div className="flex flex-col gap-4 border border-accent/30 bg-accent/5 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-accent">{selected.size} commission rows selected</p>
                    <p className="mt-1 font-mono text-lg font-bold">Gross commission {formatMoney(selectedTotal, selectedCurrencies[0] || "INR")}</p>
                    {adjustmentTotal < 0 && <p className="mt-1 text-xs text-red-300">Clawback adjustments {formatMoney(adjustmentTotal, selectedCurrencies[0] || "INR")} · Net payout {formatMoney(payoutNet, selectedCurrencies[0] || "INR")}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={mutating || selectedPending.length !== selectedRows.length} onClick={approveSelected} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest disabled:opacity-40"><Check size={14} /> Approve available</button>
                    <button type="button" disabled={mutating || !payoutSelectionValid || payoutNet <= 0} onClick={createPayout} className="inline-flex h-10 items-center gap-2 bg-accent px-4 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40"><WalletCards size={14} /> Create net payout</button>
                  </div>
                </div>
              )}

              {commissions.length ? (
                <div className="overflow-x-auto border border-separator">
                  <table className="w-full min-w-[1020px] text-left text-sm">
                    <thead className="border-b border-separator bg-hover-bg/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <tr><th className="w-12 p-4">Select</th><th className="p-4">Gym / member</th><th className="p-4">Gross</th><th className="p-4">Rate</th><th className="p-4">Commission</th><th className="p-4">Status</th><th className="p-4">Available</th><th className="p-4">Payout ref</th></tr>
                    </thead>
                    <tbody className="divide-y divide-separator">
                      {commissions.map((row) => (
                        <tr key={row.commission_id}>
                          <td className="p-4"><input type="checkbox" aria-label={`Select commission ${row.commission_id}`} checked={selected.has(row.commission_id)} disabled={!["pending", "approved"].includes(row.status) || Boolean(row.payout_reference)} onChange={() => toggleSelection(row.commission_id)} className="h-4 w-4 accent-[hsl(var(--accent))]" /></td>
                          <td className="p-4"><p className="font-medium">{displayGym(row)}</p><p className="mt-1 text-xs text-muted-foreground">{displayCommissionUser(row)}</p></td>
                          <td className="p-4 font-mono">{formatMoney(row.gross_amount, row.currency)}</td>
                          <td className="p-4 font-mono">{Math.round(Number(row.commission_rate) * 100)}%</td>
                          <td className="p-4 font-mono font-bold text-accent">{formatMoney(row.commission_amount, row.currency)}</td>
                          <td className="p-4"><StatusBadge status={row.status} /></td>
                          <td className="p-4 text-xs text-muted-foreground">{row.available ? "Ready" : formatDateTime(row.available_at)}</td>
                          <td className="p-4 font-mono text-[10px] text-muted-foreground">{row.payout_reference || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <AdminEmptyState title="No commission rows" body="A 20% row is created only for a successful payment from an attributed gym member." />}

              {adjustments.length > 0 && (
                <div className="border border-red-500/25 bg-red-500/5 p-5">
                  <h2 className="font-display text-xl font-semibold">Refund and chargeback adjustments</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Negative rows are automatically netted from the gym's next payout after a commission has already been paid.</p>
                  <div className="mt-4 space-y-2">
                    {adjustments.slice(0, 30).map((row) => (
                      <div key={row.adjustment_id} className="flex flex-col gap-2 border border-red-500/20 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-sm font-medium">{row.reason}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.gym_id} · {formatDateTime(row.created_at)}</p></div>
                        <div className="flex items-center gap-3"><span className="font-mono font-bold text-red-300">{formatMoney(row.amount, row.currency)}</span><StatusBadge status={row.status} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "payouts" && (
            payouts.length ? (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <article key={payout.payout_id} className="border border-separator bg-background p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-semibold">{displayGym(payout)}</h2><StatusBadge status={payout.status} /></div>
                        <p className="mt-2 font-mono text-[10px] text-muted-foreground">{payout.payout_id}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Period {payout.period_start || "—"} to {payout.period_end || "—"} · Created {formatDateTime(payout.created_at)}</p>
                        {payout.notes && <p className="mt-2 text-xs text-foreground/70">{payout.notes}</p>}
                      </div>
                      <div className="text-left lg:text-right"><p className="font-display text-4xl font-bold">{formatMoney(payout.amount, payout.currency)}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{payout.payment_reference || "No settlement reference"}</p></div>
                    </div>
                    {["pending", "processing"].includes(payout.status) && (
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-separator pt-4">
                        {payout.status === "pending" && <button type="button" disabled={mutating} onClick={() => updatePayoutState(payout, "processing")} className="border border-separator px-4 py-2 text-[10px] uppercase tracking-widest disabled:opacity-40">Start processing</button>}
                        <button type="button" disabled={mutating} onClick={() => { setPayoutReferenceId(payout.payout_id); setPayoutReference(""); }} className="bg-accent px-4 py-2 text-[10px] uppercase tracking-widest text-accent-foreground disabled:opacity-40">Mark paid</button>
                        <button type="button" disabled={mutating} onClick={() => updatePayoutState(payout, "failed")} className="border border-red-500/30 px-4 py-2 text-[10px] uppercase tracking-widest text-red-300 disabled:opacity-40">Failed</button>
                        <button type="button" disabled={mutating} onClick={() => updatePayoutState(payout, "cancelled")} className="border border-separator px-4 py-2 text-[10px] uppercase tracking-widest disabled:opacity-40">Cancel</button>
                      </div>
                    )}
                    {payoutReferenceId === payout.payout_id && (
                      <div className="mt-4 flex flex-col gap-2 border border-accent/30 bg-accent/5 p-4 sm:flex-row">
                        <input value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} placeholder="Bank / UPI transaction reference" className="h-11 min-w-0 flex-1 border border-separator bg-background px-3 text-sm outline-none focus:border-accent" />
                        <button type="button" disabled={mutating} onClick={() => markPayoutPaid(payout)} className="h-11 bg-accent px-5 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40">Confirm paid</button>
                        <button type="button" onClick={() => setPayoutReferenceId(null)} className="h-11 border border-separator px-4 text-xs uppercase tracking-widest">Close</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <AdminEmptyState title="No payout batches" body="Approve eligible commission rows, then create a net payout for one gym and currency." />
          )}

          {["payments", "commissions", "payouts"].includes(mode) && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border border-separator bg-background px-4 py-3">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-separator px-4 py-2 text-[10px] uppercase tracking-widest disabled:opacity-35">Previous</button>
              <p className="font-mono text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="border border-separator px-4 py-2 text-[10px] uppercase tracking-widest disabled:opacity-35">Next</button>
            </div>
          )}
        </>
      )}

      {editingPlan && planDraft && (
        <Modal title={`Edit ${editingPlan.name}`} onClose={() => { setEditingPlan(null); setPlanDraft(null); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan name"><input value={planDraft.name} onChange={(event) => setPlanDraft((current) => current ? { ...current, name: event.target.value } : current)} className="admin-field" maxLength={120} /></Field>
            <Field label="Price (INR)"><input type="number" min="0" step="0.01" value={planDraft.price} onChange={(event) => setPlanDraft((current) => current ? { ...current, price: event.target.value } : current)} className="admin-field" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea value={planDraft.description} onChange={(event) => setPlanDraft((current) => current ? { ...current, description: event.target.value } : current)} className="admin-field min-h-24" maxLength={500} /></Field></div>
            <Field label="Sort order"><input type="number" min="0" value={planDraft.sort_order} onChange={(event) => setPlanDraft((current) => current ? { ...current, sort_order: event.target.value } : current)} className="admin-field" /></Field>
            <div className="grid gap-2 pt-6">
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={planDraft.is_active} onChange={(event) => setPlanDraft((current) => current ? { ...current, is_active: event.target.checked } : current)} /> Active</label>
              <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={planDraft.is_public} onChange={(event) => setPlanDraft((current) => current ? { ...current, is_public: event.target.checked } : current)} /> Visible to members</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { setEditingPlan(null); setPlanDraft(null); }} className="border border-separator px-5 py-3 text-xs uppercase tracking-widest">Cancel</button><button type="button" disabled={mutating} onClick={savePlan} className="inline-flex items-center gap-2 bg-accent px-5 py-3 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40">{mutating && <Loader2 size={14} className="animate-spin" />} Save plan</button></div>
        </Modal>
      )}

      {reconcileDraft && (
        <Modal title="Reconcile payment" onClose={() => setReconcileDraft(null)}>
          <div className="space-y-4">
            <Field label="Result"><select value={reconcileDraft.status} onChange={(event) => setReconcileDraft((current) => current ? { ...current, status: event.target.value as ReconcileDraft["status"] } : current)} className="admin-field"><option value="refunded">Full refund</option><option value="partially_refunded">Partial refund</option><option value="chargeback">Chargeback</option><option value="cancelled">Cancelled</option><option value="reversed">Reversed</option></select></Field>
            <Field label="Refunded amount (INR)"><input type="number" min="0" step="0.01" value={reconcileDraft.refundedAmount} onChange={(event) => setReconcileDraft((current) => current ? { ...current, refundedAmount: event.target.value } : current)} className="admin-field" /></Field>
            <Field label="Audit note"><textarea value={reconcileDraft.note} onChange={(event) => setReconcileDraft((current) => current ? { ...current, note: event.target.value } : current)} className="admin-field min-h-28" maxLength={1000} placeholder="Provider confirmation, ticket or reason" /></Field>
            <div className="border border-yellow-500/25 bg-yellow-500/5 p-3 text-xs leading-relaxed text-muted-foreground">This action recalculates unpaid gym commission. If commission was already paid, a negative adjustment is created for the next payout.</div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setReconcileDraft(null)} className="border border-separator px-5 py-3 text-xs uppercase tracking-widest">Cancel</button><button type="button" disabled={mutating} onClick={submitReconciliation} className="inline-flex items-center gap-2 bg-accent px-5 py-3 text-xs uppercase tracking-widest text-accent-foreground disabled:opacity-40">{mutating && <Loader2 size={14} className="animate-spin" />} Apply reconciliation</button></div>
        </Modal>
      )}

      <style>{`.admin-field{width:100%;border:1px solid hsl(var(--separator));background:hsl(var(--background));padding:.75rem;font-size:.875rem;outline:none}.admin-field:focus{border-color:hsl(var(--accent))}`}</style>
    </AdminControlLayout>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof CreditCard; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex h-11 items-center gap-2 border px-4 text-xs uppercase tracking-widest ${active ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:bg-hover-bg hover:text-foreground"}`}><Icon size={15} /> {label}</button>;
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return <div className="bg-background p-5"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-semibold">{value}</p></div>;
}

function ControlRow({ title, body }: { title: string; body: string }) {
  return <div className="border border-separator bg-background p-4"><div className="flex gap-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent" /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>{children}</label>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-separator bg-background p-5 shadow-2xl md:p-7">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center border border-separator"><X size={17} /></button></div>
        {children}
      </div>
    </div>
  );
}
