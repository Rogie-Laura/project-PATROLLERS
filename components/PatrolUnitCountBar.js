"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  countPatrolUnitsByType,
  PATROL_UNIT_TYPES,
} from "@/lib/patrolUnitTypes";

function CountItem({ image, label, value }) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1"
      title={`${label}: ${value}`}
    >
      <Image
        src={image}
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px] shrink-0 object-contain"
        aria-hidden
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[10px] font-medium text-muted">{label}</p>
        <p className="tabular-nums text-sm font-bold text-emerald-400">{value}</p>
      </div>
    </div>
  );
}

export default function PatrolUnitCountBar({ locations = [] }) {
  const counts = useMemo(
    () => countPatrolUnitsByType(locations),
    [locations]
  );

  return (
    <div
      className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 md:flex lg:gap-2"
      aria-label="Active patrol units by type"
    >
      {PATROL_UNIT_TYPES.map((type) => (
        <CountItem
          key={type.id}
          image={type.image}
          label={type.dashboardLabel}
          value={counts[type.id] ?? 0}
        />
      ))}
    </div>
  );
}
