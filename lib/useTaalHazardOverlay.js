"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeTaalHazardLayerIds } from "@/lib/mapTaalHazardOverlay";

const STORAGE_KEY = "patrollers.map.taalHazardLayers";

function readTaalHazardLayers() {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeTaalHazardLayerIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeTaalHazardLayers(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Session-persisted Taal volcano hazard overlay toggles for the command map. */
export function useTaalHazardOverlay() {
  const [taalHazardLayers, setTaalHazardLayersState] = useState([]);

  useEffect(() => {
    setTaalHazardLayersState(readTaalHazardLayers());
  }, []);

  const setTaalHazardLayers = useCallback((next) => {
    setTaalHazardLayersState((prev) => {
      const value = normalizeTaalHazardLayerIds(
        typeof next === "function" ? next(prev) : next,
      );
      writeTaalHazardLayers(value);
      return value;
    });
  }, []);

  const toggleTaalHazardLayer = useCallback((layerId) => {
    setTaalHazardLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId],
    );
  }, [setTaalHazardLayers]);

  return { taalHazardLayers, setTaalHazardLayers, toggleTaalHazardLayer };
}
