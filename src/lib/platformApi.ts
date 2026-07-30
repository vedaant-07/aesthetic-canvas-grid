import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://se7en-fit-api.onrender.com/api").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 20_000;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  responseType?: "json" | "blob";
};

export class PlatformApiError extends Error {
  status?: number;
  code?: string;
  fields?: Record<string, string[]>;
  sessionExpired?: boolean;

  constructor(message: string, options: { status?: number; code?: string; fields?: Record<string, string[]> } = {}) {
    super(message);
    this.name = "PlatformApiError";
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields;
    this.sessionExpired = options.status === 401;
  }
}

function getMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const body = payload as { error?: unknown; message?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error.trim();
    if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  }
  return fallback;
}

function queryString(params: Record<string, unknown> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new PlatformApiError("Your session expired. Please sign in again.", { status: 401, code: "auth_required" });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/gym-owner/platform${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        "X-Client-Date": new Date().toLocaleDateString("en-CA"),
        "X-Client-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (options.responseType === "blob" && response.ok) return await response.blob() as T;
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);
    if (!response.ok) {
      const body = payload && typeof payload === "object" ? payload as { code?: string; fields?: Record<string, string[]> } : {};
      throw new PlatformApiError(getMessage(payload, `Request failed (${response.status})`), {
        status: response.status,
        code: body.code,
        fields: body.fields,
      });
    }
    return payload as T;
  } catch (error) {
    if (error instanceof PlatformApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PlatformApiError("The server is taking too long to respond. Please try again.", { code: "timeout" });
    }
    throw new PlatformApiError("Network error. The SE7EN FIT backend is not reachable.", { code: "network_error" });
  } finally {
    window.clearTimeout(timeout);
  }
}

export type PlatformGym = {
  id: string;
  gym_id: string;
  name: string;
  status: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_email?: string | null;
  description?: string | null;
  referral_code?: string | null;
  member_capacity?: number | null;
};

export type PlatformMember = {
  id: string;
  membership_id?: string;
  member_type: "app" | "manual";
  gym_id: string;
  user_id?: string | null;
  full_name: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  plan_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  membership_number?: string | null;
  joined_at?: string | null;
  created_at?: string | null;
};

export type PlatformAttendance = {
  log_id: string;
  id?: string;
  gym_id: string;
  user_id?: string | null;
  membership_id?: string | null;
  manual_member_id?: string | null;
  date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  duration_minutes?: number | null;
  status: string;
  method?: string | null;
};

export type PlatformEquipment = {
  equipment_id: string;
  id?: string;
  gym_id: string;
  name: string;
  category?: string | null;
  quantity: number;
  available: boolean;
};

export type PlatformLead = {
  lead_id: string;
  id?: string;
  gym_id: string;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  message?: string | null;
  status: string;
  created_at: string;
};

export type PlatformPayment = {
  id: string;
  gym_id: string;
  member_id?: string | null;
  member_type?: "app" | "manual" | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  paid_at: string;
  notes?: string | null;
  payment_reference?: string | null;
};

export type PlatformAnnouncement = {
  id: string;
  gym_id: string;
  title: string;
  body: string;
  audience: string;
  is_published: boolean;
  created_at: string;
};

export type PlatformCommission = {
  commission_id: string;
  gym_id: string;
  user_id: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "reversed";
  created_at: string;
};

export type PlatformPlan = {
  plan_id: string;
  gym_id: string;
  name: string;
  price: number;
  billing_cycle: string;
  duration_days?: number | null;
  features: string[];
  active: boolean;
  created_at: string;
};

export type PlatformStaff = {
  id: string;
  gym_id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  permissions: string[];
  status: string;
  created_at: string;
};

export type PlatformStaffInvitation = {
  invitation_id: string;
  gym_id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: string;
  permissions: string[];
  status: string;
  expires_at: string;
  created_at: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PlatformWorkspace = {
  gym: PlatformGym;
  access: "owner" | "staff" | "admin" | string;
  permissions: string[];
  permission_presets?: Record<string, string[]>;
  staff_profile?: PlatformStaff | null;
  members: PlatformMember[];
  app_members: PlatformMember[];
  manual_members: PlatformMember[];
  attendance: PlatformAttendance[];
  equipment: PlatformEquipment[];
  leads: PlatformLead[];
  payments: PlatformPayment[];
  announcements: PlatformAnnouncement[];
  plans: PlatformPlan[];
  staff: PlatformStaff[];
  staff_invitations: PlatformStaffInvitation[];
  commissions: PlatformCommission[];
  commission_summary: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    reversed: number;
    currency: string;
  };
  generated_at: string;
};

