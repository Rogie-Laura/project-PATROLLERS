"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.showEstablishments";

function readShowEstablishments() {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

function writeShowEstablishments(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Persists establishments overlay toggle for the command map. */
export function useEstablishmentOverlay() {
  const [showEstablishments, setShowEstablishmentsState] = useState(false);

  useEffect(() => {
    setShowEstablishmentsState(readShowEstablishments());
  }, []);

  const setShowEstablishments = useCallback((next) => {
    setShowEstablishmentsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeShowEstablishments(value);
      return value;
    });
  }, []);

  return [showEstablishments, setShowEstablishments];
}
