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
import FriendlyForceFormModal from "@/components/FriendlyForceFormModal";
import FriendlyForceInfoPanel from "@/components/FriendlyForceInfoPanel";
import IsoFormModal from "@/components/IsoFormModal";
import IsoInfoPanel from "@/components/IsoInfoPanel";
import AreaOfConvergenceFormModal from "@/components/AreaOfConvergenceFormModal";
import AreaOfConvergenceInfoPanel from "@/components/AreaOfConvergenceInfoPanel";
import EducationalInstitutionFormModal from "@/components/EducationalInstitutionFormModal";
import EducationalInstitutionInfoPanel from "@/components/EducationalInstitutionInfoPanel";
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
import {
  getFriendlyForceType,
  isFriendlyForceCategory,
} from "@/lib/smartLocator/friendlyForces";
import { getIsoType, isIsoCategory } from "@/lib/smartLocator/iso";
import {
  createEmptyPersonnelRow,
  getAreaOfConvergenceType,
  isAreaOfConvergenceCategory,
} from "@/lib/smartLocator/areaOfConvergence";
import {
  createEmptyPersonnelRow as createEmptyEduPersonnelRow,
  getEducationalInstitutionType,
  isEducationalInstitutionCategory,
} from "@/lib/smartLocator/educationalInstitutions";

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

