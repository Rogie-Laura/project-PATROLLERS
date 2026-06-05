"use client";

import { useCallback, useEffect, useState } from "react";

const KEYS = {
  patrolStatus: "patrollers.map.showPatrolStatus",
  legend: "patrollers.map.showLegend",
  statistics: "patrollers.map.showStatistics",
};

function readBool(key, defaultValue) {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

function writeBool(key, value) {
  try {
    sessionStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Map View menu: patrol status panel/markers, legend, and statistics overlays. */
export function useMapViewOptions() {
  const [showPatrolStatus, setShowPatrolStatusState] = useState(true);
  const [showLegend, setShowLegendState] = useState(true);
  const [showStatistics, setShowStatisticsState] = useState(false);

  useEffect(() => {
    setShowPatrolStatusState(readBool(KEYS.patrolStatus, true));
    setShowLegendState(readBool(KEYS.legend, true));
    setShowStatisticsState(readBool(KEYS.statistics, false));
  }, []);

  const setShowPatrolStatus = useCallback((next) => {
    setShowPatrolStatusState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeBool(KEYS.patrolStatus, value);
      return value;
    });
  }, []);

  const setShowLegend = useCallback((next) => {
    setShowLegendState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeBool(KEYS.legend, value);
      return value;
    });
  }, []);

  const setShowStatistics = useCallback((next) => {
    setShowStatisticsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeBool(KEYS.statistics, value);
      return value;
    });
  }, []);

  return {
    showPatrolStatus,
    setShowPatrolStatus,
    showLegend,
    setShowLegend,
    showStatistics,
    setShowStatistics,
  };
}
