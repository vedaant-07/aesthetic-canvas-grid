import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

export function AdminLoadingState({ label = "Loading control room data…" }: { label?: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center border border-separator bg-hover-bg/20 p-8 text-center">
      <Loader2 className="mb-4 h-7 w-7 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function AdminEmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-separator bg-background p-8 text-center">
      <Inbox className="mb-4 h-7 w-7 text-muted-foreground" />
      <h3 className="font-display text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Admin request failed.</p>
            <p className="mt-1 text-red-200/80">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 border border-red-500/40 px-4 py-2 text-xs uppercase tracking-widest hover:bg-red-500/10"
          >
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
