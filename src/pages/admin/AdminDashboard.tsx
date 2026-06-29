import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, ADMIN_KEYS, clearAdmin, getAdminToken } from "@/admin/AdminShell";
import { toast } from "sonner";

type Metrics = {
  counts: { pending_requests: number; gyms: number; gym_owners: number };
  recent_audit: Array<{ id: string; action: string; actor_id: string | null; ip: string | null; created_at: string; metadata: Record<string, unknown> }>;
};
type GymRequest = { id: string; gym_name: string; owner_full_name: string; owner_email: string; owner_phone: string | null; city: string | null; status: string; created_at: string };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<GymRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plainCode, setPlainCode] = useState<string | null>(null);

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
    if (metricRes.error || !metricRes.data) setError("Could not load metrics"); else setMetrics(metricRes.data as Metrics);
    if (reqRes.error || !reqRes.data?.ok) setError("Could not load gym requests"); else setRequests(reqRes.data.requests ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAction = async (request_id: string, action: "approve" | "reject" | "generate_code") => {
    const session = adminSession();
    if (!session) { navigate("/", { replace: true }); return; }
    setBusy(true);
    setPlainCode(null);
    const { data, error } = await supabase.functions.invoke("admin-requests", { body: { action, request_id, expires_in_days: 14 }, headers: { "x-admin-session": session } });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Action failed", { description: data?.error || error?.message || "Try again." });
      return;
    }
    if (data.code) setPlainCode(data.code);
    toast.success(action === "generate_code" ? "Code generated" : "Request updated");
    load();
  };

  const onLogout = async () => { await supabase.auth.signOut(); clearAdmin(); navigate("/", { replace: true }); };

  return (
    <AdminShell title="SE7EN · Admin">
      <div className="container-wide py-10">
        <div className="flex items-center justify-between mb-10">
          <div><p className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">control room</p><h1 className="font-display text-3xl font-bold">Admin dashboard</h1></div>
          <div className="flex items-center gap-2"><button onClick={load} className="p-2 text-muted-foreground hover:text-foreground" title="Refresh"><RefreshCw size={16} /></button><button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 border border-separator text-xs uppercase tracking-wider"><LogOut size={14} /> sign out</button></div>
        </div>
        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}
        {error && <p className="text-destructive mb-6">{error}</p>}
        {plainCode && <div className="mb-8 border border-accent/50 bg-accent/10 p-5"><p className="text-label mb-2">Copy this code now. It is shown only once.</p><code className="font-mono text-xl break-all text-accent">{plainCode}</code></div>}
        {metrics && <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-separator border border-separator mb-10">{[{ label: "Pending gym requests", v: metrics.counts.pending_requests }, { label: "Active gyms", v: metrics.counts.gyms }, { label: "Gym owners", v: metrics.counts.gym_owners }].map((s) => <div key={s.label} className="bg-background p-6"><p className="text-label mb-3">{s.label}</p><p className="font-display text-4xl font-bold">{s.v}</p></div>)}</div>}
        <section className="mb-10"><p className="text-label mb-4">Gym owner access requests</p><div className="border border-separator divide-y divide-separator">{requests.length === 0 && <div className="p-4 text-sm text-muted-foreground">No requests yet.</div>}{requests.map((r) => <div key={r.id} className="p-4 grid gap-4 md:grid-cols-12 text-sm"><div className="md:col-span-4"><p className="font-medium">{r.gym_name}</p><p className="text-muted-foreground">{r.owner_full_name} · {r.owner_email}</p></div><div className="md:col-span-2 text-muted-foreground">{r.city || "—"}</div><div className="md:col-span-2 font-mono text-xs uppercase">{r.status}</div><div className="md:col-span-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => runAction(r.id, "approve")} className="px-3 py-2 border border-separator text-xs uppercase">Approve</button><button disabled={busy || r.status !== "approved"} onClick={() => runAction(r.id, "generate_code")} className="px-3 py-2 bg-accent text-accent-foreground text-xs uppercase disabled:opacity-40">Generate code</button><button disabled={busy} onClick={() => runAction(r.id, "reject")} className="px-3 py-2 border border-destructive/50 text-destructive text-xs uppercase">Reject</button></div></div>)}</div></section>
        {metrics && <section><p className="text-label mb-4">Recent audit log</p><div className="border border-separator divide-y divide-separator">{metrics.recent_audit.length === 0 && <div className="p-4 text-sm text-muted-foreground">No events yet.</div>}{metrics.recent_audit.map((a) => <div key={a.id} className="p-4 grid grid-cols-12 gap-4 text-sm"><span className="col-span-3 font-mono text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span><span className="col-span-4 font-medium">{a.action}</span><span className="col-span-2 font-mono text-xs text-muted-foreground truncate">{a.ip ?? "—"}</span><span className="col-span-3 font-mono text-xs text-muted-foreground truncate">{a.actor_id ?? "—"}</span></div>)}</div></section>}
      </div>
    </AdminShell>
  );
}
