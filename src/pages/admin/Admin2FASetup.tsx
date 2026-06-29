import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, ADMIN_KEYS, getAdminToken, setAdminToken, clearAdmin } from "@/admin/AdminShell";

export default function Admin2FASetup() {
  const navigate = useNavigate();
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const unlock = getAdminToken(ADMIN_KEYS.unlock);
      if (!unlock) { navigate("/", { replace: true }); return; }
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { navigate("/x7-control/login", { replace: true }); return; }
      const { data, error } = await supabase.functions.invoke("admin-session", {
        body: { action: "setup_2fa" },
        headers: { "x-unlock-token": unlock },
      });
      if (error || !data?.otpauth) {
        setError("Could not initialize 2FA");
        return;
      }
      setOtpauth(data.otpauth);
      setSecret(data.secret);
    })();
  }, [navigate]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const unlock = getAdminToken(ADMIN_KEYS.unlock);
      if (!unlock) throw new Error("Unlock expired");
      const { data, error } = await supabase.functions.invoke("admin-session", {
        body: { action: "enable_2fa", code },
        headers: { "x-unlock-token": unlock },
      });
      if (error || !data?.admin_session) throw new Error("Invalid code");
      setAdminToken(ADMIN_KEYS.session, data.admin_session, data.expires_in);
      navigate("/x7-control/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = otpauth
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauth)}`
    : null;

  return (
    <AdminShell title="Restricted · 2FA setup">
      <div className="container-wide max-w-md mx-auto py-16">
        <h1 className="font-display text-2xl font-bold mb-2">Set up 2FA</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Scan with an authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit code.
        </p>
        {qrUrl ? (
          <div className="flex flex-col items-center gap-4 mb-6">
            <img src={qrUrl} alt="2FA QR" className="bg-white p-2" width={220} height={220} />
            {secret && (
              <code className="text-xs font-mono break-all text-muted-foreground select-all">{secret}</code>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        )}
        <form onSubmit={onVerify} className="space-y-4">
          <input className="lv-input tracking-[0.4em] text-center" inputMode="numeric" maxLength={6}
            placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background text-sm uppercase tracking-wider font-medium disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Enable & continue
          </button>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); clearAdmin(); navigate("/", { replace: true }); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground">
            cancel
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
