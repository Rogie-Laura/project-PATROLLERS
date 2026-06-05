"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag a fixed panel by its title bar. Clamps position inside the viewport.
 */
export function usePanelDrag({ enabled, locked, initialPosition, onPositionChange }) {
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onTitleBarPointerDown = useCallback(
    (event) => {
      if (locked || !enabled || event.button !== 0) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: initialPosition.x,
        originY: initialPosition.y,
      };

      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [enabled, locked, initialPosition.x, initialPosition.y]
  );

  useEffect(() => {
    if (!dragging) return undefined;

    function handlePointerMove(event) {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextX = drag.originX + dx;
      const nextY = drag.originY + dy;

      onPositionChange({ x: nextX, y: nextY });
    }

    function handlePointerUp(event) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      dragRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, onPositionChange]);

  return { onTitleBarPointerDown, dragging };
}
