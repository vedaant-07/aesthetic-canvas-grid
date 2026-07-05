import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, Copy, Dumbbell, KeyRound, Loader2, LogOut, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, ADMIN_KEYS, clearAdmin, getAdminToken } from "@/admin/AdminShell";
import { toast } from "sonner";

type Metrics = {
  counts: {
    pending_requests: number;
    approved_requests?: number;
    activated_requests?: number;
    rejected_requests?: number;
    gyms: number;
    gym_owners: number;
    unused_codes?: number;
  };
  recent_audit: Array<{ id: string; action: string; actor_id: string | null; ip: string | null; created_at: string; metadata: Record<string, unknown>; }>;
};

type GymRequest = {
  id: string;
  gym_name: string;
  owner_full_name: string;
  owner_email: string;
  owner_phone: string | null;
  city: string | null;
  country?: string | null;
  gym_type?: string | null;
  estimated_members?: number | null;
  current_software?: string | null;
  requirements?: string | null;
  status: string;
  created_at: string;
};

type Filter = "all" | "pending" | "approved" | "activated" | "rejected";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<GymRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plainCode, setPlainCode] = useState<{ requestId: string; code: string; emailSent?: boolean; emailError?: string | null } | null>(null);

  const adminSession = () => getAdminToken(ADMIN_KEYS.session);

  const load = async () => {
    setLoading(true);
    setError(null);
    const session = adminSession();
    if (!session) { navigate("/", { replace: true }); return; }

    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { navigate("/", { replace: true }); return; }

    const [metricRes, reqRes] = await Promise.all([
      supabase.functions.invoke("admin-metrics", { headers: { "x-admin-session": session } }),
      supabase.functions.invoke("admin-requests", { body: { action: "list" }, headers: { "x-admin-session": session } }),
    ]);

    if (metricRes.error || !metricRes.data) setError("Could not load admin metrics. Check admin-metrics Edge Function and audit tables.");
    else setMetrics(metricRes.data as Metrics);

    if (reqRes.error || !reqRes.data?.ok) setError((prev) => prev ?? "Could not load gym requests. Check admin-requests Edge Function.");
    else setRequests(reqRes.data.requests ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredRequests = useMemo(() => filter === "all" ? requests : requests.filter((r) => r.status === filter), [requests, filter]);

  const runAction = async (request_id: string, action: "approve" | "reject" | "generate_code") => {
    const session = adminSession();
    if (!session) { navigate("/", { replace: true }); return; }
    setBusyId(`${request_id}:${action}`);
    setPlainCode(null);

    const { data, error } = await supabase.functions.invoke("admin-requests", {
      body: { action, request_id, expires_in_days: 14 },
      headers: { "x-admin-session": session },
    });

    setBusyId(null);
    if (error || !data?.ok) {
      toast.error("Action failed", { description: data?.error || error?.message || "Try again." });
      return;
    }

    if (data.code) {
      setPlainCode({ requestId: request_id, code: data.code, emailSent: !!data.email_sent, emailError: data.email_error ?? null });
      if (data.email_sent) toast.success(action === "approve" ? "Approved and emailed" : "Access code emailed", { description: "The gym owner has received the unique code." });
      else toast.warning("Code generated but email failed", { description: data.email_error || "Copy the code and send it manually." });
    } else {
      toast.success(action === "approve" ? "Request approved" : "Request rejected");
    }
    load();
  };

  const copyCode = async () => {
    if (!plainCode?.code) return;
    await navigator.clipboard.writeText(plainCode.code);
    toast.success("Code copied");
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    clearAdmin();
    navigate("/", { replace: true });
  };

  return (
    <AdminShell title="SE7EN · Admin Control">
      <div className="container-wide py-8 md:py-10">
        <div className="flex flex-col gap-6 border-b border-separator pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent mb-3">control room</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[-0.04em]">Admin dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-foreground/60">Review gym-owner applications, approve access, automatically email single-use codes, and monitor admin events.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg" title="Refresh"><RefreshCw size={14} /> Refresh</button>
            <button onClick={onLogout} className="inline-flex h-10 items-center gap-2 border border-separator px-4 text-xs uppercase tracking-widest hover:bg-hover-bg"><LogOut size={14} /> Sign out</button>
          </div>
        </div>

        {loading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-accent" /></div>}
        {!loading && error && <div className="my-8 border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>}

        {!loading && metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-separator border border-separator my-8">
            <MetricCard icon={Clock3} label="Pending" value={metrics.counts.pending_requests} />
            <MetricCard icon={CheckCircle2} label="Approved" value={metrics.counts.approved_requests ?? 0} />
            <MetricCard icon={Dumbbell} label="Active gyms" value={metrics.counts.gyms} />
            <MetricCard icon={KeyRound} label="Unused codes" value={metrics.counts.unused_codes ?? 0} />
          </div>
        )}

        {plainCode && (
          <div className="mb-8 border border-accent/50 bg-accent/10 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-label mb-2">{plainCode.emailSent ? "Access code emailed successfully" : "Email failed — copy this code and send it manually"}</p>
                <code className="font-mono text-lg md:text-2xl break-all text-accent">{plainCode.code}</code>
                {plainCode.emailError && <p className="mt-3 text-xs text-destructive">{plainCode.emailError}</p>}
              </div>
              <button onClick={copyCode} className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground"><Copy size={14} /> Copy code</button>
            </div>
          </div>
        )}

        {!loading && (
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="text-label">Gym owner access requests</p>
                <div className="flex flex-wrap gap-2">{(["pending", "approved", "activated", "rejected", "all"] as Filter[]).map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-[10px] uppercase tracking-widest border ${filter === f ? "border-accent bg-accent text-accent-foreground" : "border-separator text-foreground/60 hover:text-foreground"}`}>{f}</button>)}</div>
              </div>

              <div className="border border-separator divide-y divide-separator">
                {filteredRequests.length === 0 && <div className="p-8 text-sm text-muted-foreground">No {filter === "all" ? "" : filter} requests found.</div>}
                {filteredRequests.map((r) => <RequestCard key={r.id} request={r} busyId={busyId} onApprove={() => runAction(r.id, "approve")} onReject={() => runAction(r.id, "reject")} onGenerateCode={() => runAction(r.id, "generate_code")} />)}
              </div>
            </div>

            <aside className="space-y-8">
              <div className="border border-separator p-5 bg-hover-bg/20">
                <p className="text-label mb-4">Production checklist</p>
                <ChecklistItem done label="Admin account requires Supabase login" />
                <ChecklistItem done label="2FA required before dashboard session" />
                <ChecklistItem done label="Access code generated automatically on approval" />
                <ChecklistItem done label="Approved code email delivery connected through Brevo" />
                <ChecklistItem done={false} label="Admin activity export/reporting pending" />
              </div>

              <div>
                <p className="text-label mb-4">Recent audit log</p>
                <div className="border border-separator divide-y divide-separator">
                  {!metrics?.recent_audit?.length && <div className="p-4 text-sm text-muted-foreground">No events yet.</div>}
                  {metrics?.recent_audit?.map((a) => <div key={a.id} className="p-4 text-sm"><div className="mb-1 flex items-center justify-between gap-3"><span className="font-medium">{a.action}</span><span className="font-mono text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span></div><p className="font-mono text-[10px] text-muted-foreground truncate">{a.ip ?? "no-ip"}</p></div>)}
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
  return <div className="bg-background p-5 md:p-6"><Icon size={18} className="mb-5 text-accent" /><p className="text-label mb-2">{label}</p><p className="font-display text-4xl md:text-5xl font-bold tracking-[-0.04em]">{value}</p></div>;
}

function RequestCard({ request, busyId, onApprove, onReject, onGenerateCode }: { request: GymRequest; busyId: string | null; onApprove: () => void; onReject: () => void; onGenerateCode: () => void; }) {
  const canGenerate = request.status === "approved";
  const busy = busyId?.startsWith(`${request.id}:`);
  return (
    <article className="p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">{request.gym_name}</h2><StatusBadge status={request.status} /></div>
          <div className="grid gap-2 text-sm text-foreground/70 md:grid-cols-2">
            <p><span className="text-foreground/40">Owner:</span> {request.owner_full_name}</p><p><span className="text-foreground/40">Email:</span> {request.owner_email}</p><p><span className="text-foreground/40">Phone:</span> {request.owner_phone || "—"}</p><p><span className="text-foreground/40">City:</span> {request.city || "—"}</p><p><span className="text-foreground/40">Type:</span> {request.gym_type || "—"}</p><p><span className="text-foreground/40">Members:</span> {request.estimated_members ?? "—"}</p>
          </div>
          {request.requirements && <p className="mt-4 max-w-3xl border-l border-separator pl-4 text-sm leading-relaxed text-foreground/55">{request.requirements}</p>}
        </div>
        <div className="flex flex-col gap-2 xl:items-stretch xl:justify-center">
          <button disabled={busy || request.status !== "pending"} onClick={onApprove} className="inline-flex items-center justify-center gap-2 border border-separator px-4 py-3 text-xs uppercase tracking-widest hover:bg-hover-bg disabled:opacity-40">{busyId === `${request.id}:approve` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve & email code</button>
          <button disabled={busy || !canGenerate} onClick={onGenerateCode} className="inline-flex items-center justify-center gap-2 bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground hover:opacity-90 disabled:opacity-40">{busyId === `${request.id}:generate_code` ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Re-send code</button>
          <button disabled={busy || request.status === "rejected" || request.status === "activated"} onClick={onReject} className="inline-flex items-center justify-center gap-2 border border-destructive/50 px-4 py-3 text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 disabled:opacity-40">{busyId === `${request.id}:reject` ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject</button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { pending: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10", approved: "border-accent/30 text-accent bg-accent/10", activated: "border-accent/30 text-accent bg-accent/10", rejected: "border-destructive/40 text-destructive bg-destructive/10" };
  return <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${styles[status] ?? "border-separator text-muted-foreground"}`}>{status}</span>;
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return <div className="mb-3 flex items-start gap-3 text-sm text-foreground/70">{done ? <CheckCircle2 size={16} className="mt-0.5 text-accent" /> : <ShieldAlert size={16} className="mt-0.5 text-muted-foreground" />}<span>{label}</span></div>;
}
