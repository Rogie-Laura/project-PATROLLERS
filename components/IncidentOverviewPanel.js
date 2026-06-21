"use client";

import { useMemo } from "react";

function timeAgo(iso, nowMs) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Read-only awareness list of subordinate offices' active incidents. Higher
 * offices (RCC / PCC) see WHICH stations have an active response, but get no
 * dispatch controls — each station owns its own dispatch panel.
 */
export default function IncidentOverviewPanel({
  incidents = [],
  nowMs = Date.now(),
  onClose,
}) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const inc of incidents) {
      const office = (inc.office ?? "").trim();
      const unit = (inc.unit ?? "").trim();
      const key = `${office}||${unit}`;
      const title = unit || office || "Unscoped";
      const subtitle = unit ? office : "";
      if (!map.has(key)) {
        map.set(key, { key, title, subtitle, items: [] });
      }
      map.get(key).items.push(inc);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [incidents]);

  return (
    <div className="pointer-events-auto absolute right-4 top-16 z-[510] flex max-h-[70vh] w-[min(100%,360px)] flex-col rounded-lg border border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Awareness only
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            Stations with active incidents
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
          {incidents.length}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
            aria-label="Close incident overview"
          >
            ✕
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-muted">
            No active station incidents right now.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {groups.map((group) => (
              <li
                key={group.key}
                className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {group.title}
                    </p>
                    {group.subtitle && (
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted">
                        {group.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                    {group.items.length}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map((inc) => (
                    <li
                      key={inc.id}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground/90">
                        {inc.label}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted">
                        {timeAgo(inc.createdAt, nowMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-border/60 px-3 py-2 text-[10px] leading-snug text-muted">
        Notifications only — dispatch is handled independently by each station.
      </p>
    </div>
  );
}
