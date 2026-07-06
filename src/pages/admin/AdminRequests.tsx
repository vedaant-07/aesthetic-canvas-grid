import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Eye, KeyRound, Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminControlLayout } from "@/admin/AdminControlLayout";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/admin/AdminStates";
import { AdminSectionHeader, DataPill, StatusBadge } from "@/admin/AdminUI";
import { AdminApiError, formatDateTime, invokeAdmin } from "@/admin/adminApi";

type RequestStatus = "all" | "pending" | "approved" | "activated" | "rejected";

type AccessCode = {
  id: string;
  code_prefix: string;
  status: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
};

type GymRequest = {
  id: string;
  gym_name: string;
  owner_full_name: string;
  owner_email: string;
  owner_phone?: string | null;
  city?: string | null;
  country?: string | null;
  gym_type?: string | null;
  estimated_members?: number | null;
  current_software?: string | null;
  requirements?: string | null;
  reviewer_notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  access_codes?: AccessCode[];
};

type RequestResponse = { ok: boolean; requests: GymRequest[] };

type CodeResponse = {
  ok: boolean;
  request?: GymRequest;
  code?: string;
  code_record?: AccessCode;
  email_sent?: boolean;
  email_error?: string | null;
};

const filters: RequestStatus[] = ["pending", "approved", "activated", "rejected", "all"];

