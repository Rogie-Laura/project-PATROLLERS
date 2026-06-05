"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  countPatrolUnitsByType,
  PATROL_UNIT_TYPES,
} from "@/lib/patrolUnitTypes";

function LegendRow({ image, label, value }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
          <Image
            src={image}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            aria-hidden
          />
        </span>
        <span className="truncate text-[11px] font-medium text-foreground">
          {label}
        </span>
      </div>
      <span className="shrink-0 tabular-nums text-sm font-semibold text-accent">
        {value}
      </span>
    </li>
  );
}

export default function MapLegendOverlay({ locations = [] }) {
  const counts = useMemo(
    () => countPatrolUnitsByType(locations),
    [locations]
  );

  return (
    <div className="pointer-events-auto w-[min(100%,280px)] rounded-lg border border-border/60 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Legend
      </p>
      <ul className="space-y-2">
        {PATROL_UNIT_TYPES.map((type) => (
          <LegendRow
            key={type.id}
            image={type.image}
            label={type.label}
            value={counts[type.id] ?? 0}
          />
        ))}
      </ul>
    </div>
  );
}
