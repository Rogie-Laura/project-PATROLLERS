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
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <Image
            src={image}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            aria-hidden
          />
        </span>
        <span className="truncate text-xs font-medium text-foreground sm:text-[13px]">
          {label}
        </span>
      </div>
      <span className="shrink-0 tabular-nums text-base font-semibold text-accent">
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
    <div className="pointer-events-auto w-[min(100%,300px)] rounded-lg border border-border/60 bg-card/95 px-3.5 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Legend
      </p>
      <ul className="space-y-2.5">
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
