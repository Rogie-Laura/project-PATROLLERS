"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.showTaalDangerZones";

function readShowTaalDangerZones() {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeShowTaalDangerZones(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Session-persisted Taal km danger-zone ring overlay for the command map. */
export function useTaalDangerZoneOverlay() {
  const [showTaalDangerZones, setShowTaalDangerZonesState] = useState(false);

  useEffect(() => {
    setShowTaalDangerZonesState(readShowTaalDangerZones());
  }, []);

  const setShowTaalDangerZones = useCallback((next) => {
    setShowTaalDangerZonesState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeShowTaalDangerZones(value);
      return value;
    });
  }, []);

  return [showTaalDangerZones, setShowTaalDangerZones];
}