function FriendlyForceMarkersLayer({
  forces,
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
      {forces.map((force) => (
        <FriendlyForceMarker
          key={force.id}
          force={force}
          markerSizePx={markerSizePx}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function FriendlyForceMarker({ force, markerSizePx, onSelect }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () =>
      createSmartLocatorIcon("friendly_units", force.typeKey, markerSizePx),
    [force.typeKey, markerSizePx]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[force.latitude, force.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(force),
      }}
    />
  );
}

function IsoMarkersLayer({ markers, markerSizePreset, customSizes, onSelect }) {
  const mapZoom = useMapZoomLevel();
  const markerSizePx = getSmartLocatorMarkerSizePx(
    mapZoom,
    markerSizePreset,
    customSizes
  );

  return (
    <>
      {markers.map((marker) => (
        <IsoMarker
          key={marker.id}
          marker={marker}
          markerSizePx={markerSizePx}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function IsoMarker({ marker, markerSizePx, onSelect }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () => createSmartLocatorIcon("iso", marker.typeKey, markerSizePx),
    [marker.typeKey, markerSizePx]
  );

  useEffect(() => {
    const leafletMarker = markerRef.current;
    if (!leafletMarker) return;
    leafletMarker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[marker.latitude, marker.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(marker),
      }}
    />
  );
}

function AreaOfConvergenceMarkersLayer({
  markers,
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
      {markers.map((marker) => (
        <AreaOfConvergenceMarker
          key={marker.id}
          marker={marker}
          markerSizePx={markerSizePx}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function AreaOfConvergenceMarker({ marker, markerSizePx, onSelect }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () =>
      createSmartLocatorIcon(
        "area_of_convergence",
        marker.typeKey,
        markerSizePx
      ),
    [marker.typeKey, markerSizePx]
  );

  useEffect(() => {
    const leafletMarker = markerRef.current;
    if (!leafletMarker) return;
    leafletMarker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[marker.latitude, marker.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(marker),
      }}
    />
  );
}

function EducationalInstitutionMarkersLayer({
  markers,
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
      {markers.map((marker) => (
        <EducationalInstitutionMarker
          key={marker.id}
          marker={marker}
          markerSizePx={markerSizePx}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function EducationalInstitutionMarker({ marker, markerSizePx, onSelect }) {
  const markerRef = useRef(null);
  const icon = useMemo(
    () =>
      createSmartLocatorIcon(
        "educational_institutions",
        marker.typeKey,
        markerSizePx
      ),
    [marker.typeKey, markerSizePx]
  );

  useEffect(() => {
    const leafletMarker = markerRef.current;
    if (!leafletMarker) return;
    leafletMarker.setIcon(icon);
  }, [icon]);

  return (
    <Marker
      ref={markerRef}
      position={[marker.latitude, marker.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(marker),
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
  friendlyForces = [],
  isoMarkers = [],
  areaOfConvergenceMarkers = [],
  educationalInstitutionMarkers = [],
  onCreatePoint,
  onDeletePoint,
  onCreateEstablishment,
  onUpdateEstablishment,
  onDeleteEstablishment,
  onCreateFriendlyForce,
  onUpdateFriendlyForce,
  onDeleteFriendlyForce,
  onCreateIso,
  onUpdateIso,
  onDeleteIso,
  onCreateAreaOfConvergence,
  onUpdateAreaOfConvergence,
  onDeleteAreaOfConvergence,
  onCreateEducationalInstitution,
  onUpdateEducationalInstitution,
  onDeleteEducationalInstitution,
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
    discardChanges,
    saveChanges,
    dirty: markerSizeDirty,
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
  const [friendlyDraft, setFriendlyDraft] = useState(null);
  const [friendlyMode, setFriendlyMode] = useState("add");
  const [friendlyError, setFriendlyError] = useState("");
  const [friendlySaving, setFriendlySaving] = useState(false);
  const [selectedFriendlyForceId, setSelectedFriendlyForceId] = useState(null);
  const [isoDraft, setIsoDraft] = useState(null);
  const [isoMode, setIsoMode] = useState("add");
  const [isoError, setIsoError] = useState("");
  const [isoSaving, setIsoSaving] = useState(false);
  const [selectedIsoId, setSelectedIsoId] = useState(null);
  const [aocDraft, setAocDraft] = useState(null);
  const [aocMode, setAocMode] = useState("add");
  const [aocError, setAocError] = useState("");
  const [aocSaving, setAocSaving] = useState(false);
  const [selectedAocId, setSelectedAocId] = useState(null);
  const [eduDraft, setEduDraft] = useState(null);
  const [eduMode, setEduMode] = useState("add");
  const [eduError, setEduError] = useState("");
  const [eduSaving, setEduSaving] = useState(false);
  const [selectedEduId, setSelectedEduId] = useState(null);

  useEffect(() => {
    setBasemapId(readStoredBasemapId());
  }, []);

  const selectedEstablishment = useMemo(
    () =>
      establishments.find((row) => row.id === selectedEstablishmentId) ?? null,
    [establishments, selectedEstablishmentId]
  );

  const selectedFriendlyForce = useMemo(
    () =>
      friendlyForces.find((row) => row.id === selectedFriendlyForceId) ?? null,
    [friendlyForces, selectedFriendlyForceId]
  );

  const selectedIso = useMemo(
    () => isoMarkers.find((row) => row.id === selectedIsoId) ?? null,
    [isoMarkers, selectedIsoId]
  );

  const selectedAoc = useMemo(
    () =>
      areaOfConvergenceMarkers.find((row) => row.id === selectedAocId) ?? null,
    [areaOfConvergenceMarkers, selectedAocId]
  );

  const selectedEdu = useMemo(
    () =>
      educationalInstitutionMarkers.find((row) => row.id === selectedEduId) ??
      null,
    [educationalInstitutionMarkers, selectedEduId]
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
      setFriendlyDraft(null);
      setIsoDraft(null);
      setAocDraft(null);
      setEduDraft(null);
      return;
    }

    if (isFriendlyForceCategory(selection.category)) {
      const typeMeta = getFriendlyForceType(selection.subcategory);
      if (!typeMeta) return;
      setFriendlyMode("add");
      setFriendlyDraft({
        id: null,
        typeKey: typeMeta.key,
        typeLabel: typeMeta.typeLabel,
        unit: user?.unit ?? "",
        office: user?.office ?? "",
        officeCampName: "",
        commandingOfficer: "",
        contactNumber: "",
        addressLocation: "",
        remarks: "",
        latitude: menu.lat,
        longitude: menu.lng,
      });
      setFriendlyError("");
      setMenu(null);
      setDraft(null);
      setPnpDraft(null);
      setIsoDraft(null);
      setAocDraft(null);
      setEduDraft(null);
      return;
    }

    if (isIsoCategory(selection.category)) {
      const typeMeta = getIsoType(selection.subcategory);
      if (!typeMeta) return;
      setIsoMode("add");
      setIsoDraft({
        id: null,
        typeKey: typeMeta.key,
        typeLabel: typeMeta.typeLabel,
        unit: user?.unit ?? "",
        office: user?.office ?? "",
        addressLocation: "",
        remarks: "",
        latitude: menu.lat,
        longitude: menu.lng,
      });
      setIsoError("");
      setMenu(null);
      setDraft(null);
      setPnpDraft(null);
      setFriendlyDraft(null);
      setAocDraft(null);
      setEduDraft(null);
      return;
    }

    if (isAreaOfConvergenceCategory(selection.category)) {
      const typeMeta = getAreaOfConvergenceType(selection.subcategory);
      if (!typeMeta) return;
      setAocMode("add");
      setAocDraft({
        id: null,
        typeKey: typeMeta.key,
        typeLabel: typeMeta.typeLabel,
        unit: user?.unit ?? "",
        office: user?.office ?? "",
        placeName: "",
        addressLocation: "",
        estimatedCrowd: "",
        personnel: [createEmptyPersonnelRow()],
        latitude: menu.lat,
        longitude: menu.lng,
      });
      setAocError("");
      setMenu(null);
      setDraft(null);
      setPnpDraft(null);
      setFriendlyDraft(null);
      setIsoDraft(null);
      setEduDraft(null);
      return;
    }

    if (isEducationalInstitutionCategory(selection.category)) {
      const typeMeta = getEducationalInstitutionType(selection.subcategory);
      if (!typeMeta) return;
      setEduMode("add");
      setEduDraft({
        id: null,
        typeKey: typeMeta.key,
        typeLabel: typeMeta.typeLabel,
        unit: user?.unit ?? "",
        office: user?.office ?? "",
        schoolName: "",
        principalSupervisor: "",
        contactNumber: "",
        addressLocation: "",
        estimatedStudents: "",
        isPollingCenter: false,
        numberOfVoters: "",
        personnel: [],
        latitude: menu.lat,
        longitude: menu.lng,
      });
      setEduError("");
      setMenu(null);
      setDraft(null);
      setPnpDraft(null);
      setFriendlyDraft(null);
      setIsoDraft(null);
      setAocDraft(null);
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
    setFriendlyDraft(null);
    setIsoDraft(null);
    setAocDraft(null);
    setEduDraft(null);
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
        setSelectedFriendlyForceId(null);
        setSelectedIsoId(null);
        setSelectedAocId(null);
        setSelectedEduId(null);
      } else {
        const created = await onCreateEstablishment({
          typeKey: pnpDraft.typeKey,
          stationToc: pnpDraft.stationToc,
          latitude: pnpDraft.latitude,
          longitude: pnpDraft.longitude,
        });
        setSelectedEstablishmentId(created?.id ?? null);
        setSelectedFriendlyForceId(null);
        setSelectedIsoId(null);
        setSelectedAocId(null);
        setSelectedEduId(null);
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

  async function saveFriendlyForce() {
    if (!friendlyDraft) return false;
    setFriendlySaving(true);
    setFriendlyError("");
    try {
      const payload = {
        typeKey: friendlyDraft.typeKey,
        officeCampName: friendlyDraft.officeCampName,
        commandingOfficer: friendlyDraft.commandingOfficer,
        contactNumber: friendlyDraft.contactNumber,
        addressLocation: friendlyDraft.addressLocation,
        remarks: friendlyDraft.remarks,
        latitude: friendlyDraft.latitude,
        longitude: friendlyDraft.longitude,
      };
      if (friendlyMode === "edit" && friendlyDraft.id) {
        const updated = await onUpdateFriendlyForce(friendlyDraft.id, payload);
        setSelectedFriendlyForceId(updated?.id ?? friendlyDraft.id);
        setSelectedEstablishmentId(null);
        setSelectedIsoId(null);
        setSelectedAocId(null);
        setSelectedEduId(null);
      } else {
        const created = await onCreateFriendlyForce(payload);
        setSelectedFriendlyForceId(created?.id ?? null);
        setSelectedEstablishmentId(null);
        setSelectedIsoId(null);
        setSelectedAocId(null);
        setSelectedEduId(null);
      }
      setFriendlyDraft(null);
      return true;
    } catch (err) {
      setFriendlyError(err.message);
      return false;
    } finally {
      setFriendlySaving(false);
    }
  }

  async function saveIso() {
    if (!isoDraft) return false;
    setIsoSaving(true);
    setIsoError("");
    try {
      const payload = {
        typeKey: isoDraft.typeKey,
        addressLocation: isoDraft.addressLocation,
        remarks: isoDraft.remarks,
        latitude: isoDraft.latitude,
        longitude: isoDraft.longitude,
      };
      if (isoMode === "edit" && isoDraft.id) {
        const updated = await onUpdateIso(isoDraft.id, payload);
        setSelectedIsoId(updated?.id ?? isoDraft.id);
      } else {
        const created = await onCreateIso(payload);
        setSelectedIsoId(created?.id ?? null);
      }
      setSelectedEstablishmentId(null);
      setSelectedFriendlyForceId(null);
      setSelectedAocId(null);
      setSelectedEduId(null);
      setIsoDraft(null);
      return true;
    } catch (err) {
      setIsoError(err.message);
      return false;
    } finally {
      setIsoSaving(false);
    }
  }

  async function saveAreaOfConvergence() {
    if (!aocDraft) return false;
    setAocSaving(true);
    setAocError("");
    try {
      const payload = {
        typeKey: aocDraft.typeKey,
        placeName: aocDraft.placeName,
        addressLocation: aocDraft.addressLocation,
        estimatedCrowd: aocDraft.estimatedCrowd,
        personnel: aocDraft.personnel,
        latitude: aocDraft.latitude,
        longitude: aocDraft.longitude,
      };
      if (aocMode === "edit" && aocDraft.id) {
        const updated = await onUpdateAreaOfConvergence(aocDraft.id, payload);
        setSelectedAocId(updated?.id ?? aocDraft.id);
      } else {
        const created = await onCreateAreaOfConvergence(payload);
        setSelectedAocId(created?.id ?? null);
      }
      setSelectedEstablishmentId(null);
      setSelectedFriendlyForceId(null);
      setSelectedIsoId(null);
      setSelectedEduId(null);
      setAocDraft(null);
      return true;
    } catch (err) {
      setAocError(err.message);
      return false;
    } finally {
      setAocSaving(false);
    }
  }

  async function saveEducationalInstitution() {
    if (!eduDraft) return false;
    setEduSaving(true);
    setEduError("");
    try {
      const payload = {
        typeKey: eduDraft.typeKey,
        schoolName: eduDraft.schoolName,
        principalSupervisor: eduDraft.principalSupervisor,
        contactNumber: eduDraft.contactNumber,
        addressLocation: eduDraft.addressLocation,
        estimatedStudents: eduDraft.estimatedStudents,
        isPollingCenter: eduDraft.isPollingCenter,
        numberOfVoters: eduDraft.numberOfVoters,
        personnel: eduDraft.personnel,
        latitude: eduDraft.latitude,
        longitude: eduDraft.longitude,
      };
      if (eduMode === "edit" && eduDraft.id) {
        const updated = await onUpdateEducationalInstitution(
          eduDraft.id,
          payload
        );
        setSelectedEduId(updated?.id ?? eduDraft.id);
      } else {
        const created = await onCreateEducationalInstitution(payload);
        setSelectedEduId(created?.id ?? null);
      }
      setSelectedEstablishmentId(null);
      setSelectedFriendlyForceId(null);
      setSelectedIsoId(null);
      setSelectedAocId(null);
      setEduDraft(null);
      return true;
    } catch (err) {
      setEduError(err.message);
      return false;
    } finally {
      setEduSaving(false);
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
            setSelectedFriendlyForceId(null);
            setSelectedIsoId(null);
            setSelectedAocId(null);
            setSelectedEduId(null);
            setMenu(null);
          }}
        />

        <FriendlyForceMarkersLayer
          forces={friendlyForces}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onSelect={(force) => {
            setSelectedFriendlyForceId(force.id);
            setSelectedEstablishmentId(null);
            setSelectedIsoId(null);
            setSelectedAocId(null);
            setSelectedEduId(null);
            setMenu(null);
          }}
        />

        <IsoMarkersLayer
          markers={isoMarkers}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onSelect={(marker) => {
            setSelectedIsoId(marker.id);
            setSelectedEstablishmentId(null);
            setSelectedFriendlyForceId(null);
            setSelectedAocId(null);
            setSelectedEduId(null);
            setMenu(null);
          }}
        />

        <AreaOfConvergenceMarkersLayer
          markers={areaOfConvergenceMarkers}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onSelect={(marker) => {
            setSelectedAocId(marker.id);
            setSelectedEstablishmentId(null);
            setSelectedFriendlyForceId(null);
            setSelectedIsoId(null);
            setSelectedEduId(null);
            setMenu(null);
          }}
        />

        <EducationalInstitutionMarkersLayer
          markers={educationalInstitutionMarkers}
          markerSizePreset={activePresetId}
          customSizes={activeCustomSizes}
          onSelect={(marker) => {
            setSelectedEduId(marker.id);
            setSelectedEstablishmentId(null);
            setSelectedFriendlyForceId(null);
            setSelectedIsoId(null);
            setSelectedAocId(null);
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
          onSave={saveChanges}
          onDiscard={discardChanges}
          dirty={markerSizeDirty}
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

      {selectedFriendlyForce ? (
        <FriendlyForceInfoPanel
          force={selectedFriendlyForce}
          canManage={canManagePoint(user, selectedFriendlyForce)}
          onClose={() => setSelectedFriendlyForceId(null)}
          onEdit={() => {
            const typeMeta = getFriendlyForceType(selectedFriendlyForce.typeKey);
            setFriendlyMode("edit");
            setFriendlyDraft({
              id: selectedFriendlyForce.id,
              typeKey: selectedFriendlyForce.typeKey,
              typeLabel: typeMeta?.typeLabel ?? selectedFriendlyForce.type,
              unit: selectedFriendlyForce.unit,
              office: selectedFriendlyForce.office,
              officeCampName: selectedFriendlyForce.officeCampName ?? "",
              commandingOfficer: selectedFriendlyForce.commandingOfficer,
              contactNumber: selectedFriendlyForce.contactNumber,
              addressLocation: selectedFriendlyForce.addressLocation,
              remarks: selectedFriendlyForce.remarks ?? "",
              latitude: selectedFriendlyForce.latitude,
              longitude: selectedFriendlyForce.longitude,
            });
            setFriendlyError("");
          }}
          onRemove={async () => {
            await onDeleteFriendlyForce(selectedFriendlyForce.id);
            setSelectedFriendlyForceId(null);
          }}
        />
      ) : null}

      {selectedIso ? (
        <IsoInfoPanel
          marker={selectedIso}
          canManage={canManagePoint(user, selectedIso)}
          onClose={() => setSelectedIsoId(null)}
          onEdit={() => {
            const typeMeta = getIsoType(selectedIso.typeKey);
            setIsoMode("edit");
            setIsoDraft({
              id: selectedIso.id,
              typeKey: selectedIso.typeKey,
              typeLabel: typeMeta?.typeLabel ?? selectedIso.type,
              unit: selectedIso.unit,
              office: selectedIso.office,
              addressLocation: selectedIso.addressLocation,
              remarks: selectedIso.remarks ?? "",
              latitude: selectedIso.latitude,
              longitude: selectedIso.longitude,
            });
            setIsoError("");
          }}
          onRemove={async () => {
            await onDeleteIso(selectedIso.id);
            setSelectedIsoId(null);
          }}
        />
      ) : null}

      {selectedAoc ? (
        <AreaOfConvergenceInfoPanel
          marker={selectedAoc}
          canManage={canManagePoint(user, selectedAoc)}
          onClose={() => setSelectedAocId(null)}
          onEdit={() => {
            const typeMeta = getAreaOfConvergenceType(selectedAoc.typeKey);
            setAocMode("edit");
            setAocDraft({
              id: selectedAoc.id,
              typeKey: selectedAoc.typeKey,
              typeLabel: typeMeta?.typeLabel ?? selectedAoc.type,
              unit: selectedAoc.unit,
              office: selectedAoc.office,
              placeName: selectedAoc.placeName ?? "",
              addressLocation: selectedAoc.addressLocation,
              estimatedCrowd: selectedAoc.estimatedCrowd ?? "",
              personnel:
                selectedAoc.personnel?.length > 0
                  ? selectedAoc.personnel.map((row) => ({
                      rankName: row.rankName ?? "",
                      contactNumber: row.contactNumber ?? "",
                    }))
                  : [createEmptyPersonnelRow()],
              latitude: selectedAoc.latitude,
              longitude: selectedAoc.longitude,
            });
            setAocError("");
          }}
          onRemove={async () => {
            await onDeleteAreaOfConvergence(selectedAoc.id);
            setSelectedAocId(null);
          }}
        />
      ) : null}

      {selectedEdu ? (
        <EducationalInstitutionInfoPanel
          marker={selectedEdu}
          canManage={canManagePoint(user, selectedEdu)}
          onClose={() => setSelectedEduId(null)}
          onEdit={() => {
            const typeMeta = getEducationalInstitutionType(selectedEdu.typeKey);
            setEduMode("edit");
            setEduDraft({
              id: selectedEdu.id,
              typeKey: selectedEdu.typeKey,
              typeLabel: typeMeta?.typeLabel ?? selectedEdu.type,
              unit: selectedEdu.unit,
              office: selectedEdu.office,
              schoolName: selectedEdu.schoolName ?? "",
              principalSupervisor: selectedEdu.principalSupervisor ?? "",
              contactNumber: selectedEdu.contactNumber ?? "",
              addressLocation: selectedEdu.addressLocation ?? "",
              estimatedStudents: selectedEdu.estimatedStudents ?? "",
              isPollingCenter: Boolean(selectedEdu.isPollingCenter),
              numberOfVoters: selectedEdu.numberOfVoters ?? "",
              personnel: selectedEdu.isPollingCenter
                ? selectedEdu.personnel?.length > 0
                  ? selectedEdu.personnel.map((row) => ({
                      rankName: row.rankName ?? "",
                      contactNumber: row.contactNumber ?? "",
                    }))
                  : [createEmptyEduPersonnelRow()]
                : [],
              latitude: selectedEdu.latitude,
              longitude: selectedEdu.longitude,
            });
            setEduError("");
          }}
          onRemove={async () => {
            await onDeleteEducationalInstitution(selectedEdu.id);
            setSelectedEduId(null);
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

      <FriendlyForceFormModal
        open={Boolean(friendlyDraft)}
        mode={friendlyMode}
        draft={friendlyDraft}
        saving={friendlySaving}
        error={friendlyError}
        onChange={(patch) => setFriendlyDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setFriendlyDraft(null);
          setFriendlyError("");
        }}
        onRequestSave={saveFriendlyForce}
      />

      <IsoFormModal
        open={Boolean(isoDraft)}
        mode={isoMode}
        draft={isoDraft}
        saving={isoSaving}
        error={isoError}
        onChange={(patch) => setIsoDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setIsoDraft(null);
          setIsoError("");
        }}
        onRequestSave={saveIso}
      />

      <AreaOfConvergenceFormModal
        open={Boolean(aocDraft)}
        mode={aocMode}
        draft={aocDraft}
        saving={aocSaving}
        error={aocError}
        onChange={(patch) => setAocDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setAocDraft(null);
          setAocError("");
        }}
        onRequestSave={saveAreaOfConvergence}
      />

      <EducationalInstitutionFormModal
        open={Boolean(eduDraft)}
        mode={eduMode}
        draft={eduDraft}
        saving={eduSaving}
        error={eduError}
        onChange={(patch) => setEduDraft((prev) => ({ ...prev, ...patch }))}
        onCancel={() => {
          setEduDraft(null);
          setEduError("");
        }}
        onRequestSave={saveEducationalInstitution}
      />
    </div>
  );
}
