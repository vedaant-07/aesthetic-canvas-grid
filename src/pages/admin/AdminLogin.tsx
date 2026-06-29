import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, ADMIN_KEYS, getAdminToken } from "@/admin/AdminShell";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidden route guard: no unlock token = redirect away silently to home.
  useEffect(() => {
    if (!getAdminToken(ADMIN_KEYS.unlock)) navigate("/", { replace: true });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error("Invalid credentials");

      // Ask the server if this account is an admin and whether 2FA is set up.
      const { data: status, error: sErr } = await supabase.functions.invoke("admin-session", {
        body: { action: "status" },
      });
      if (sErr || !status) {
        await supabase.auth.signOut();
        throw new Error("Access denied");
      }
      if (status.twofa_enabled) navigate("/x7-control/2fa", { replace: true });
      else navigate("/x7-control/2fa-setup", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell title="Restricted">
      <div className="container-wide max-w-md mx-auto py-20">
        <h1 className="font-display text-3xl font-bold mb-2">Internal access</h1>
        <p className="text-sm text-muted-foreground mb-8">Authorized personnel only.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="lv-input" type="email" autoComplete="username"
            placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="lv-input" type="password" autoComplete="current-password"
            placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background text-sm uppercase tracking-wider font-medium disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Continue
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
