"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPatrolStatusPopoutChannel,
  openPatrolStatusPopoutWindow,
  POPOUT_MESSAGE,
  postPopoutMessage,
} from "@/lib/patrolStatusPopout";

/**
 * Detaches patrol status from the map sidebar (floating panel) with optional external window.
 */
export function usePatrolStatusPopout({
  enabled,
  selectedPatrolKey,
  onSelectLocation,
}) {
  const popoutRef = useRef(null);
  const [detached, setDetached] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [popoutBlocked, setPopoutBlocked] = useState(false);

  const closeExternal = useCallback(() => {
    const win = popoutRef.current;
    if (win && !win.closed) {
      win.close();
    }
    popoutRef.current = null;
    setExternalOpen(false);
  }, []);

  const closeDetach = useCallback(() => {
    closeExternal();
    setDetached(false);
  }, [closeExternal]);

  const openExternal = useCallback(() => {
    setPopoutBlocked(false);

    const existing = popoutRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      setExternalOpen(true);
      setDetached(true);
      return true;
    }

    const win = openPatrolStatusPopoutWindow();
    if (!win) {
      setPopoutBlocked(true);
      return false;
    }

    popoutRef.current = win;
    setExternalOpen(true);
    setDetached(true);
    return true;
  }, []);

  const openDetach = useCallback(() => {
    setDetached(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      closeDetach();
    }
  }, [enabled, closeDetach]);

  useEffect(() => {
    const channel = createPatrolStatusPopoutChannel();
    if (!channel) return undefined;

    channel.onmessage = (event) => {
      const { type, payload } = event.data ?? {};

      if (type === POPOUT_MESSAGE.SELECT_UNIT && payload?.location) {
        onSelectLocation(payload.location);
      }

      if (type === POPOUT_MESSAGE.POPOUT_OPEN) {
        setExternalOpen(true);
        setDetached(true);
      }

      if (type === POPOUT_MESSAGE.POPOUT_CLOSED) {
        popoutRef.current = null;
        setExternalOpen(false);
      }
    };

    return () => channel.close();
  }, [onSelectLocation]);

  useEffect(() => {
    if (!externalOpen) return undefined;

    const channel = createPatrolStatusPopoutChannel();
    postPopoutMessage(channel, POPOUT_MESSAGE.SYNC_SELECTION, {
      unitKey: selectedPatrolKey,
    });
    channel?.close();

    return undefined;
  }, [selectedPatrolKey, externalOpen]);

  useEffect(() => {
    if (!externalOpen) return undefined;

    const id = setInterval(() => {
      const win = popoutRef.current;
      if (win && win.closed) {
        popoutRef.current = null;
        setExternalOpen(false);
      }
    }, 400);

    return () => clearInterval(id);
  }, [externalOpen]);

  return {
    detached,
    externalOpen,
    popoutActive: detached || externalOpen,
    popoutBlocked,
    openDetach,
    openExternal,
    closeDetach,
  };
}
