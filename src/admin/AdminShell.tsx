// Tiny, deliberately ugly shell shared by hidden admin routes.
// - sets noindex/nofollow
// - applies a robots meta + no referrer
// - no navigation, no links back to the public site
import { useEffect } from "react";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive, nosnippet";
    document.head.appendChild(robots);

    const ref = document.createElement("meta");
    ref.name = "referrer";
    ref.content = "no-referrer";
    document.head.appendChild(ref);

    return () => {
      document.title = prev;
      robots.remove();
      ref.remove();
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-separator">
        <div className="container-wide h-12 flex items-center">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            // restricted • internal only
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

// localStorage keys, isolated under one prefix.
export const ADMIN_KEYS = {
  unlock: "se7en.admin.unlock",
  unlockExp: "se7en.admin.unlock.exp",
  session: "se7en.admin.session",
  sessionExp: "se7en.admin.session.exp",
} as const;

export function setAdminToken(key: string, token: string, expiresInSec: number) {
  sessionStorage.setItem(key, token);
  sessionStorage.setItem(`${key}.exp`, String(Date.now() + expiresInSec * 1000));
}

export function getAdminToken(key: string): string | null {
  const t = sessionStorage.getItem(key);
  const exp = Number(sessionStorage.getItem(`${key}.exp`) || 0);
  if (!t || !exp || Date.now() > exp) {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${key}.exp`);
    return null;
  }
  return t;
}

export function clearAdmin() {
  Object.values(ADMIN_KEYS).forEach((k) => sessionStorage.removeItem(k));
  sessionStorage.removeItem(`${ADMIN_KEYS.unlock}.exp`);
  sessionStorage.removeItem(`${ADMIN_KEYS.session}.exp`);
}
