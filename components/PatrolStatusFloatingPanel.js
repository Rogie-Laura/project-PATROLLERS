"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PatrolStatusDetachFrame from "@/components/PatrolStatusDetachFrame";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import { usePanelDrag } from "@/lib/usePanelDrag";
import {
  defaultDetachPosition,
  readDetachLocked,
  readDetachPosition,
  writeDetachLocked,
  writeDetachPosition,
} from "@/lib/patrolStatusDetachStorage";

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = "min(78vh, 680px)";

function clampPosition(x, y) {
  if (typeof window === "undefined") return { x, y };

  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - PANEL_WIDTH - margin);
  const maxY = Math.max(margin, window.innerHeight - 120);

  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}

export default function PatrolStatusFloatingPanel({
  locations,
  selectedPatrolKey,
  onSelectPatrol,
  nowMs,
  intervalSeconds,
  onDock,
  onOpenWindow,
  externalWindowActive = false,
}) {
  const [locked, setLocked] = useState(false);
  const [position, setPosition] = useState(() => defaultDetachPosition(PANEL_WIDTH));

  useEffect(() => {
    setLocked(readDetachLocked());
    const stored = readDetachPosition();
    if (stored.x != null && stored.y != null) {
      setPosition(clampPosition(stored.x, stored.y));
    } else {
      setPosition(defaultDetachPosition(PANEL_WIDTH));
    }
  }, []);

  const handleLockedChange = useCallback((next) => {
    setLocked(next);
    writeDetachLocked(next);
  }, []);

  const handlePositionChange = useCallback((next) => {
    const clamped = clampPosition(next.x, next.y);
    setPosition(clamped);
    writeDetachPosition(clamped);
  }, []);

  const { onTitleBarPointerDown } = usePanelDrag({
    enabled: true,
    locked,
    initialPosition: position,
    onPositionChange: handlePositionChange,
  });

  const subtitle = useMemo(
    () =>
      `${locations.length} active unit${locations.length === 1 ? "" : "s"} · detached panel`,
    [locations.length]
  );

  return (
    <div
      className="pointer-events-auto fixed z-[650]"
      style={{
        left: position.x,
        top: position.y,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
      }}
    >
      <PatrolStatusDetachFrame
        subtitle={subtitle}
        locked={locked}
        onLockedChange={handleLockedChange}
        onDock={onDock}
        onOpenWindow={externalWindowActive ? undefined : onOpenWindow}
        onTitleBarPointerDown={onTitleBarPointerDown}
        dragHint={
          locked
            ? null
            : "Drag title bar to move · unlock lock icon to reposition"
        }
      >
        <PatrolStatusListPanel
          locations={locations}
          selectedPatrolKey={selectedPatrolKey}
          onSelectPatrol={onSelectPatrol}
          nowMs={nowMs}
          intervalSeconds={intervalSeconds}
          showHeader={false}
          embedded
        />
      </PatrolStatusDetachFrame>
    </div>
  );
}
