"use client";

import { useEffect, useRef, useState } from "react";
import { SMART_LOCATOR_MENU } from "@/lib/smartLocator/categories";

export default function SmartLocatorPlotMenu({ menu, onSelect, onClose }) {
  const [activeGroupKey, setActiveGroupKey] = useState(null);
  const mainRef = useRef(null);
  const [submenuTop, setSubmenuTop] = useState(0);

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

  if (!menu) return null;

  const activeGroup = SMART_LOCATOR_MENU.find((group) => group.key === activeGroupKey);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const mainLeft = Math.min(menu.clientX, viewportWidth - 280);
  const mainTop = Math.min(menu.clientY, viewportHeight - 420);
  const submenuLeft = mainLeft + 248;
  const submenuWidth = 260;

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
        style={{ left: mainLeft, top: mainTop }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={mainRef}
          className="max-h-[min(70vh,420px)] min-w-[240px] overflow-y-auto rounded-lg border border-border/70 bg-card py-1 shadow-xl"
        >
          <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Plot on map
          </p>

          {SMART_LOCATOR_MENU.map((group) => (
            <button
              key={group.key}
              type="button"
              onMouseEnter={(event) => handleGroupEnter(group.key, event.currentTarget)}
              onFocus={(event) => handleGroupEnter(group.key, event.currentTarget)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                activeGroupKey === group.key
                  ? "bg-accent/10 text-foreground"
                  : "text-foreground hover:bg-background/80"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="truncate">{group.label}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">›</span>
            </button>
          ))}
        </div>

        {activeGroup && (
          <div
            className="absolute max-h-[min(70vh,420px)] min-w-[240px] overflow-y-auto rounded-lg border border-border/70 bg-card py-1 shadow-xl"
            style={{
              left: submenuLeft + submenuWidth > viewportWidth ? -submenuWidth - 8 : 248,
              top: submenuTop,
              width: submenuWidth,
            }}
            onMouseLeave={() => setActiveGroupKey(null)}
          >
            <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold text-foreground">
              {activeGroup.label}
            </p>
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
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-background/80"
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
