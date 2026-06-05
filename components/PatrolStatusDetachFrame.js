"use client";

function LockIcon({ locked }) {
  if (locked) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function ExternalWindowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

/**
 * Compact title bar for a detached patrol status panel (floating or pop-out window).
 */
export default function PatrolStatusDetachFrame({
  title = "Patrol Status",
  subtitle,
  locked,
  onLockedChange,
  onDock,
  onOpenWindow,
  onTitleBarPointerDown,
  dragHint,
  className = "",
  children,
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card shadow-2xl ring-1 ring-black/10 ${className}`}
    >
      <div
        role="presentation"
        onPointerDown={onTitleBarPointerDown}
        className={`flex shrink-0 select-none items-center gap-1.5 border-b border-border/60 bg-card/95 px-2 py-1.5 ${
          locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        title={
          locked
            ? "Locked — unlock to move this panel"
            : "Drag here to move this panel"
        }
      >
        <div
          className="flex min-w-0 flex-1 flex-col"
          aria-label={title}
        >
          <span className="truncate text-[11px] font-semibold leading-tight text-foreground">
            {title}
          </span>
          {subtitle ? (
            <span className="truncate text-[10px] leading-tight text-muted">
              {subtitle}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onLockedChange(!locked)}
          aria-pressed={locked}
          title={locked ? "Unlock to move panel" : "Lock panel position"}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border transition ${
            locked
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-border/60 bg-background/50 text-muted hover:bg-background/80 hover:text-foreground"
          }`}
        >
          <LockIcon locked={locked} />
        </button>

        {onOpenWindow && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onOpenWindow}
            title="Open in a separate browser window (second monitor)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-background/50 text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            <ExternalWindowIcon />
          </button>
        )}

        {onDock && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDock}
            title="Dock back to the map sidebar"
            className="shrink-0 rounded border border-border/60 bg-background/50 px-2 py-1 text-[10px] font-medium text-foreground transition hover:bg-background/80"
          >
            Dock
          </button>
        )}
      </div>

      {dragHint && !locked && (
        <p className="shrink-0 border-b border-border/40 bg-background/40 px-2 py-0.5 text-center text-[9px] text-muted">
          {dragHint}
        </p>
      )}

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
