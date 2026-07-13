"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDefaultSmartLocatorCustomSizes,
  DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  getSmartLocatorMarkerSizePreset,
  getSmartLocatorMarkerSizeTable,
  normalizeSmartLocatorCustomSizes,
  normalizeSmartLocatorMarkerSizeSetting,
  SMART_LOCATOR_CUSTOM_PRESET_ID,
  SMART_LOCATOR_MARKER_SIZE_MAX_PX,
  SMART_LOCATOR_MARKER_SIZE_MIN_PX,
  SMART_LOCATOR_MARKER_SIZE_PRESETS,
} from "@/lib/smartLocator/markerSize";

const REFRESH_MS = 20_000;

async function fetchMarkerSizeSetting() {
  const res = await fetch("/api/smart-locator/marker-size");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not load marker size.");
  }
  return normalizeSmartLocatorMarkerSizeSetting(data.setting);
}

async function saveMarkerSizeSetting(presetId, customSizes) {
  const res = await fetch("/api/smart-locator/marker-size", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presetId, customSizes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Could not save marker size.");
  }
  return normalizeSmartLocatorMarkerSizeSetting(data.setting);
}

/**
 * System-wide Smart Locator marker size.
 * All accounts read the same setting; only System Administrator can persist changes.
 */
export function useSmartLocatorMarkerSize({ canEdit = false } = {}) {
  const [presetId, setPresetIdState] = useState(
    DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET
  );
  const [customSizes, setCustomSizesState] = useState(
    createDefaultSmartLocatorCustomSizes
  );
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canEditRef = useRef(canEdit);
  const skipNextRefreshRef = useRef(false);
  const saveTimerRef = useRef(null);
  const latestRef = useRef({
    presetId: DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
    customSizes: createDefaultSmartLocatorCustomSizes(),
  });

  canEditRef.current = canEdit;

  const applySetting = useCallback((setting) => {
    const normalized = normalizeSmartLocatorMarkerSizeSetting(setting);
    latestRef.current = {
      presetId: normalized.presetId,
      customSizes:
        normalized.customSizes ?? createDefaultSmartLocatorCustomSizes(),
    };
    setPresetIdState(normalized.presetId);
    setCustomSizesState(
      normalized.customSizes ?? createDefaultSmartLocatorCustomSizes()
    );
  }, []);

  const refresh = useCallback(async () => {
    if (skipNextRefreshRef.current) {
      skipNextRefreshRef.current = false;
      return;
    }
    try {
      const setting = await fetchMarkerSizeSetting();
      applySetting(setting);
      setError("");
    } catch (err) {
      if (!loaded) {
        setError(err.message);
      }
    } finally {
      setLoaded(true);
    }
  }, [applySetting, loaded]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);

    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [refresh]);

  const persistSoon = useCallback(
    (nextPresetId, nextCustomSizes) => {
      if (!canEditRef.current) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      saveTimerRef.current = window.setTimeout(async () => {
        setSaving(true);
        setError("");
        try {
          skipNextRefreshRef.current = true;
          const setting = await saveMarkerSizeSetting(
            nextPresetId,
            nextCustomSizes
          );
          applySetting(setting);
        } catch (err) {
          setError(err.message);
          skipNextRefreshRef.current = false;
        } finally {
          setSaving(false);
        }
      }, 250);
    },
    [applySetting]
  );

  const setPresetId = useCallback(
    (next) => {
      if (!canEditRef.current) return;
      setPresetIdState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        const resolved = getSmartLocatorMarkerSizePreset(value).id;
        const custom =
          resolved === SMART_LOCATOR_CUSTOM_PRESET_ID
            ? normalizeSmartLocatorCustomSizes(latestRef.current.customSizes)
            : latestRef.current.customSizes;
        latestRef.current = { presetId: resolved, customSizes: custom };
        persistSoon(
          resolved,
          resolved === SMART_LOCATOR_CUSTOM_PRESET_ID ? custom : null
        );
        return resolved;
      });
    },
    [persistSoon]
  );

  const setCustomSize = useCallback(
    (zoom, sizePx) => {
      if (!canEditRef.current) return;
      setCustomSizesState((prev) => {
        const updated = normalizeSmartLocatorCustomSizes({
          ...prev,
          [String(zoom)]: sizePx,
        });
        latestRef.current = {
          presetId: SMART_LOCATOR_CUSTOM_PRESET_ID,
          customSizes: updated,
        };
        setPresetIdState(SMART_LOCATOR_CUSTOM_PRESET_ID);
        persistSoon(SMART_LOCATOR_CUSTOM_PRESET_ID, updated);
        return updated;
      });
    },
    [persistSoon]
  );

  const resetCustomSizes = useCallback(() => {
    if (!canEditRef.current) return;
    const defaults = createDefaultSmartLocatorCustomSizes();
    latestRef.current = {
      presetId: SMART_LOCATOR_CUSTOM_PRESET_ID,
      customSizes: defaults,
    };
    setCustomSizesState(defaults);
    setPresetIdState(SMART_LOCATOR_CUSTOM_PRESET_ID);
    persistSoon(SMART_LOCATOR_CUSTOM_PRESET_ID, defaults);
  }, [persistSoon]);

  return {
    presetId,
    setPresetId,
    customSizes,
    setCustomSize,
    resetCustomSizes,
    loaded,
    saving,
    error,
  };
}

