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
import SmartLocatorBasemapToggle from "@/components/SmartLocatorBasemapToggle";
import SmartLocatorPlotMenu from "@/components/SmartLocatorPlotMenu";
import SmartLocatorMarkerSizeOptions, {
  useSmartLocatorMarkerSize,
} from "@/components/SmartLocatorMarkerSizeOptions";
import PnpEstablishmentFormModal from "@/components/PnpEstablishmentFormModal";
import PnpEstablishmentInfoPanel from "@/components/PnpEstablishmentInfoPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";
import {
  CALABARZON_BOUNDS,
  CALABARZON_CENTER,
  MAP_MIN_ZOOM,
  MAX_BOUNDS_VISCOSITY,
  PHILIPPINES_BOUNDS,
} from "@/lib/mapBounds";
import { canManagePoint } from "@/lib/smartLocator/scope";
import { createSmartLocatorIcon } from "@/lib/smartLocator/markers";
import {
  SMART_LOCATOR_CUSTOM_PRESET_ID,
  getSmartLocatorMarkerSizePx,
} from "@/lib/smartLocator/markerSize";
import {
  getPnpEstablishmentType,
  isPnpEstablishmentCategory,
} from "@/lib/smartLocator/pnpEstablishments";

const SMART_LOCATOR_BASEMAP_KEY = "smart-locator-basemap-id";

function readStoredBasemapId() {
  if (typeof window === "undefined") return DEFAULT_BASEMAP_ID;
  try {
    const stored = window.sessionStorage.getItem(SMART_LOCATOR_BASEMAP_KEY);
    return getBasemapById(stored).id;
  } catch {
    return DEFAULT_BASEMAP_ID;
  }
}

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

/** Keeps plotted icons in sync when the user zooms the map. */
function useMapZoomLevel() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    map.on("zoom zoomend", sync);
    return () => {
      map.off("zoom zoomend", sync);
    };
  }, [map]);

  return zoom;
}

function ZoomReporter({ onZoomChange }) {
  const zoom = useMapZoomLevel();

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  return null;
}

function SmartLocatorMarkersLayer({
  points,
  markerSizePreset,
  customSizes,
  onDeletePoint,
}) {
  const mapZoom = useMapZoomLevel();
  const markerSizePx = getSmartLocatorMarkerSizePx(
    mapZoom,
    markerSizePreset,
    customSizes
  );

  return (
    <>
      {points.map((point) => (
        <SmartLocatorPointMarker
          key={point.id}
          point={point}
          markerSizePx={markerSizePx}
          onDeletePoint={onDeletePoint}
        />
      ))}
    </>
  );
}

