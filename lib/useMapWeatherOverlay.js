"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAP_WEATHER_OVERLAY_NONE,
  normalizeWeatherOverlayId,
} from "@/lib/mapWeatherOverlay";

const STORAGE_KEY = "patrollers.map.weatherOverlay";

function readOverlayId() {
  if (typeof window === "undefined") return MAP_WEATHER_OVERLAY_NONE;
  try {
    return normalizeWeatherOverlayId(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return MAP_WEATHER_OVERLAY_NONE;
  }
}

function writeOverlayId(id) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Session-persisted weather overlay selection for the command map. */
export function useMapWeatherOverlay() {
  const [weatherOverlay, setWeatherOverlayState] = useState(MAP_WEATHER_OVERLAY_NONE);

  useEffect(() => {
    setWeatherOverlayState(readOverlayId());
  }, []);

  const setWeatherOverlay = useCallback((next) => {
    setWeatherOverlayState((prev) => {
      const value = normalizeWeatherOverlayId(
        typeof next === "function" ? next(prev) : next
      );
      writeOverlayId(value);
      return value;
    });
  }, []);

  return { weatherOverlay, setWeatherOverlay };
}
