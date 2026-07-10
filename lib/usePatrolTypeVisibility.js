"use client";

import { useCallback, useEffect, useState } from "react";
import { PATROL_UNIT_TYPES } from "@/lib/patrolUnitTypes";

const STORAGE_KEY = "patrollers.map.patrolTypeVisibility";

export function createDefaultPatrolTypeVisibility() {
  return Object.fromEntries(PATROL_UNIT_TYPES.map((type) => [type.id, true]));
}

function readPatrolTypeVisibility() {
  if (typeof window === "undefined") return createDefaultPatrolTypeVisibility();

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultPatrolTypeVisibility();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return createDefaultPatrolTypeVisibility();
    }

    return Object.fromEntries(
      PATROL_UNIT_TYPES.map((type) => [
        type.id,
        parsed[type.id] !== false,
      ])
    );
  } catch {
    return createDefaultPatrolTypeVisibility();
  }
}

function writePatrolTypeVisibility(visibility) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    /* ignore */
  }
}

/** Session-persisted show/hide toggles per patrol unit type on the command map. */
export function usePatrolTypeVisibility() {
  const [visibility, setVisibilityState] = useState(createDefaultPatrolTypeVisibility);

  useEffect(() => {
    setVisibilityState(readPatrolTypeVisibility());
  }, []);

  const setVisibility = useCallback((typeId, next) => {
    setVisibilityState((prev) => {
      const value = typeof next === "function" ? next(prev[typeId]) : next;
      const updated = { ...prev, [typeId]: Boolean(value) };
      writePatrolTypeVisibility(updated);
      return updated;
    });
  }, []);

  const setAllVisible = useCallback((visible) => {
    setVisibilityState(() => {
      const updated = createDefaultPatrolTypeVisibility();
      if (!visible) {
        for (const type of PATROL_UNIT_TYPES) {
          updated[type.id] = false;
        }
      }
      writePatrolTypeVisibility(updated);
      return updated;
    });
  }, []);

  return { visibility, setVisibility, setAllVisible };
}
