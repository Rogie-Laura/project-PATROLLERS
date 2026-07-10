"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.hydrometOverlays";

function readHydrometOverlays() {
  if (typeof window === "undefined") {
    return { showFloodProne: false, showStormSurge: false };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { showFloodProne: false, showStormSurge: false };
    const parsed = JSON.parse(raw);
    return {
      showFloodProne: parsed.showFloodProne === true,
      showStormSurge: parsed.showStormSurge === true,
    };
  } catch {
    return { showFloodProne: false, showStormSurge: false };
  }
}

function writeHydrometOverlays(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Session-persisted flood-prone and storm-surge overlay toggles. */
export function useHydrometOverlay() {
  const [overlays, setOverlaysState] = useState({
    showFloodProne: false,
    showStormSurge: false,
  });

  useEffect(() => {
    setOverlaysState(readHydrometOverlays());
  }, []);

  const setOverlays = useCallback((next) => {
    setOverlaysState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeHydrometOverlays(value);
      return value;
    });
  }, []);

  const setShowFloodProne = useCallback(
    (next) => {
      setOverlays((prev) => ({
        ...prev,
        showFloodProne: typeof next === "function" ? next(prev.showFloodProne) : next,
      }));
    },
    [setOverlays],
  );

  const setShowStormSurge = useCallback(
    (next) => {
      setOverlays((prev) => ({
        ...prev,
        showStormSurge: typeof next === "function" ? next(prev.showStormSurge) : next,
      }));
    },
    [setOverlays],
  );

  return {
    showFloodProne: overlays.showFloodProne,
    setShowFloodProne,
    showStormSurge: overlays.showStormSurge,
    setShowStormSurge,
  };
}