function SmartLocatorPointMarker({ point, markerSizePx, onDeletePoint }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () =>
      createSmartLocatorIcon(point.category, point.subcategory, markerSizePx),
    [point.category, point.subcategory, markerSizePx]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[point.latitude, point.longitude]}
      icon={icon}
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
          <button
            type="button"
            onClick={() => onDeletePoint(point)}
            className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10"
          >
            Remove
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function PnpEstablishmentMarkersLayer({
  establishments,
  markerSizePreset,
  customSizes,
  onSelect,
}) {
  const mapZoom = useMapZoomLevel();
  const markerSizePx = getSmartLocatorMarkerSizePx(
    mapZoom,
    markerSizePreset,
    customSizes
  );

  return (
    <>
      {establishments.map((establishment) => (
        <PnpEstablishmentMarker
          key={establishment.id}
          establishment={establishment}
          markerSizePx={markerSizePx}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function PnpEstablishmentMarker({ establishment, markerSizePx, onSelect }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () =>
      createSmartLocatorIcon(
        "pnp_establishments",
        establishment.typeKey,
        markerSizePx
      ),
    [establishment.typeKey, markerSizePx]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[establishment.latitude, establishment.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(establishment),
      }}
    />
  );
}

function PlotDialog({ draft, saving, error, onChange, onCancel, onSubmit }) {
  if (!draft) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/70 bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Plot on map</h3>
            <p className="mt-1 text-sm text-muted">{draft.categoryLabel}</p>
            <p className="text-sm font-medium text-foreground">
              {draft.subcategoryLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-xs font-medium text-muted">
            Name / label <span className="text-accent">*</span>
            <input
              autoFocus
              value={draft.label}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder="Enter location name"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="block text-xs font-medium text-muted">
            Notes <span className="font-normal">(optional)</span>
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={3}
              placeholder="Additional details..."
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
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
  user,
  points,
  establishments = [],
  onCreatePoint,
  onDeletePoint,
  onCreateEstablishment,
  onUpdateEstablishment,
  onDeleteEstablishment,
  canEditMarkerSize = false,
}) {
  const [basemapId, setBasemapId] = useState(DEFAULT_BASEMAP_ID);
  const basemap = useMemo(() => getBasemapById(basemapId), [basemapId]);
  const {
    presetId,
    setPresetId,
    customSizes,
    setCustomSize,
    resetCustomSizes,
    saving: markerSizeSaving,
    error: markerSizeError,
  } = useSmartLocatorMarkerSize({ canEdit: canEditMarkerSize });
  const [menu, setMenu] = useState(null);
  const [draft, setDraft] = useState(null);
  const [plotError, setPlotError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmPlot, setConfirmPlot] = useState(false);
  const [mapZoom, setMapZoom] = useState(8);
  const [pnpDraft, setPnpDraft] = useState(null);
  const [pnpMode, setPnpMode] = useState("add");
  const [pnpError, setPnpError] = useState("");
  const [pnpSaving, setPnpSaving] = useState(false);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState(null);

  useEffect(() => {
    setBasemapId(readStoredBasemapId());
  }, []);

  const selectedEstablishment = useMemo(
    () =>
      establishments.find((row) => row.id === selectedEstablishmentId) ?? null,
    [establishments, selectedEstablishmentId]
  );

  function handleBasemapChange(nextId) {
    const resolved = getBasemapById(nextId).id;
    setBasemapId(resolved);
    try {
      window.sessionStorage.setItem(SMART_LOCATOR_BASEMAP_KEY, resolved);
    } catch {
      // ignore storage errors
    }
  }

  // System-wide setting — same size for every Smart Locator account.
  const activePresetId = presetId;
  const activeCustomSizes =
    presetId === SMART_LOCATOR_CUSTOM_PRESET_ID ? customSizes : null;

  function openPlotDialog(selection) {
    if (!menu) return;

    if (isPnpEstablishmentCategory(selection.category)) {
      const typeMeta = getPnpEstablishmentType(selection.subcategory);
      if (!typeMeta) return;
      setPnpMode("add");
      setPnpDraft({
        id: null,
        typeKey: typeMeta.key,
        typeLabel: typeMeta.typeLabel,
        unit: user?.unit ?? "",
        office: user?.office ?? "",
        stationToc: "",
        latitude: menu.lat,
        longitude: menu.lng,
      });
      setPnpError("");
      setMenu(null);
      setDraft(null);
      return;
    }

    setDraft({
      category: selection.category,
      subcategory: selection.subcategory,
      categoryLabel: selection.categoryLabel,
      subcategoryLabel: selection.subcategoryLabel,
      latitude: menu.lat,
      longitude: menu.lng,
      label: "",
      description: "",
    });
    setMenu(null);
    setPlotError("");
    setPnpDraft(null);
  }

  async function submitPlot() {
    if (!draft) return false;
    setSaving(true);
    setPlotError("");
    try {
      await onCreatePoint({
        category: draft.category,
        subcategory: draft.subcategory,
        latitude: draft.latitude,
        longitude: draft.longitude,
        label: draft.label,
        description: draft.description,
      });
      setDraft(null);
      setConfirmPlot(false);
      return true;
    } catch (err) {
      setPlotError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(point) {
    const confirmed = window.confirm(`Remove "${point.label}" from the map?`);
    if (!confirmed) return;
    try {
      await onDeletePoint(point.id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function savePnpEstablishment() {
    if (!pnpDraft) return false;
    setPnpSaving(true);
    setPnpError("");
    try {
      if (pnpMode === "edit" && pnpDraft.id) {
        const updated = await onUpdateEstablishment(pnpDraft.id, {
          typeKey: pnpDraft.typeKey,
          stationToc: pnpDraft.stationToc,
          latitude: pnpDraft.latitude,
          longitude: pnpDraft.longitude,
        });
        setSelectedEstablishmentId(updated?.id ?? pnpDraft.id);
      } else {
        const created = await onCreateEstablishment({
          typeKey: pnpDraft.typeKey,
          stationToc: pnpDraft.stationToc,
          latitude: pnpDraft.latitude,
          longitude: pnpDraft.longitude,
        });
        setSelectedEstablishmentId(created?.id ?? null);
      }
      setPnpDraft(null);
      return true;
    } catch (err) {
      setPnpError(err.message);
      return false;
    } finally {
      setPnpSaving(false);
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
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
          maxNativeZoom={basemap.maxNativeZoom}
        />
        <CalabarzonInitialView />
        <InvalidateOnResize />
        <ZoomReporter onZoomChange={setMapZoom} />
        <MapRightClickHandler
          onContextMenu={(payload) => {
            setMenu(payload);
            setDraft(null);
          }}
        />

        <SmartLocatorMarkersLayer
          points={points}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onDeletePoint={handleDelete}
        />

        <PnpEstablishmentMarkersLayer
          establishments={establishments}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onSelect={(establishment) => {
            setSelectedEstablishmentId(establishment.id);
            setMenu(null);
          }}
        />
      </MapContainer>

      <SmartLocatorBasemapToggle
        basemapId={basemapId}
        onBasemapChange={handleBasemapChange}
      />

      {canEditMarkerSize ? (
        <SmartLocatorMarkerSizeOptions
          presetId={presetId}
          onPresetChange={setPresetId}
          customSizes={customSizes}
          onCustomSizeChange={setCustomSize}
          onResetCustomSizes={resetCustomSizes}
          currentZoom={mapZoom}
          saving={markerSizeSaving}
          error={markerSizeError}
        />
      ) : null}

      {selectedEstablishment ? (
        <PnpEstablishmentInfoPanel
          establishment={selectedEstablishment}
          canManage={canManagePoint(user, selectedEstablishment)}
          onClose={() => setSelectedEstablishmentId(null)}
          onEdit={() => {
            const typeMeta = getPnpEstablishmentType(selectedEstablishment.typeKey);
            setPnpMode("edit");
            setPnpDraft({
              id: selectedEstablishment.id,
              typeKey: selectedEstablishment.typeKey,
              typeLabel: typeMeta?.typeLabel ?? selectedEstablishment.type,
              unit: selectedEstablishment.unit,
              office: selectedEstablishment.office,
              stationToc: selectedEstablishment.stationToc,
              latitude: selectedEstablishment.latitude,
              longitude: selectedEstablishment.longitude,
            });
            setPnpError("");
          }}
          onRemove={async () => {
            await onDeleteEstablishment(selectedEstablishment.id);
            setSelectedEstablishmentId(null);
          }}
        />
      ) : null}

      <SmartLocatorPlotMenu
        menu={menu}
        onClose={() => setMenu(null)}
        onSelect={openPlotDialog}
      />

      <PlotDialog
        draft={draft}
        saving={saving}
        error={plotError}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setDraft(null);
          setPlotError("");
          setConfirmPlot(false);
        }}
        onSubmit={() => setConfirmPlot(true)}
      />

      <ConfirmDialog
        open={Boolean(draft) && confirmPlot}
        title="Save map point?"
        description={`Plot ${draft?.subcategoryLabel ?? "this point"} as "${
          draft?.label?.trim() || "unnamed"
        }" at the selected location?`}
        confirmLabel="Save point"
        cancelLabel="Back"
        confirming={saving}
        onCancel={() => setConfirmPlot(false)}
        onConfirm={submitPlot}
      />

      <PnpEstablishmentFormModal
        open={Boolean(pnpDraft)}
        mode={pnpMode}
        draft={pnpDraft}
        saving={pnpSaving}
        error={pnpError}
        onChange={(patch) => setPnpDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setPnpDraft(null);
          setPnpError("");
        }}
        onRequestSave={savePnpEstablishment}
      />
    </div>
  );
}
