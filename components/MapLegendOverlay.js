"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePanelDrag } from "@/lib/usePanelDrag";
import {
  clampLegendPosition,
  defaultLegendPosition,
  LEGEND_PANEL_WIDTH,
  readLegendPosition,
  writeLegendPosition,
} from "@/lib/mapLegendStorage";
import {
  countPatrolUnitsByType,
  PATROL_UNIT_TYPES,
} from "@/lib/patrolUnitTypes";

function LegendRow({ image, label, value }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/92 shadow-sm ring-1 ring-white/30">
          <Image
            src={image}
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 object-contain"
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

export default function MapLegendOverlay({
  locations = [],
  bounds = null,
}) {
  const [position, setPosition] = useState(defaultLegendPosition);

  useEffect(() => {
    const stored = readLegendPosition();
    setPosition(clampLegendPosition(stored.x, stored.y, bounds));
  }, [bounds?.width, bounds?.height]);

  const handlePositionChange = useCallback(
    (next) => {
      const clamped = clampLegendPosition(next.x, next.y, bounds);
      setPosition(clamped);
      writeLegendPosition(clamped);
    },
    [bounds]
  );

  const { onTitleBarPointerDown, dragging } = usePanelDrag({
    enabled: true,
    locked: false,
    initialPosition: position,
    onPositionChange: handlePositionChange,
  });

  const counts = useMemo(
    () => countPatrolUnitsByType(locations),
    [locations]
  );

  const flushTopLeft =
    position.x <= 0 && position.y <= 0 && !dragging;

  return (
    <div
      className="pointer-events-auto absolute z-[500]"
      style={{
        left: position.x,
        top: position.y,
        width: LEGEND_PANEL_WIDTH,
      }}
    >
      <div
        className={`overflow-hidden border border-zinc-600/45 bg-zinc-800/88 shadow-lg shadow-black/25 backdrop-blur-sm ${
          flushTopLeft
            ? "rounded-br-xl rounded-tr-xl"
            : "rounded-xl"
        }`}
      >
        <div
          role="presentation"
          onPointerDown={onTitleBarPointerDown}
          className="flex cursor-grab select-none items-center border-b border-zinc-600/40 bg-zinc-900/35 px-3.5 py-2 active:cursor-grabbing"
          title="Drag to move legend"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Legend
          </p>
        </div>

        <ul className="space-y-2.5 px-3.5 py-3">
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
    </div>
  );
}