export const platformApi = {
  getWorkspace: () => request<PlatformWorkspace>("/workspace", { timeoutMs: 30_000 }),
  getCollection: <T>(resource: string, params: Record<string, unknown> = {}) => request<PageResult<T>>(`/collections/${encodeURIComponent(resource)}${queryString(params)}`, { timeoutMs: 30_000 }),
  updateProfile: (body: Record<string, unknown>) => request<{ item: PlatformGym }>("/profile", { method: "PATCH", body }),

  addManualMember: (body: Record<string, unknown>) => request<{ item: PlatformMember }>("/manual-members", { method: "POST", body }),
  updateManualMember: (id: string, body: Record<string, unknown>) => request<{ item: PlatformMember }>(`/manual-members/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  archiveManualMember: (id: string) => request<{ item: PlatformMember; archived: boolean }>(`/manual-members/${encodeURIComponent(id)}`, { method: "DELETE" }),
  updateMember: (kind: PlatformMember["member_type"], id: string, body: { status: string }) => request<{ item: PlatformMember }>(`/members/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  checkIn: (body: { member_type: PlatformMember["member_type"]; member_id: string; method: string; date?: string }) => request<{ item: PlatformAttendance }>("/attendance/check-in", { method: "POST", body }),
  checkOut: (id: string) => request<{ item: PlatformAttendance }>(`/attendance/${encodeURIComponent(id)}/check-out`, { method: "PATCH" }),
  updateAttendance: (id: string, body: Record<string, unknown>) => request<{ item: PlatformAttendance }>(`/attendance/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteAttendance: (id: string) => request<{ success: boolean }>(`/attendance/${encodeURIComponent(id)}`, { method: "DELETE" }),

  addEquipment: (body: Record<string, unknown>) => request<{ item: PlatformEquipment }>("/equipment", { method: "POST", body }),
  updateEquipment: (id: string, body: Record<string, unknown>) => request<{ item: PlatformEquipment }>(`/equipment/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteEquipment: (id: string) => request<{ success: boolean }>(`/equipment/${encodeURIComponent(id)}`, { method: "DELETE" }),

  addLead: (body: Record<string, unknown>) => request<{ item: PlatformLead }>("/leads", { method: "POST", body }),
  updateLead: (id: string, body: Record<string, unknown>) => request<{ item: PlatformLead }>(`/leads/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteLead: (id: string) => request<{ success: boolean }>(`/leads/${encodeURIComponent(id)}`, { method: "DELETE" }),

  addPayment: (body: Record<string, unknown>) => request<{ item: PlatformPayment }>("/payments", { method: "POST", body }),
  updatePayment: (id: string, body: Record<string, unknown>) => request<{ item: PlatformPayment }>(`/payments/${encodeURIComponent(id)}`, { method: "PATCH", body }),

  addAnnouncement: (body: Record<string, unknown>) => request<{ item: PlatformAnnouncement }>("/announcements", { method: "POST", body }),
  updateAnnouncement: (id: string, body: Record<string, unknown>) => request<{ item: PlatformAnnouncement }>(`/announcements/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteAnnouncement: (id: string) => request<{ success: boolean }>(`/announcements/${encodeURIComponent(id)}`, { method: "DELETE" }),

  addPlan: (body: Record<string, unknown>) => request<{ item: PlatformPlan }>("/plans", { method: "POST", body }),
  updatePlan: (id: string, body: Record<string, unknown>) => request<{ item: PlatformPlan }>(`/plans/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  archivePlan: (id: string) => request<{ item: PlatformPlan; archived: boolean }>(`/plans/${encodeURIComponent(id)}`, { method: "DELETE" }),

  inviteStaff: (body: Record<string, unknown>) => request<{ item: PlatformStaffInvitation; delivery: string; invitation_url?: string | null; invitation_path?: string; configuration_required?: boolean }>("/staff/invitations", { method: "POST", body }),
  revokeStaffInvitation: (id: string) => request<{ success: boolean }>(`/staff/invitations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  acceptStaffInvitation: (token: string) => request<{ item: PlatformStaff; accepted: boolean }>("/staff/invitations/accept", { method: "POST", body: { token } }),
  updateStaff: (id: string, body: Record<string, unknown>) => request<{ item: PlatformStaff }>(`/staff/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  removeStaff: (id: string) => request<{ item: PlatformStaff; removed: boolean }>(`/staff/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getCommissions: () => request<{ items: PlatformCommission[]; summary: PlatformWorkspace["commission_summary"] }>("/commissions"),
  exportCsv: (resource: string, params: Record<string, unknown> = {}) => request<Blob>(`/export/${encodeURIComponent(resource)}${queryString(params)}`, { responseType: "blob", timeoutMs: 60_000 }),
};
