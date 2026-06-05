"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDefaultMapViewLayers,
  MAP_VIEW_LAYER_IDS,
} from "@/lib/mapViewLayers";

const STORAGE_KEYS = {
  legend: "patrollers.map.showLegend",
  pnpStations: "patrollers.map.view.pnpStations",
  friendlyUnit: "patrollers.map.view.friendlyUnit",
  crimeEnvironment: "patrollers.map.view.crimeEnvironment",
  patrolStatus: "patrollers.map.showPatrolStatus",
  signalStats: "patrollers.map.view.signalStats",
};

const LEGACY_KEYS = {
  signalStats: "patrollers.map.showStatistics",
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

function readLayer(id) {
  const key = STORAGE_KEYS[id];
  const legacy = LEGACY_KEYS[id];
  if (legacy) {
    const legacyValue = sessionStorage.getItem(legacy);
    if (legacyValue === "0" || legacyValue === "false") return false;
    if (legacyValue === "1" || legacyValue === "true") return true;
  }
  return readBool(key, false);
}

/** Map View menu layer toggles (session-persisted). */
export function useMapViewOptions() {
  const [layers, setLayersState] = useState(createDefaultMapViewLayers);

  useEffect(() => {
    setLayersState(
      Object.fromEntries(MAP_VIEW_LAYER_IDS.map((id) => [id, readLayer(id)]))
    );
  }, []);

  const setLayer = useCallback((id, next) => {
    setLayersState((prev) => {
      const value = typeof next === "function" ? next(prev[id]) : next;
      writeBool(STORAGE_KEYS[id], value);
      return { ...prev, [id]: value };
    });
  }, []);

  const setShowPatrolStatus = useCallback(
    (next) => setLayer("patrolStatus", next),
    [setLayer]
  );
  const setShowLegend = useCallback(
    (next) => setLayer("legend", next),
    [setLayer]
  );
  const setShowSignalStats = useCallback(
    (next) => setLayer("signalStats", next),
    [setLayer]
  );
  const setShowPnpStations = useCallback(
    (next) => setLayer("pnpStations", next),
    [setLayer]
  );
  const setShowFriendlyUnit = useCallback(
    (next) => setLayer("friendlyUnit", next),
    [setLayer]
  );
  const setShowCrimeEnvironment = useCallback(
    (next) => setLayer("crimeEnvironment", next),
    [setLayer]
  );

  return {
    layers,
    setLayer,
    showLegend: layers.legend,
    setShowLegend,
    showPnpStations: layers.pnpStations,
    setShowPnpStations,
    showFriendlyUnit: layers.friendlyUnit,
    setShowFriendlyUnit,
    showCrimeEnvironment: layers.crimeEnvironment,
    setShowCrimeEnvironment,
    showPatrolStatus: layers.patrolStatus,
    setShowPatrolStatus,
    showSignalStats: layers.signalStats,
    setShowSignalStats,
    /** @deprecated use showSignalStats */
    showStatistics: layers.signalStats,
    /** @deprecated use setShowSignalStats */
    setShowStatistics: setShowSignalStats,
  };
}
