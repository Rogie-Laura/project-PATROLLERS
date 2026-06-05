"use client";

import { useMemo } from "react";
import { getConnectionState, staleThresholdMs } from "@/lib/connectionState";
import {
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-muted">{label}</span>
      <span
        className={`tabular-nums font-semibold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function MapStatisticsOverlay({
  locations,
  nowMs,
  intervalSeconds = 180,
}) {
  const stats = useMemo(() => {
    const staleMs = staleThresholdMs(intervalSeconds);

    let visibility = 0;
    let incident = 0;
    let strong = 0;
    let weak = 0;
    let stale = 0;

    for (const loc of locations) {
      if (loc.patrol_status === PATROL_STATUS.incidentResponse) {
        incident += 1;
      } else {
        visibility += 1;
      }

      const state = getConnectionState(loc, nowMs, staleMs);
      if (state === "strong") strong += 1;
      else if (state === "weak") weak += 1;
      else stale += 1;
    }

    return {
      total: locations.length,
      visibility,
      incident,
      strong,
      weak,
      stale,
    };
  }, [locations, nowMs, intervalSeconds]);

  return (
    <div className="pointer-events-auto w-[min(100%,240px)] rounded-lg border border-border/60 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Signal Stats
      </p>
      <div className="space-y-1.5">
        <StatRow label="Active units on map" value={stats.total} accent />
        <StatRow
          label={getPatrolStatusLabel(PATROL_STATUS.policeVisibility)}
          value={stats.visibility}
        />
        <StatRow
          label={getPatrolStatusLabel(PATROL_STATUS.incidentResponse)}
          value={stats.incident}
        />
        <div className="my-1 border-t border-border/50" aria-hidden />
        <StatRow label="Strong signal" value={stats.strong} />
        <StatRow label="Weak signal" value={stats.weak} />
        <StatRow label="Disconnected / stale" value={stats.stale} />
      </div>
    </div>
  );
}
