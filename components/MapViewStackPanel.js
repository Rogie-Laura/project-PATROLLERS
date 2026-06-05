"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MapLegendContent from "@/components/MapLegendContent";
import MapSignalStatsContent from "@/components/MapSignalStatsContent";
import MapViewStackSection, {
  MapViewStackEmptyFrame,
} from "@/components/MapViewStackSection";
import { MAP_VIEW_STACK_LAYERS } from "@/lib/mapViewLayers";
import {
  clampLegendPosition,
  defaultLegendPosition,
  LEGEND_PANEL_WIDTH,
  readLegendPosition,
  writeLegendPosition,
} from "@/lib/mapLegendStorage";
import { usePanelDrag } from "@/lib/usePanelDrag";

const STACK_SECTION_HEIGHT = {
  legend: 220,
  pnpStations: 96,
  friendlyUnit: 96,
  crimeEnvironment: 96,
  signalStats: 200,
};

function estimateStackHeight(layerIds) {
  return layerIds.reduce(
    (total, id) => total + (STACK_SECTION_HEIGHT[id] ?? 96),
    0
  );
}

function renderStackSection(id, props) {
  switch (id) {
    case "legend":
      return (
        <MapViewStackSection title="Legend">
          <MapLegendContent locations={props.locations} />
        </MapViewStackSection>
      );
    case "pnpStations":
      return (
        <MapViewStackSection title="PNP Stations">
          <MapViewStackEmptyFrame />
        </MapViewStackSection>
      );
    case "friendlyUnit":
      return (
        <MapViewStackSection title="Friendly Unit">
          <MapViewStackEmptyFrame />
        </MapViewStackSection>
      );
    case "crimeEnvironment":
      return (
        <MapViewStackSection title="Crime Environment">
          <MapViewStackEmptyFrame />
        </MapViewStackSection>
      );
    case "signalStats":
      return (
        <MapViewStackSection title="Signal Stats">
          <MapSignalStatsContent
            locations={props.locations}
            nowMs={props.nowMs}
            intervalSeconds={props.intervalSeconds}
          />
        </MapViewStackSection>
      );
    default:
      return null;
  }
}

export default function MapViewStackPanel({
  layers,
  locations = [],
  nowMs = Date.now(),
  intervalSeconds = 180,
  bounds = null,
}) {
  const [position, setPosition] = useState(defaultLegendPosition);

  const visibleLayers = useMemo(
    () => MAP_VIEW_STACK_LAYERS.filter((layer) => layers[layer.id]),
    [layers]
  );

  const stackHeight = useMemo(
    () => estimateStackHeight(visibleLayers.map((layer) => layer.id)),
    [visibleLayers]
  );

  useEffect(() => {
    const stored = readLegendPosition();
    setPosition(clampLegendPosition(stored.x, stored.y, bounds, stackHeight));
  }, [bounds?.width, bounds?.height, stackHeight]);

  const handlePositionChange = useCallback(
    (next) => {
      const clamped = clampLegendPosition(next.x, next.y, bounds, stackHeight);
      setPosition(clamped);
      writeLegendPosition(clamped);
    },
    [bounds, stackHeight]
  );

  const { onTitleBarPointerDown, dragging } = usePanelDrag({
    enabled: true,
    locked: false,
    initialPosition: position,
    onPositionChange: handlePositionChange,
  });

  if (visibleLayers.length === 0) return null;

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
          flushTopLeft ? "rounded-br-xl rounded-tr-xl" : "rounded-xl"
        }`}
      >
        <div
          role="presentation"
          onPointerDown={onTitleBarPointerDown}
          className="flex cursor-grab select-none items-center border-b border-zinc-600/40 bg-zinc-900/50 px-3.5 py-1.5 active:cursor-grabbing"
          title="Drag to move view panel"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            View
          </p>
        </div>

        {visibleLayers.map((layer, index) => (
          <div key={layer.id}>
            {index > 0 && (
              <div className="border-t border-zinc-600/50" aria-hidden />
            )}
            {renderStackSection(layer.id, {
              locations,
              nowMs,
              intervalSeconds,
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
