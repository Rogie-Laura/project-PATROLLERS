"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag the browser pop-out window using its custom title bar (when the browser allows moveTo).
 */
export function useWindowDrag({ locked }) {
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [moveBlocked, setMoveBlocked] = useState(false);

  const onTitleBarPointerDown = useCallback(
    (event) => {
      if (locked || event.button !== 0) return;
      if (typeof window === "undefined") return;

      dragRef.current = {
        pointerId: event.pointerId,
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        winX: window.screenX,
        winY: window.screenY,
      };

      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [locked]
  );

  useEffect(() => {
    if (!dragging) return undefined;

    function handlePointerMove(event) {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = event.screenX - drag.startScreenX;
      const dy = event.screenY - drag.startScreenY;
      const nextX = Math.max(0, drag.winX + dx);
      const nextY = Math.max(0, drag.winY + dy);

      try {
        window.moveTo(nextX, nextY);
        setMoveBlocked(false);
      } catch {
        setMoveBlocked(true);
      }
    }

    function endDrag(event) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging]);

  return { onTitleBarPointerDown, dragging, moveBlocked };
}
