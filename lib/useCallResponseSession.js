"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "patrollers.map.callResponses.ui";

const EMPTY = {
  selectedCallId: null,
  dispatchRoute: null,
  highlightedUnitKey: null,
};

function readUiSession() {
  if (typeof window === "undefined") return { ...EMPTY };

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };

    const data = JSON.parse(raw);
    const dispatchRoute =
      data?.dispatchRoute &&
      typeof data.dispatchRoute === "object" &&
      Array.isArray(data.dispatchRoute.coordinates)
        ? data.dispatchRoute
        : null;

    return {
      selectedCallId:
        typeof data?.selectedCallId === "string" ? data.selectedCallId : null,
      dispatchRoute,
      highlightedUnitKey:
        typeof data?.highlightedUnitKey === "string"
          ? data.highlightedUnitKey
          : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeUiSession(payload) {
  try {
    if (
      !payload.selectedCallId &&
      !payload.dispatchRoute &&
      !payload.highlightedUnitKey
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearCallResponseSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Persists dispatch UI selection across page navigation (incidents live in DB). */
export function useCallResponseSession() {
  const [selectedCallId, setSelectedCallIdState] = useState(null);
  const [dispatchRoute, setDispatchRouteState] = useState(null);
  const [highlightedUnitKey, setHighlightedUnitKeyState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readUiSession();
    setSelectedCallIdState(saved.selectedCallId);
    setDispatchRouteState(saved.dispatchRoute);
    setHighlightedUnitKeyState(saved.highlightedUnitKey);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeUiSession({
      selectedCallId,
      dispatchRoute,
      highlightedUnitKey,
    });
  }, [selectedCallId, dispatchRoute, highlightedUnitKey, hydrated]);

  const setSelectedCallId = useCallback((next) => {
    setSelectedCallIdState((prev) =>
      typeof next === "function" ? next(prev) : next
    );
  }, []);

  const setDispatchRoute = useCallback((next) => {
    setDispatchRouteState((prev) =>
      typeof next === "function" ? next(prev) : next
    );
  }, []);

  const setHighlightedUnitKey = useCallback((next) => {
    setHighlightedUnitKeyState((prev) =>
      typeof next === "function" ? next(prev) : next
    );
  }, []);

  return {
    selectedCallId,
    setSelectedCallId,
    dispatchRoute,
    setDispatchRoute,
    highlightedUnitKey,
    setHighlightedUnitKey,
    hydrated,
  };
}
