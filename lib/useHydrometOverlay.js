"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.showStormSurge";

function readShowStormSurge() {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeShowStormSurge(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Session-persisted storm-surge overlay toggle for the command map. */
export function useHydrometOverlay() {
  const [showStormSurge, setShowStormSurgeState] = useState(false);

  useEffect(() => {
    setShowStormSurgeState(readShowStormSurge());
  }, []);

  const setShowStormSurge = useCallback((next) => {
    setShowStormSurgeState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeShowStormSurge(value);
      return value;
    });
  }, []);

  return { showStormSurge, setShowStormSurge };
}
