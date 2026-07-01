import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const navItems = [
  { label: "Platform", path: "/" },
  { label: "Gym Management", path: "/gym-management" },
  { label: "Support", path: "/support" },
  { label: "Contact", path: "/contact" },
];

interface HeaderProps {
  revealMode?: boolean;
}

export function Header({ revealMode = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isVisible, setIsVisible] = useState(!revealMode);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!revealMode) { setIsVisible(true); return; }
    const handleMouseMove = (e: MouseEvent) => setIsVisible(e.clientY < 100);
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [revealMode]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { setAdminToken, ADMIN_KEYS } = await import("@/admin/AdminShell");
      const { data } = await supabase.functions.invoke("search-router", { body: { query: q } });
      if (data?.ok && data.route && typeof data.unlock_token === "string") {
        setAdminToken(ADMIN_KEYS.unlock, data.unlock_token, Number(data.expires_in) || 900);
        setSearchValue("");
        setSearchOpen(false);
        navigate(data.route);
        return;
      }
    } catch {
      // fall through to regular no-results behavior
    }

    toast("No results found", {
      description: `Nothing matched "${q.slice(0, 40)}".`,
    });
    setSearchValue("");
    setSearchOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 backdrop-blur-md bg-background/70 border-b border-separator/60 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      }`}
    >
      <div className="container-wide relative">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-lg md:text-xl font-bold tracking-tight text-foreground">
              SE7EN<span className="text-accent">.</span>FIT
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-xs font-sans tracking-widest uppercase transition-colors ${
                    active ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />)}
            </button>
            <Link
              to="/gym-management"
              className="ml-3 inline-flex items-center px-4 py-2 text-xs font-medium tracking-wider uppercase bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Gym Portal
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button onClick={() => setSearchOpen((v) => !v)} className="p-2 text-foreground/60" aria-label="Search">
              <Search size={18} />
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -mr-2 text-foreground" aria-label="Toggle menu">
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearchSubmit} className="pb-4 md:pb-5 animate-fade-in">
            <div className="flex items-center gap-3 border border-separator px-4 py-3 bg-background">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search SE7EN FIT…"
                className="flex-1 bg-transparent outline-none text-sm font-sans placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:inline text-[10px] tracking-wider uppercase text-muted-foreground font-mono">enter</kbd>
            </div>
          </form>
        )}
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-background z-40 animate-fade-in">
          <nav className="container-wide py-12 flex flex-col gap-6">
            {navItems.map((item, i) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-display font-bold text-foreground animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/gym-management"
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 inline-flex w-fit items-center px-5 py-3 text-sm font-medium uppercase tracking-wider bg-accent text-accent-foreground"
            >
              Gym Portal →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
