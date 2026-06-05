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
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <Image
            src={image}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
            aria-hidden
          />
        </span>
        <span className="truncate text-xs font-medium text-zinc-100 sm:text-[13px]">
          {label}
        </span>
      </div>
      <span className="shrink-0 tabular-nums text-base font-semibold text-emerald-400">
        {value}
      </span>
    </li>
  );
}

export default function MapLegendContent({ locations = [] }) {
  const counts = useMemo(
    () => countPatrolUnitsByType(locations),
    [locations]
  );

  return (
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
  );
}
