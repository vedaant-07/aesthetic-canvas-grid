import { clearAdmin } from "@/admin/AdminShell";
import { AdminApiError, requireBrowserAdminSession } from "@/admin/adminApi";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://se7en-fit-api.onrender.com/api").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 20_000;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
};

function queryString(values?: RequestOptions["query"]) {
  const query = new URLSearchParams();
  Object.entries(values ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

function errorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const body = payload as { error?: unknown; message?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error.trim();
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  }
  return fallback;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { adminSession, authSession } = await requireBrowserAdminSession();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}${queryString(options.query)}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${authSession.access_token}`,
        "x-admin-session": adminSession,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
      const body = payload && typeof payload === "object"
        ? payload as { code?: string; fields?: Record<string, string[]> }
        : {};
      const sessionExpired = response.status === 401 || body.code === "admin_session_required" || body.code === "session_expired";
      if (sessionExpired) clearAdmin();
      const error = new AdminApiError(errorMessage(payload, `Billing request failed (${response.status})`), {
        code: body.code,
        sessionExpired,
      });
      (error as AdminApiError & { fields?: Record<string, string[]> }).fields = body.fields;
      throw error;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AdminApiError("The billing service is taking too long to respond.", { code: "timeout" });
    }
    throw new AdminApiError("The SE7EN FIT billing backend is not reachable.", { code: "network_error" });
  } finally {
    window.clearTimeout(timeout);
  }
}

export type PageResponse<T> = {
  ok: boolean;
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type BillingOverview = {
  ok: boolean;
  summary: {
    plan_count: number;
    active_subscriptions: number;
    net_revenue: number;
    pending_commission: number;
    approved_commission: number;
    paid_commission: number;
    outstanding_adjustments: number;
    pending_payouts: number;
    paid_payouts: number;
    currency: string;
    checkout_enabled: boolean;
  };
};

export type BillingEntitlement = {
  plan_code: string;
  feature_code: string;
  enabled: boolean;
  quota?: number | null;
  quota_period?: string | null;
};

export type BillingPlan = {
  plan_code: string;
  name: string;
  description?: string | null;
  price_minor: number;
  price: number;
  currency: string;
  interval_unit: string;
  interval_count: number;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  metadata?: Record<string, unknown>;
  entitlements: BillingEntitlement[];
};

export type BillingPayment = {
  payment_id: string;
  user_id?: string | null;
  gym_id?: string | null;
  subscription_id?: string | null;
  provider?: string | null;
  provider_payment_id?: string | null;
  provider_order_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  refunded_amount?: number;
  captured_at?: string | null;
  refunded_at?: string | null;
  created_at: string;
  user?: { user_id: string; email?: string | null; full_name?: string | null } | null;
  gym?: { gym_id: string; name?: string | null } | null;
};

export type BillingCommission = {
  commission_id: string;
  gym_id: string;
  user_id: string;
  payment_id: string;
  subscription_id?: string | null;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: string;
  available: boolean;
  available_at?: string | null;
  payout_reference?: string | null;
  created_at: string;
  gym?: { gym_id: string; name?: string | null; owner_user_id?: string | null } | null;
  user?: { user_id: string; email?: string | null; full_name?: string | null } | null;
};

export type BillingAdjustment = {
  adjustment_id: string;
  gym_id: string;
  payment_id: string;
  commission_id?: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  created_at: string;
};

export type BillingPayout = {
  payout_id: string;
  gym_id: string;
  amount: number;
  currency: string;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at: string;
  paid_at?: string | null;
  metadata?: Record<string, unknown>;
  gym?: { gym_id: string; name?: string | null; owner_user_id?: string | null } | null;
};

export const billingAdminApi = {
  overview: () => request<BillingOverview>("/admin/billing/overview", { timeoutMs: 30_000 }),
  plans: () => request<{ ok: boolean; plans: BillingPlan[] }>("/admin/billing/plans"),
  updatePlan: (planCode: string, body: Record<string, unknown>) => request<{ ok: boolean; plan: BillingPlan }>(`/admin/billing/plans/${encodeURIComponent(planCode)}`, { method: "PATCH", body }),
  payments: (query: Record<string, string | number | undefined>) => request<PageResponse<BillingPayment>>("/admin/billing/payments", { query, timeoutMs: 30_000 }),
  reconcilePayment: (paymentId: string, body: Record<string, unknown>) => request<{ ok: boolean; payment: BillingPayment }>(`/admin/billing/payments/${encodeURIComponent(paymentId)}`, { method: "PATCH", body }),
  commissions: (query: Record<string, string | number | undefined>) => request<PageResponse<BillingCommission> & { adjustments: BillingAdjustment[] }>("/admin/billing/commissions", { query, timeoutMs: 30_000 }),
  approveCommissions: (commissionIds: string[]) => request("/admin/billing/commissions/approve", { method: "POST", body: { commission_ids: commissionIds } }),
  payouts: (query: Record<string, string | number | undefined>) => request<PageResponse<BillingPayout>>("/admin/billing/payouts", { query, timeoutMs: 30_000 }),
  createPayout: (body: { gym_id: string; commission_ids: string[]; notes?: string }) => request("/admin/billing/payouts", { method: "POST", body }),
  updatePayout: (payoutId: string, body: Record<string, unknown>) => request(`/admin/billing/payouts/${encodeURIComponent(payoutId)}`, { method: "PATCH", body }),
};
