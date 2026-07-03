"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SMART_LOCATOR_MENU } from "@/lib/smartLocator/categories";

const MAIN_WIDTH = 200;
const SUB_WIDTH = 210;
const MAIN_ROW_HEIGHT = 26;
const SUB_ROW_HEIGHT = 24;
const MENU_MAX_HEIGHT = 360;
const VIEWPORT_PADDING = 8;
const SUBMENU_GAP = 4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function estimateMenuHeight(rowCount, rowHeight) {
  return Math.min(rowCount * rowHeight + 6, MENU_MAX_HEIGHT);
}

function computeMainPosition(menu, viewportWidth, viewportHeight) {
  const mainHeight = estimateMenuHeight(SMART_LOCATOR_MENU.length, MAIN_ROW_HEIGHT);

  return {
    left: clamp(menu.clientX, VIEWPORT_PADDING, viewportWidth - MAIN_WIDTH - VIEWPORT_PADDING),
    top: clamp(menu.clientY, VIEWPORT_PADDING, viewportHeight - mainHeight - VIEWPORT_PADDING),
    height: mainHeight,
  };
}

function computeSubmenuPosition({
  mainLeft,
  mainTop,
  submenuTop,
  itemCount,
  viewportWidth,
  viewportHeight,
}) {
  const subHeight = estimateMenuHeight(itemCount, SUB_ROW_HEIGHT);
  const openToRight = mainLeft + MAIN_WIDTH + SUB_WIDTH + VIEWPORT_PADDING <= viewportWidth;
  const left = openToRight ? MAIN_WIDTH + SUBMENU_GAP : -SUB_WIDTH - SUBMENU_GAP;

  let top = submenuTop;
  const viewportSubTop = mainTop + top;
  const overflowBottom = viewportSubTop + subHeight - (viewportHeight - VIEWPORT_PADDING);

  if (overflowBottom > 0) {
    top = Math.max(0, top - overflowBottom);
  }

  const maxTop = Math.max(0, viewportHeight - VIEWPORT_PADDING - mainTop - subHeight);
  top = clamp(top, 0, maxTop);

  return { left, top, width: SUB_WIDTH, maxHeight: subHeight };
}

export default function SmartLocatorPlotMenu({ menu, onSelect, onClose }) {
  const [activeGroupKey, setActiveGroupKey] = useState(null);
  const [submenuTop, setSubmenuTop] = useState(0);
  const mainRef = useRef(null);

  useEffect(() => {
    if (!menu) {
      setActiveGroupKey(null);
    }
  }, [menu]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  const mainPosition = useMemo(() => {
    if (!menu) return null;
    return computeMainPosition(menu, viewportWidth, viewportHeight);
  }, [menu, viewportWidth, viewportHeight]);

  const activeGroup = SMART_LOCATOR_MENU.find((group) => group.key === activeGroupKey);

  const submenuPosition = useMemo(() => {
    if (!menu || !mainPosition || !activeGroup) return null;
    return computeSubmenuPosition({
      mainLeft: mainPosition.left,
      mainTop: mainPosition.top,
      submenuTop,
      itemCount: activeGroup.items.length,
      viewportWidth,
      viewportHeight,
    });
  }, [menu, mainPosition, activeGroup, submenuTop, viewportWidth, viewportHeight]);

  if (!menu || !mainPosition) return null;

  function handleGroupEnter(groupKey, button) {
    setActiveGroupKey(groupKey);
    if (button && mainRef.current) {
      const mainRect = mainRef.current.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setSubmenuTop(buttonRect.top - mainRect.top);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close plot menu"
        className="fixed inset-0 z-[1400] cursor-default bg-transparent"
        onClick={onClose}
      />

      <div
        className="fixed z-[1500]"
        style={{ left: mainPosition.left, top: mainPosition.top }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={mainRef}
          className="overflow-y-auto rounded-lg border border-border/70 bg-card py-0.5 shadow-xl"
          style={{ width: MAIN_WIDTH, maxHeight: mainPosition.height }}
        >
          {SMART_LOCATOR_MENU.map((group) => (
            <button
              key={group.key}
              type="button"
              onMouseEnter={(event) => handleGroupEnter(group.key, event.currentTarget)}
              onFocus={(event) => handleGroupEnter(group.key, event.currentTarget)}
              className={`flex w-full items-center justify-between gap-1.5 px-2 py-1 text-left text-[11px] leading-tight transition ${
                activeGroupKey === group.key
                  ? "bg-accent/10 text-foreground"
                  : "text-foreground hover:bg-background/80"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="truncate">{group.label}</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted">›</span>
            </button>
          ))}
        </div>

        {activeGroup && submenuPosition && (
          <div
            className="absolute overflow-y-auto rounded-lg border border-border/70 bg-card py-0.5 shadow-xl"
            style={{
              left: submenuPosition.left,
              top: submenuPosition.top,
              width: submenuPosition.width,
              maxHeight: submenuPosition.maxHeight,
            }}
            onMouseLeave={() => setActiveGroupKey(null)}
          >
            {activeGroup.items.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() =>
                  onSelect({
                    category: activeGroup.key,
                    subcategory: entry.key,
                    categoryLabel: activeGroup.label,
                    subcategoryLabel: entry.label,
                  })
                }
                className="block w-full px-2 py-1 text-left text-[11px] leading-tight text-foreground transition hover:bg-background/80"
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
