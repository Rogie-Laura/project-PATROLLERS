"use client";

import {
  CONNECTION_BORDER_COLOR,
  LIVE_STATUS_LABEL,
} from "@/lib/connectionState";

const ITEMS = [
  { key: "strong", color: CONNECTION_BORDER_COLOR.strong },
  { key: "weak", color: CONNECTION_BORDER_COLOR.weak },
  { key: "delayed", color: CONNECTION_BORDER_COLOR.delayed },
  { key: "stale", color: CONNECTION_BORDER_COLOR.stale },
];

export default function MapConnectionLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[400] max-w-[200px] rounded-lg border border-border/50 bg-card/92 px-2.5 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Monitor link (ring)
      </p>
      <ul className="mt-1.5 space-y-1">
        {ITEMS.map(({ key, color }) => (
          <li key={key} className="flex items-center gap-1.5 text-[10px] text-foreground">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/90"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {LIVE_STATUS_LABEL[key]}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[9px] leading-snug text-muted">
        Monitor link uses mobile heartbeat when available; map pin uses last GPS.
        Hover a unit for details.
      </p>
    </div>
  );
}
