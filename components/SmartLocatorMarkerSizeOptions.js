"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  getSmartLocatorMarkerSizePreset,
  getSmartLocatorMarkerSizeTable,
  SMART_LOCATOR_MARKER_SIZE_PRESETS,
} from "@/lib/smartLocator/markerSize";

const STORAGE_KEY = "patrollers.smartLocator.markerSizePreset";

function readPreset() {
  if (typeof window === "undefined") return DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (
      SMART_LOCATOR_MARKER_SIZE_PRESETS.some((preset) => preset.id === raw)
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET;
}

function writePreset(presetId) {
  try {
    sessionStorage.setItem(STORAGE_KEY, presetId);
  } catch {
    /* ignore */
  }
}

/** Session-persisted marker size preset for Smart Locator. */
export function useSmartLocatorMarkerSize() {
  const [presetId, setPresetIdState] = useState(
    DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET
  );

  useEffect(() => {
    setPresetIdState(readPreset());
  }, []);

  const setPresetId = useCallback((next) => {
    setPresetIdState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const resolved = getSmartLocatorMarkerSizePreset(value).id;
      writePreset(resolved);
      return resolved;
    });
  }, []);

  return { presetId, setPresetId };
}

export default function SmartLocatorMarkerSizeOptions({
  presetId,
  onPresetChange,
  currentZoom = null,
}) {
  const [open, setOpen] = useState(false);
  const active = getSmartLocatorMarkerSizePreset(presetId);
  const sizeTable = getSmartLocatorMarkerSizeTable(presetId);
  const currentZoomRounded =
    currentZoom != null && Number.isFinite(currentZoom)
      ? Math.round(currentZoom)
      : null;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-[550]">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {open && (
          <div
            className="w-[min(100vw-1.5rem,280px)] overflow-hidden rounded-xl border border-zinc-600/45 bg-zinc-800/94 shadow-lg shadow-black/30 backdrop-blur-sm"
            role="dialog"
            aria-label="Marker size options"
          >
            <header className="border-b border-zinc-600/40 bg-zinc-900/50 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                Marker size
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Size changes with zoom in / zoom out
              </p>
            </header>

            <div className="space-y-3 px-3.5 py-3">
              <div className="grid grid-cols-4 gap-1.5">
                {SMART_LOCATOR_MARKER_SIZE_PRESETS.map((preset) => {
                  const isActive = preset.id === active.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onPresetChange(preset.id)}
                      aria-pressed={isActive}
                      title={preset.description}
                      className={`rounded-lg border px-1.5 py-2 text-center transition ${
                        isActive
                          ? "border-accent/60 bg-accent/15 text-accent"
                          : "border-zinc-600/50 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700/50"
                      }`}
                    >
                      <span className="block text-sm font-bold leading-none">
                        {preset.shortLabel}
                      </span>
                      <span className="mt-1 block truncate text-[9px] font-medium leading-tight opacity-80">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] leading-snug text-zinc-400">
                {active.description}
              </p>

              <div className="overflow-hidden rounded-lg border border-zinc-600/40">
                <div className="grid grid-cols-2 border-b border-zinc-600/40 bg-zinc-900/55 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <span>Zoom</span>
                  <span className="text-right">Size (px)</span>
                </div>
                <ul className="max-h-[220px] overflow-y-auto">
                  {sizeTable.map(({ zoom, sizePx }) => {
                    const isCurrent =
                      currentZoomRounded != null &&
                      currentZoomRounded === zoom;
                    return (
                      <li
                        key={zoom}
                        className={`grid grid-cols-2 px-2.5 py-1.5 text-xs tabular-nums ${
                          isCurrent
                            ? "bg-accent/15 text-accent"
                            : "text-zinc-200 odd:bg-zinc-900/25"
                        }`}
                      >
                        <span>
                          {zoom}
                          {isCurrent ? " · now" : ""}
                        </span>
                        <span className="text-right font-semibold">{sizePx}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? "Close marker size options" : "Open marker size options"}
          title="Marker size"
          className={`flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-lg shadow-black/25 backdrop-blur-sm transition ${
            open
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-zinc-600/50 bg-zinc-800/95 text-zinc-100 hover:border-zinc-500/70 hover:bg-zinc-700/95"
          }`}
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 3.5a1.5 1.5 0 011.415.986l.04.114.5 1.75a.75.75 0 00.58.54l1.82.35a1.5 1.5 0 01.86 2.42l-.08.1-1.25 1.35a.75.75 0 00-.2.58l.2 1.84a1.5 1.5 0 01-2.05 1.5l-.12-.05-1.65-.82a.75.75 0 00-.66 0l-1.65.82a1.5 1.5 0 01-2.17-1.45l.2-1.84a.75.75 0 00-.2-.58l-1.25-1.35a1.5 1.5 0 01.78-2.52l1.82-.35a.75.75 0 00.58-.54l.5-1.75A1.5 1.5 0 0110 3.5z" />
          </svg>
          <span>Size {active.shortLabel}</span>
        </button>
      </div>
    </div>
  );
}
