import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BadgeIndianRupee,
  Building2,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, clearAdmin } from "@/admin/AdminShell";
import { requireBrowserAdminSession } from "@/admin/adminApi";
import { AdminLoadingState } from "@/admin/AdminStates";

type NavItemConfig = { label: string; path: string; icon: LucideIcon };

const primaryNavItems: NavItemConfig[] = [
  { label: "Overview", path: "/x7-control/dashboard", icon: LayoutDashboard },
  { label: "Gym Requests", path: "/x7-control/requests", icon: ClipboardList },
  { label: "Gyms", path: "/x7-control/gyms", icon: Building2 },
  { label: "Gym Owners", path: "/x7-control/gym-owners", icon: ShieldCheck },
];

const userNavItems: NavItemConfig[] = [
  { label: "All Users", path: "/x7-control/users?view=all", icon: Users },
  { label: "Active Users", path: "/x7-control/users?view=active", icon: Users },
  { label: "Active Subscription", path: "/x7-control/users?view=subscription_active", icon: BadgeIndianRupee },
  { label: "Expired Subscription", path: "/x7-control/users?view=subscription_expired", icon: BadgeIndianRupee },
  { label: "No Subscription", path: "/x7-control/users?view=subscription_none", icon: Users },
];

const secondaryNavItems: NavItemConfig[] = [
  { label: "Access Codes", path: "/x7-control/access-codes", icon: KeyRound },
  { label: "Payments", path: "/x7-control/payments", icon: BadgeIndianRupee },
  { label: "Audit Logs", path: "/x7-control/audit-logs", icon: Activity },
  { label: "Settings", path: "/x7-control/settings", icon: Settings },
];

function isActiveItem(location: ReturnType<typeof useLocation>, path: string) {
  const [pathname, query = ""] = path.split("?");
  if (location.pathname !== pathname) return false;

  const itemParams = new URLSearchParams(query);
  const view = itemParams.get("view");
  if (!view) return true;

  const currentView = new URLSearchParams(location.search).get("view") || "all";
  return currentView === view;
}

export function AdminControlLayout({ children, title = "SE7EN · Admin Control" }: { children: React.ReactNode; title?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { authSession } = await requireBrowserAdminSession();
        if (!alive) return;
        setEmail(authSession.user.email ?? null);
        setChecking(false);
      } catch {
        clearAdmin();
        navigate("/", { replace: true });
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAdmin();
    navigate("/", { replace: true });
  };

  if (checking) {
    return (
      <AdminShell title={title}>
        <div className="container-wide py-10">
          <AdminLoadingState label="Verifying admin session…" />
        </div>
      </AdminShell>
    );
  }

  const renderNavItems = (items: NavItemConfig[], onClick?: () => void) => items.map((item) => (
    <NavItem key={item.path} {...item} active={isActiveItem(location, item.path)} onClick={onClick} />
  ));

  return (
    <AdminShell title={title}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,255,0,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%)]">
        <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-separator bg-black/70 backdrop-blur lg:block">
            <div className="sticky top-0 flex h-screen flex-col">
              <div className="border-b border-separator p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">SE7EN FIT</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">Control Room</h2>
                <p className="mt-2 truncate text-xs text-muted-foreground">{email}</p>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {renderNavItems(primaryNavItems)}
                <div className="py-3">
                  <div className="mb-2 flex items-center gap-2 px-4 font-mono text-[10px] uppercase tracking-[0.24em] text-accent/90">
                    <Users size={13} /> User
                  </div>
                  <div className="space-y-1 border-l border-separator/80 pl-3">
                    {renderNavItems(userNavItems)}
                  </div>
                </div>
                {renderNavItems(secondaryNavItems)}
              </nav>

              <div className="border-t border-separator p-4">
                <button onClick={signOut} className="flex w-full items-center gap-3 border border-separator px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground hover:bg-hover-bg hover:text-foreground">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="sticky top-0 z-40 border-b border-separator bg-background/90 backdrop-blur lg:hidden">
              <div className="flex h-16 items-center justify-between px-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">SE7EN FIT</p>
                  <p className="text-sm text-muted-foreground">Admin control</p>
                </div>
                <button onClick={() => setMenuOpen((v) => !v)} className="border border-separator p-2">
                  {menuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
              {menuOpen && (
                <nav className="border-t border-separator bg-background p-3">
                  {renderNavItems(primaryNavItems, () => setMenuOpen(false))}
                  <div className="my-3 border-y border-separator/70 py-3">
                    <div className="mb-2 flex items-center gap-2 px-4 font-mono text-[10px] uppercase tracking-[0.24em] text-accent/90">
                      <Users size={13} /> User
                    </div>
                    {renderNavItems(userNavItems, () => setMenuOpen(false))}
                  </div>
                  {renderNavItems(secondaryNavItems, () => setMenuOpen(false))}
                  <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 border border-separator px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
                    <LogOut size={15} /> Sign Out
                  </button>
                </nav>
              )}
            </header>

            <main className="container-wide py-7 md:py-10 lg:px-10 xl:px-12">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function NavItem({ label, path, icon: Icon, active, onClick }: { label: string; path: string; icon: LucideIcon; active: boolean; onClick?: () => void }) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.18em] transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-hover-bg hover:text-foreground"
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}
