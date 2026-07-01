import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
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
      const unlock = getAdminToken(ADMIN_KEYS.unlock);
      if (!unlock) throw new Error("Admin unlock expired. Search the hidden phrase again.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error("Invalid credentials");

      // Ask the server if this account is an admin and whether 2FA is set up.
      const { data: status, error: sErr } = await supabase.functions.invoke("admin-session", {
        body: { action: "status" },
        headers: { "x-unlock-token": unlock },
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
      <div className="min-h-[calc(100vh-3rem)] container-wide flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-xl border border-separator bg-hover-bg/30 p-7 sm:p-10 md:p-12 shadow-2xl">
          <div className="mb-10">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center border border-separator bg-background">
              <LockKeyhole size={22} className="text-accent" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
              Internal Control
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.9] mb-5">
              Admin access.
            </h1>
            <p className="text-base sm:text-lg text-foreground/65 leading-relaxed">
              Authorized personnel only. Continue with your approved SE7EN FIT admin account.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-foreground/60">Email</span>
              <input
                className="lv-input h-14 text-base px-4"
                type="email"
                autoComplete="username"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-foreground/60">Password</span>
              <input
                className="lv-input h-14 text-base px-4"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && (
              <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex h-14 items-center justify-center gap-2 px-6 bg-foreground text-background text-sm uppercase tracking-[0.22em] font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Continue
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
