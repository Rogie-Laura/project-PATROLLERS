"use client";

export default function GenerateReportPanel({ onClose }) {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[500] w-[min(100%,440px)] -translate-x-1/2 rounded-lg border border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Generate report
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            Export patrol and incident summary
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
          aria-label="Close generate report panel"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="rounded-lg border border-dashed border-violet-400/40 bg-violet-500/10 px-3 py-6 text-center">
          <p className="text-sm font-medium text-violet-200">Coming soon</p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted">
            Fleet status, call responses, and location history reports will be
            available here.
          </p>
        </div>
      </div>
    </div>
  );
}
