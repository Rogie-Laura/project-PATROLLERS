"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.showPatrolStatus";

function readShowPatrolStatus() {
  if (typeof window === "undefined") return true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeShowPatrolStatus(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Persists patrol-status overlay toggle across map / review / settings navigation. */
export function useShowPatrolStatus() {
  const [showPatrolStatus, setShowPatrolStatusState] = useState(true);

  useEffect(() => {
    setShowPatrolStatusState(readShowPatrolStatus());
  }, []);

  const setShowPatrolStatus = useCallback((next) => {
    setShowPatrolStatusState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeShowPatrolStatus(value);
      return value;
    });
  }, []);

  return [showPatrolStatus, setShowPatrolStatus];
}
