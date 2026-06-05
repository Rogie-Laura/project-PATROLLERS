"use client";

import { useMemo } from "react";
import { getConnectionState } from "@/lib/connectionState";
import {
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-zinc-400">{label}</span>
      <span
        className={`tabular-nums font-semibold ${
          accent ? "text-emerald-400" : "text-zinc-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function MapSignalStatsContent({
  locations = [],
  nowMs = Date.now(),
  intervalSeconds = 180,
}) {
  const stats = useMemo(() => {
    let visibility = 0;
    let incident = 0;
    let strong = 0;
    let weak = 0;
    let delayed = 0;
    let stale = 0;

    for (const loc of locations) {
      if (loc.patrol_status === PATROL_STATUS.incidentResponse) {
        incident += 1;
      } else {
        visibility += 1;
      }

      const state = getConnectionState(loc, nowMs, intervalSeconds);
      if (state === "strong") strong += 1;
      else if (state === "weak") weak += 1;
      else if (state === "delayed") delayed += 1;
      else stale += 1;
    }

    return {
      total: locations.length,
      visibility,
      incident,
      strong,
      weak,
      delayed,
      stale,
    };
  }, [locations, nowMs, intervalSeconds]);

  return (
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
      <div className="my-1 border-t border-zinc-600/40" aria-hidden />
      <StatRow label="Online" value={stats.strong} />
      <StatRow label="Online · weak signal" value={stats.weak} />
      <StatRow label="Update delayed" value={stats.delayed} />
      <StatRow label="No recent update" value={stats.stale} />
    </div>
  );
}
