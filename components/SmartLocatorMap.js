"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";
import { CALABARZON_BOUNDS, CALABARZON_CENTER, MAP_MIN_ZOOM, MAX_BOUNDS_VISCOSITY, PHILIPPINES_BOUNDS } from "@/lib/mapBounds";
import { createSmartLocatorIcon } from "@/lib/smartLocator/markers";
import { smartLocatorCategoryLabel } from "@/lib/smartLocator/categories";

function CalabarzonInitialView() {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    map.fitBounds(CALABARZON_BOUNDS, { padding: [24, 24] });
    initializedRef.current = true;
  }, [map]);

  return null;
}

function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = null;
    let debounceTimer = null;

    const refresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          map.invalidateSize({ pan: false });
        });
      }, 150);
    };

    const observer = new ResizeObserver(refresh);
    observer.observe(container);
    const timer = setTimeout(refresh, 250);
    window.addEventListener("resize", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function MapRightClickHandler({ onContextMenu }) {
  useMapEvents({
    contextmenu(event) {
      event.originalEvent.preventDefault();
      onContextMenu({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      });
    },
  });
  return null;
}

function PlotDialog({
  draft,
  saving,
  error,
  onChange,
  onCancel,
  onSubmit,
}) {
  if (!draft) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border/70 bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Plot on map</h3>
        <p className="mt-1 text-sm text-muted">
          {smartLocatorCategoryLabel(draft.category)}
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-xs font-medium text-muted">
            Name / label <span className="text-accent">*</span>
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="e.g. Meralco substation"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="block text-xs font-medium text-muted">
            Notes <span className="font-normal">(optional)</span>
            <textarea
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              placeholder="Additional details..."
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-border/70 px-4 py-2 text-sm text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Plot point"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SmartLocatorMap({
  points,
  legend,
  onCreatePoint,
  onDeletePoint,
}) {
  const basemap = useMemo(() => getBasemapById(DEFAULT_BASEMAP_ID), []);
  const [menu, setMenu] = useState(null);
  const [draft, setDraft] = useState(null);
  const [plotError, setPlotError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    function closeMenus() {
      setMenu(null);
    }
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  function openPlotDialog(category) {
    if (!menu) return;
    setDraft({
      category,
      latitude: menu.lat,
      longitude: menu.lng,
      label: "",
      description: "",
    });
    setMenu(null);
    setPlotError("");
  }

  async function submitPlot() {
    if (!draft) return;
    setSaving(true);
    setPlotError("");
    try {
      const point = await onCreatePoint({
        category: draft.category,
        latitude: draft.latitude,
        longitude: draft.longitude,
        label: draft.label,
        description: draft.description,
      });
      setDraft(null);
      setSelectedId(point.id);
    } catch (err) {
      setPlotError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(point) {
    const confirmed = window.confirm(`Remove "${point.label}" from the map?`);
    if (!confirmed) return;
    try {
      await onDeletePoint(point.id);
      if (selectedId === point.id) setSelectedId(null);
    } catch (err) {
      window.alert(err.message);
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        className="h-full w-full"
        center={CALABARZON_CENTER}
        zoom={8}
        minZoom={MAP_MIN_ZOOM}
        maxBounds={PHILIPPINES_BOUNDS}
        maxBoundsViscosity={MAX_BOUNDS_VISCOSITY}
        scrollWheelZoom
      >
        <TileLayer url={basemap.url} attribution={basemap.attribution} />
        <CalabarzonInitialView />
        <InvalidateOnResize />
        <MapRightClickHandler
          onContextMenu={(payload) => {
            setMenu(payload);
            setDraft(null);
          }}
        />

        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={createSmartLocatorIcon(point.category)}
            eventHandlers={{
              click: () => setSelectedId(point.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-2 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {point.category_label}
                  </p>
                  <p className="font-semibold text-foreground">{point.label}</p>
                </div>
                {point.description ? (
                  <p className="text-xs text-muted">{point.description}</p>
                ) : null}
                {(point.office || point.unit) && (
                  <p className="text-[11px] text-muted">
                    {[point.office, point.unit].filter(Boolean).join(" / ")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(point)}
                  className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {menu && (
        <div
          className="fixed z-[1500] min-w-[220px] overflow-hidden rounded-lg border border-border/70 bg-card py-1 shadow-xl"
          style={{ left: menu.clientX, top: menu.clientY }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Plot on map
          </p>
          {legend.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => openPlotDialog(category.key)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-background/80"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.label}
            </button>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-lg border border-border/60 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Categories
        </p>
        <ul className="mt-1 space-y-1">
          {legend.map((category) => (
            <li key={category.key} className="flex items-center gap-2 text-[11px] text-foreground">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.shortLabel}
            </li>
          ))}
        </ul>
      </div>

      <PlotDialog
        draft={draft}
        saving={saving}
        error={plotError}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setDraft(null);
          setPlotError("");
        }}
        onSubmit={submitPlot}
      />
    </div>
  );
}
