import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, ADMIN_KEYS, clearAdmin, getAdminToken } from "@/admin/AdminShell";

type Metrics = {
  counts: { pending_requests: number; gyms: number; gym_owners: number };
  recent_audit: Array<{
    id: string; action: string; actor_id: string | null;
    ip: string | null; created_at: string; metadata: Record<string, unknown>;
  }>;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const session = getAdminToken(ADMIN_KEYS.session);
    if (!session) {
      navigate("/", { replace: true });
      return;
    }
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) { navigate("/", { replace: true }); return; }

    const { data, error } = await supabase.functions.invoke("admin-metrics", {
      headers: { "x-admin-session": session },
    });
    if (error || !data) {
      setError("Could not load metrics");
      setLoading(false);
      return;
    }
    setMetrics(data as Metrics);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    clearAdmin();
    navigate("/", { replace: true });
  };

  return (
    <AdminShell title="SE7EN · Admin">
      <div className="container-wide py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">control room</p>
            <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-muted-foreground hover:text-foreground" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 border border-separator text-xs uppercase tracking-wider">
              <LogOut size={14} /> sign out
            </button>
          </div>
        </div>

        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>}
        {error && <p className="text-destructive">{error}</p>}

        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-separator border border-separator mb-10">
              {[
                { label: "Pending gym requests", v: metrics.counts.pending_requests },
                { label: "Active gyms", v: metrics.counts.gyms },
                { label: "Gym owners", v: metrics.counts.gym_owners },
              ].map((s) => (
                <div key={s.label} className="bg-background p-6">
                  <p className="text-label mb-3">{s.label}</p>
                  <p className="font-display text-4xl font-bold">{s.v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-label mb-4">Recent audit log</p>
              <div className="border border-separator divide-y divide-separator">
                {metrics.recent_audit.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No events yet.</div>
                )}
                {metrics.recent_audit.map((a) => (
                  <div key={a.id} className="p-4 grid grid-cols-12 gap-4 text-sm">
                    <span className="col-span-3 font-mono text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                    <span className="col-span-4 font-medium">{a.action}</span>
                    <span className="col-span-2 font-mono text-xs text-muted-foreground truncate">{a.ip ?? "—"}</span>
                    <span className="col-span-3 font-mono text-xs text-muted-foreground truncate">{a.actor_id ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
