"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CELL_COVERAGE_LAYER_IDS,
  createDefaultCellCoverageLayers,
} from "@/lib/cellCoverageLayers";

const STORAGE_PREFIX = "patrollers.map.coverage.";

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

/** Map Overlay cell-coverage toggles (session-persisted). */
export function useCellCoverageLayers() {
  const [layers, setLayersState] = useState(createDefaultCellCoverageLayers);

  useEffect(() => {
    setLayersState(
      Object.fromEntries(
        CELL_COVERAGE_LAYER_IDS.map((id) => [
          id,
          readBool(`${STORAGE_PREFIX}${id}`, false),
        ])
      )
    );
  }, []);

  const setLayer = useCallback((id, next) => {
    setLayersState((prev) => {
      const value = typeof next === "function" ? next(prev[id]) : next;
      writeBool(`${STORAGE_PREFIX}${id}`, value);
      return { ...prev, [id]: value };
    });
  }, []);

  return { layers, setLayer };
}