export default function AdminRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<GymRequest[]>([]);
  const [status, setStatus] = useState<RequestStatus>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plainCode, setPlainCode] = useState<{ requestId: string; code: string; emailSent?: boolean; emailError?: string | null } | null>(null);

  const selected = useMemo(() => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null, [requests, selectedId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeAdmin<RequestResponse>("admin-requests", {
        action: "list",
        status,
        search: search.trim() || undefined,
      });
      setRequests(data.requests ?? []);
      if (!selectedId && data.requests?.[0]) setSelectedId(data.requests[0].id);
      if (selectedId && !data.requests?.some((request) => request.id === selectedId)) setSelectedId(data.requests?.[0]?.id ?? null);
    } catch (err) {
      if (err instanceof AdminApiError && err.sessionExpired) navigate("/", { replace: true });
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);
  useEffect(() => { setNotes(selected?.reviewer_notes ?? ""); }, [selected?.id]);

  const runAction = async (request: GymRequest, action: "approve" | "reject" | "generate_code" | "save_notes") => {
    setBusy(`${request.id}:${action}`);
    setPlainCode(null);
    try {
      const data = await invokeAdmin<CodeResponse>("admin-requests", {
        action,
        request_id: request.id,
        notes,
        expires_in_days: 14,
      });

      if (data.code) {
        setPlainCode({ requestId: request.id, code: data.code, emailSent: data.email_sent, emailError: data.email_error });
        if (data.email_sent) toast.success("Access code generated", { description: "The owner email was sent by the Edge Function." });
        else toast.warning("Code generated, email not sent", { description: data.email_error || "Copy the code and send it manually." });
      } else {
        toast.success(action === "reject" ? "Request rejected" : action === "save_notes" ? "Notes saved" : "Request approved");
      }
      await load();
    } catch (err) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!plainCode?.code) return;
    await navigator.clipboard.writeText(plainCode.code);
    toast.success("Access code copied");
  };

  return (
    <AdminControlLayout>
      <AdminSectionHeader
        eyebrow="applications"
        title="Gym requests"
        body="Review real gym-owner applications, approve or reject safely, add notes, and issue single-use access codes. Plain codes are shown only once after generation."
        actions={<button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><RefreshCw size={14} /> Refresh</button>}
      />

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => { event.preventDefault(); load(); }} className="flex items-center gap-3 border border-separator bg-background px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gym, owner, email, phone, city…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </form>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button key={filter} onClick={() => setStatus(filter)} className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${status === filter ? "border-accent bg-accent text-accent-foreground" : "border-separator text-muted-foreground hover:text-foreground"}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      {loading && <AdminLoadingState label="Loading gym owner requests…" />}
      {!loading && error && <AdminErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border border-separator divide-y divide-separator bg-background">
            {requests.length === 0 && <AdminEmptyState title="No requests found" body="Try another status filter or search query." />}
            {requests.map((request) => {
              const isSelected = selected?.id === request.id;
              return (
                <button key={request.id} onClick={() => setSelectedId(request.id)} className={`block w-full p-5 text-left transition-colors hover:bg-hover-bg ${isSelected ? "bg-hover-bg" : ""}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{request.gym_name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{request.owner_full_name} · {request.owner_email}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="grid gap-2 text-xs text-foreground/65 sm:grid-cols-4">
                    <span>{request.city || "No city"}</span>
                    <span>{request.owner_phone || "No phone"}</span>
                    <span>{request.gym_type || "No type"}</span>
                    <span>{formatDateTime(request.created_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="space-y-5">
            {!selected && <AdminEmptyState title="Select a request" />}
            {selected && (
              <div className="border border-separator bg-black/40 p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-label mb-2">Application detail</p>
                    <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{selected.gym_name}</h2>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                {plainCode?.requestId === selected.id && (
                  <div className="mb-5 border border-accent/50 bg-accent/10 p-4">
                    <p className="text-label mb-2">Single-use code — visible once</p>
                    <code className="block break-all font-mono text-lg text-accent">{plainCode.code}</code>
                    {plainCode.emailError && <p className="mt-2 text-xs text-red-300">{plainCode.emailError}</p>}
                    <button onClick={copyCode} className="mt-4 inline-flex items-center gap-2 bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground"><Copy size={14} /> Copy</button>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <DataPill label="Owner" value={selected.owner_full_name} />
                  <DataPill label="Email" value={selected.owner_email} />
                  <DataPill label="Phone" value={selected.owner_phone} />
                  <DataPill label="City" value={selected.city} />
                  <DataPill label="Members" value={selected.estimated_members ?? "—"} />
                  <DataPill label="Created" value={formatDateTime(selected.created_at)} />
                </div>

                {selected.requirements && <p className="mt-5 border-l border-separator pl-4 text-sm leading-relaxed text-foreground/65">{selected.requirements}</p>}

                <label className="mt-5 block space-y-2">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Admin notes</span>
                  <textarea rows={4} className="lv-input resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes for review, rejection reason, follow-up context…" />
                </label>

                <div className="mt-5 grid gap-2">
                  <button disabled={!!busy || selected.status !== "pending"} onClick={() => runAction(selected, "approve")} className="inline-flex items-center justify-center gap-2 border border-separator px-4 py-3 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-40">
                    {busy === `${selected.id}:approve` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve & generate code
                  </button>
                  <button disabled={!!busy || selected.status !== "approved"} onClick={() => runAction(selected, "generate_code")} className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground hover:opacity-90 disabled:opacity-40">
                    {busy === `${selected.id}:generate_code` ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Generate new code
                  </button>
                  <button disabled={!!busy} onClick={() => runAction(selected, "save_notes")} className="inline-flex items-center justify-center gap-2 border border-separator px-4 py-3 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-40">
                    {busy === `${selected.id}:save_notes` ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Save notes
                  </button>
                  <button disabled={!!busy || selected.status === "rejected" || selected.status === "activated"} onClick={() => runAction(selected, "reject")} className="inline-flex items-center justify-center gap-2 border border-red-500/50 px-4 py-3 text-xs uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-40">
                    {busy === `${selected.id}:reject` ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                  </button>
                </div>

                <div className="mt-6 border-t border-separator pt-5">
                  <p className="text-label mb-3">Access codes</p>
                  <div className="space-y-2">
                    {!selected.access_codes?.length && <p className="text-sm text-muted-foreground">No code generated yet.</p>}
                    {selected.access_codes?.map((code) => (
                      <div key={code.id} className="flex items-center justify-between gap-3 border border-separator p-3">
                        <div>
                          <p className="font-mono text-xs">{code.code_prefix}••••</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Expires {formatDateTime(code.expires_at)}</p>
                        </div>
                        <StatusBadge status={code.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      )}
    </AdminControlLayout>
  );
}