export default function SmartLocatorMarkerSizeOptions({
  presetId,
  onPresetChange,
  customSizes,
  onCustomSizeChange,
  onResetCustomSizes,
  currentZoom = null,
  saving = false,
  error = "",
}) {
  const [open, setOpen] = useState(false);
  const [draftInputs, setDraftInputs] = useState({});
  const active = getSmartLocatorMarkerSizePreset(presetId);
  const isCustom = presetId === SMART_LOCATOR_CUSTOM_PRESET_ID;
  const sizeTable = getSmartLocatorMarkerSizeTable(presetId, customSizes);
  const currentZoomRounded =
    currentZoom != null && Number.isFinite(currentZoom)
      ? Math.round(currentZoom)
      : null;

  const builtInPresets = SMART_LOCATOR_MARKER_SIZE_PRESETS.filter(
    (preset) => preset.id !== SMART_LOCATOR_CUSTOM_PRESET_ID
  );
  const customPreset = SMART_LOCATOR_MARKER_SIZE_PRESETS.find(
    (preset) => preset.id === SMART_LOCATOR_CUSTOM_PRESET_ID
  );

  function commitCustomSize(zoom, rawValue) {
    const key = String(zoom);
    setDraftInputs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onCustomSizeChange?.(zoom, rawValue);
  }

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-[550]">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {open && (
          <div
            className="w-[min(100vw-1.5rem,300px)] overflow-hidden rounded-xl border border-zinc-600/45 bg-zinc-800/94 shadow-lg shadow-black/30 backdrop-blur-sm"
            role="dialog"
            aria-label="Marker size options"
          >
            <header className="border-b border-zinc-600/40 bg-zinc-900/50 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                Marker size
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                System-wide — applies to all Smart Locator accounts
              </p>
            </header>

            <div className="space-y-3 px-3.5 py-3">
              <div className="grid grid-cols-5 gap-1.5">
                {builtInPresets.map((preset) => {
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

              {customPreset && (
                <button
                  type="button"
                  onClick={() => onPresetChange(customPreset.id)}
                  aria-pressed={isCustom}
                  title={customPreset.description}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isCustom
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-zinc-600/50 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700/50"
                  }`}
                >
                  <span className="block text-xs font-bold">Custom</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">
                    I-edit ang size (px) sa bawat zoom
                  </span>
                </button>
              )}

              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] leading-snug text-zinc-400">
                  {active.description}
                  {saving ? " · Saving..." : ""}
                </p>
                {isCustom && onResetCustomSizes && (
                  <button
                    type="button"
                    onClick={onResetCustomSizes}
                    className="shrink-0 rounded-md border border-zinc-600/50 px-2 py-1 text-[10px] font-medium text-zinc-300 transition hover:bg-zinc-700/60 hover:text-zinc-100"
                  >
                    Reset
                  </button>
                )}
              </div>

              {error ? (
                <p className="rounded-md bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
                  {error}
                </p>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-zinc-600/40">
                <div className="grid grid-cols-2 border-b border-zinc-600/40 bg-zinc-900/55 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <span>Zoom</span>
                  <span className="text-right">Size (px)</span>
                </div>
                <ul className="max-h-[240px] overflow-y-auto">
                  {sizeTable.map(({ zoom, sizePx }) => {
                    const isCurrent =
                      currentZoomRounded != null &&
                      currentZoomRounded === zoom;
                    const key = String(zoom);
                    const inputValue =
                      draftInputs[key] != null
                        ? draftInputs[key]
                        : String(sizePx);

                    return (
                      <li
                        key={zoom}
                        className={`grid grid-cols-2 items-center px-2.5 py-1.5 text-xs tabular-nums ${
                          isCurrent
                            ? "bg-accent/15 text-accent"
                            : "text-zinc-200 odd:bg-zinc-900/25"
                        }`}
                      >
                        <span>
                          {zoom}
                          {isCurrent ? " · now" : ""}
                        </span>
                        {isCustom ? (
                          <input
                            type="number"
                            min={SMART_LOCATOR_MARKER_SIZE_MIN_PX}
                            max={SMART_LOCATOR_MARKER_SIZE_MAX_PX}
                            step={1}
                            value={inputValue}
                            onChange={(event) => {
                              setDraftInputs((prev) => ({
                                ...prev,
                                [key]: event.target.value,
                              }));
                            }}
                            onBlur={(event) =>
                              commitCustomSize(zoom, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            aria-label={`Marker size at zoom ${zoom}`}
                            className="ml-auto w-16 rounded border border-zinc-600/60 bg-zinc-950/70 px-1.5 py-0.5 text-right text-xs font-semibold text-zinc-100 outline-none focus:border-accent"
                          />
                        ) : (
                          <span className="text-right font-semibold">
                            {sizePx}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {isCustom && (
                <p className="text-[10px] leading-snug text-zinc-500">
                  Allowed range: {SMART_LOCATOR_MARKER_SIZE_MIN_PX}–
                  {SMART_LOCATOR_MARKER_SIZE_MAX_PX} px
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={
            open ? "Close marker size options" : "Open marker size options"
          }
          title="Marker size (system-wide)"
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
