"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  countPatrolUnitsByType,
  PATROL_UNIT_TYPES,
} from "@/lib/patrolUnitTypes";

function LegendRow({
  image,
  label,
  value,
  visible = true,
  onVisibleChange,
  showCheckbox = false,
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => onVisibleChange?.(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-zinc-500 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
            aria-label={`Show ${label} on map`}
          />
        )}
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
            aria-hidden
          />
        </span>
        <span
          className={`truncate text-xs font-medium sm:text-[13px] ${
            visible ? "text-zinc-100" : "text-zinc-500"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`shrink-0 tabular-nums text-base font-semibold ${
          visible ? "text-emerald-400" : "text-zinc-500"
        }`}
      >
        {value}
      </span>
    </li>
  );
}

export default function MapLegendContent({
  locations = [],
  visibility = null,
  onVisibilityChange = null,
  showCheckboxes = false,
  usePanelLabels = false,
}) {
  const counts = useMemo(
    () => countPatrolUnitsByType(locations),
    [locations]
  );

  return (
    <ul className="space-y-2">
      {PATROL_UNIT_TYPES.map((type) => (
        <LegendRow
          key={type.id}
          image={type.image}
          label={usePanelLabels ? type.panelLabel : type.label}
          value={counts[type.id] ?? 0}
          visible={visibility?.[type.id] !== false}
          showCheckbox={showCheckboxes}
          onVisibleChange={
            onVisibilityChange
              ? (checked) => onVisibilityChange(type.id, checked)
              : undefined
          }
        />
      ))}
    </ul>
  );
}
