"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPatrolStatusPopoutChannel,
  openPatrolStatusPopoutWindow,
  POPOUT_MESSAGE,
  postPopoutMessage,
} from "@/lib/patrolStatusPopout";

/**
 * Opens Patrol Status in a separate browser window and syncs unit selection with the map.
 */
export function usePatrolStatusPopout({
  enabled,
  selectedPatrolKey,
  onSelectLocation,
}) {
  const popoutRef = useRef(null);
  const [popoutActive, setPopoutActive] = useState(false);
  const [popoutBlocked, setPopoutBlocked] = useState(false);

  const closePopout = useCallback(() => {
    const win = popoutRef.current;
    if (win && !win.closed) {
      win.close();
    }
    popoutRef.current = null;
    setPopoutActive(false);
  }, []);

  const openPopout = useCallback(() => {
    setPopoutBlocked(false);

    const existing = popoutRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      setPopoutActive(true);
      return;
    }

    const win = openPatrolStatusPopoutWindow();
    if (!win) {
      setPopoutBlocked(true);
      return;
    }

    popoutRef.current = win;
    setPopoutActive(true);
  }, []);

  const togglePopout = useCallback(() => {
    if (popoutActive) {
      closePopout();
    } else {
      openPopout();
    }
  }, [popoutActive, closePopout, openPopout]);

  useEffect(() => {
    if (!enabled) {
      closePopout();
    }
  }, [enabled, closePopout]);

  useEffect(() => {
    const channel = createPatrolStatusPopoutChannel();
    if (!channel) return undefined;

    channel.onmessage = (event) => {
      const { type, payload } = event.data ?? {};

      if (type === POPOUT_MESSAGE.SELECT_UNIT && payload?.location) {
        onSelectLocation(payload.location);
      }

      if (type === POPOUT_MESSAGE.POPOUT_OPEN) {
        setPopoutActive(true);
      }

      if (type === POPOUT_MESSAGE.POPOUT_CLOSED) {
        popoutRef.current = null;
        setPopoutActive(false);
      }
    };

    return () => channel.close();
  }, [onSelectLocation]);

  useEffect(() => {
    if (!popoutActive) return undefined;

    const channel = createPatrolStatusPopoutChannel();
    postPopoutMessage(channel, POPOUT_MESSAGE.SYNC_SELECTION, {
      unitKey: selectedPatrolKey,
    });
    channel?.close();

    return undefined;
  }, [selectedPatrolKey, popoutActive]);

  useEffect(() => {
    if (!popoutActive) return undefined;

    const id = setInterval(() => {
      const win = popoutRef.current;
      if (win && win.closed) {
        popoutRef.current = null;
        setPopoutActive(false);
      }
    }, 400);

    return () => clearInterval(id);
  }, [popoutActive]);

  return {
    popoutActive,
    popoutBlocked,
    openPopout,
    closePopout,
    togglePopout,
  };
}
