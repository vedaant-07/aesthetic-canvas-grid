import { LucideIcon } from "lucide-react";
import { compactId, formatDateTime } from "@/admin/adminApi";

export function AdminMetricCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-separator bg-background p-5 shadow-[0_0_40px_rgba(124,255,0,0.03)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Icon size={18} className="text-accent" />
        {hint && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{hint}</span>}
      </div>
      <p className="text-label mb-2">{label}</p>
      <p className="font-display text-4xl font-bold tracking-[-0.05em] md:text-5xl">{value}</p>
    </div>
  );
}

export function AdminSectionHeader({ eyebrow, title, body, actions }: { eyebrow?: string; title: string; body?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-separator pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-bold tracking-[-0.05em] md:text-6xl">{title}</h1>
        {body && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{body}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  const value = status || "unknown";
  const styles: Record<string, string> = {
    pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    approved: "border-accent/30 bg-accent/10 text-accent",
    activated: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    unused: "border-accent/30 bg-accent/10 text-accent",
    used: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    rejected: "border-red-500/40 bg-red-500/10 text-red-300",
    suspended: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    failed: "border-red-500/40 bg-red-500/10 text-red-300",
    unpaid: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    expired: "border-muted bg-muted/40 text-muted-foreground",
    revoked: "border-red-500/40 bg-red-500/10 text-red-300",
  };
  return <span className={`inline-flex border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${styles[value] ?? "border-separator text-muted-foreground"}`}>{value}</span>;
}

export function DataPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border border-separator bg-hover-bg/20 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground/85">{value ?? "—"}</p>
    </div>
  );
}

export function AuditMiniList({ logs }: { logs: Array<{ id: string; action: string; actor_id?: string | null; ip?: string | null; created_at: string }> }) {
  return (
    <div className="border border-separator divide-y divide-separator">
      {logs.map((log) => (
        <div key={log.id} className="p-4 text-sm">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="font-medium">{log.action}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{formatDateTime(log.created_at)}</span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">{compactId(log.actor_id)} · {log.ip || "no-ip"}</p>
        </div>
      ))}
    </div>
  );
}
