import { supabase } from "@/integrations/supabase/client";
import { ADMIN_KEYS, clearAdmin, getAdminToken } from "@/admin/AdminShell";

export class AdminApiError extends Error {
  code?: string;
  sessionExpired?: boolean;

  constructor(message: string, options?: { code?: string; sessionExpired?: boolean }) {
    super(message);
    this.name = "AdminApiError";
    this.code = options?.code;
    this.sessionExpired = options?.sessionExpired;
  }
}

function normalizeError(value: unknown): string {
  if (!value) return "Something went wrong.";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "message" in value && typeof (value as { message?: unknown }).message === "string") {
    return (value as { message: string }).message;
  }
  return "Something went wrong.";
}

export async function requireBrowserAdminSession() {
  const adminSession = getAdminToken(ADMIN_KEYS.session);
  const { data } = await supabase.auth.getSession();

  if (!adminSession || !data.session) {
    clearAdmin();
    throw new AdminApiError("Your admin session expired. Please login again.", {
      code: "session_required",
      sessionExpired: true,
    });
  }

  return { adminSession, authSession: data.session };
}

export async function invokeAdmin<T>(functionName: string, body: Record<string, unknown> = {}): Promise<T> {
  const { adminSession } = await requireBrowserAdminSession();

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: { "x-admin-session": adminSession },
  });

  if (error) {
    throw new AdminApiError(normalizeError(error), { code: "edge_function_error" });
  }

  if (data?.error) {
    const code = String(data.error);
    const sessionExpired = ["session_required", "unauthorized", "forbidden"].includes(code);
    if (sessionExpired) clearAdmin();
    throw new AdminApiError(code.replace(/_/g, " "), { code, sessionExpired });
  }

  return data as T;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatMoney(value?: number | null, currency = "INR") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function compactId(value?: string | null) {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}
