"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AddCallResponsePopover from "@/components/AddCallResponsePopover";
import { canAccessSettings, canManageAccessTokens } from "@/lib/mobile/adminRoles";
import { BASEMAPS, getBasemapById } from "@/lib/mapBasemaps";
import { MAP_VIEW_LAYERS } from "@/lib/mapViewLayers";

function MapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "map", href: "/", label: "Map", Icon: MapIcon },
  { id: "review", href: "/track-review", label: "Review Track", Icon: ReviewIcon },
  {
    id: "settings",
    href: "/system-settings",
    label: "System Settings",
    Icon: SettingsIcon,
    settingsAccess: true,
  },
  {
    id: "tokens",
    href: "/access-tokens",
    label: "Access Tokens",
    Icon: KeyIcon,
    adminOnly: true,
  },
];

function ReportIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function GpsLocateIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.93 4.93 2.12 2.12" />
      <path d="m16.95 16.95 2.12 2.12" />
      <path d="m4.93 19.07 2.12-2.12" />
      <path d="m16.95 7.05 2.12-2.12" />
    </svg>
  );
}

function PhoneCallIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      <path d="M14.05 2a9 9 0 0 1 8 7.94" />
      <path d="M14.05 6A5 5 0 0 1 18 10" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}

function MapOverlayModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/70 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-overlay-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 id="map-overlay-title" className="text-base font-semibold text-foreground">
              Map Overlay
            </h2>
            <p className="mt-1 text-xs text-muted">
              Configure additional map layers and overlays.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-6">
          <div className="rounded-lg border border-dashed border-accent/30 bg-accent/5 px-4 py-8 text-center">
            <p className="text-sm font-medium text-accent">Ongoing development</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Map overlay settings will be available here in a future update.
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-border/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 opacity-80"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MapViewPicker({ layers, onLayerChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const activeCount = MAP_VIEW_LAYERS.filter(({ id }) => layers[id]).length;

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="map-view-options"
        aria-label={`View map layers. ${activeCount} visible`}
        title="View map layers"
        className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium leading-none transition sm:text-[11px] ${
          open || activeCount > 0
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-border/60 bg-background/50 text-foreground hover:bg-background/80"
        }`}
      >
        <ViewIcon />
        <span className="whitespace-nowrap">View</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          id="map-view-options"
          role="group"
          aria-label="Map view options"
          className="absolute right-0 top-full z-[750] mt-1 min-w-[12.5rem] rounded-md border border-border/70 bg-card/95 py-1 shadow-lg backdrop-blur-sm"
        >
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Map layers
          </p>
          {MAP_VIEW_LAYERS.map((layer) => (
            <label
              key={layer.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-background/80 sm:text-xs"
            >
              <input
                type="checkbox"
                checked={Boolean(layers[layer.id])}
                onChange={(e) => onLayerChange(layer.id, e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 rounded border-border/80 accent-accent"
              />
              <span className="min-w-0 flex-1">{layer.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarSeparator({ spacious = false }) {
  return (
    <div
      className={`h-6 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-accent/30 via-accent to-accent/30 shadow-[0_0_10px_rgba(34,197,94,0.35)] ${
        spacious ? "mx-2.5 sm:mx-3" : "mx-1.5 sm:mx-2"
      }`}
      aria-hidden
    />
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3 w-3 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BasemapPicker({ basemapId, onBasemapChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = getBasemapById(basemapId);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="basemap-options"
        aria-label={`Map type: ${current.label}. ${open ? "Hide" : "Show"} map types`}
        title="Toggle map type options"
        className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium leading-none transition sm:text-[11px] ${
          open
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-border/60 bg-background/50 text-foreground hover:bg-background/80"
        }`}
      >
        <span className="whitespace-nowrap">
          Map: <span className="font-semibold">{current.label}</span>
        </span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          id="basemap-options"
          role="group"
          aria-label="Map types"
          className="absolute left-0 top-full z-[750] mt-1 flex items-center gap-0.5 rounded-md border border-border/60 bg-card/95 px-0.5 py-0.5 shadow-lg"
        >
          {BASEMAPS.map((basemap) => {
            const isActive = basemap.id === basemapId;

            return (
              <button
                key={basemap.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onBasemapChange(basemap.id)}
                className={`shrink-0 whitespace-nowrap rounded px-1.5 py-1 text-[10px] font-medium leading-none transition sm:px-2 sm:text-[11px] ${
                  isActive
                    ? "bg-accent text-background shadow-sm"
                    : "text-muted hover:bg-background/80 hover:text-foreground"
                }`}
              >
                {basemap.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MapToolbar({
  active = "map",
  user,
  basemapId,
  onBasemapChange,
  showBasemap = false,
  showAddCallResponse = false,
  showForceLocation = false,
  forceLocationOpen = false,
  onForceLocationOpenChange,
  showGenerateReport = false,
  generateReportOpen = false,
  onGenerateReportOpenChange,
  callResponseOpen = false,
  onCallResponseOpenChange,
  callResponsePlace = null,
  onCallResponsePlaceChange,
  onAddIncidentMarker,
  mapViewLayers,
  onMapViewLayerChange,
}) {
  const canManageTokens = canManageAccessTokens(user?.role);
  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return canManageTokens;
    if (item.settingsAccess) return canAccessSettings(user?.role);
    return true;
  });
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);

  return (
    <div className="relative z-[600] flex shrink-0 items-center gap-2 overflow-visible border-b border-border/60 bg-card/90 px-3 py-1 sm:px-4">
      <MapOverlayModal open={mapOverlayOpen} onClose={() => setMapOverlayOpen(false)} />
      <nav className="flex min-w-0 shrink-0 items-center gap-1">
        {items.map((item) => {
          const isActive = item.id === active;
          const { Icon } = item;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition sm:text-xs ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-background/80 hover:text-foreground"
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {showBasemap && onBasemapChange && (
        <>
          <ToolbarSeparator />
          <div
            className="flex min-w-0 shrink-0 items-center gap-1 overflow-visible"
            role="group"
            aria-label="Map basemap and command tools"
          >
            <BasemapPicker basemapId={basemapId} onBasemapChange={onBasemapChange} />

            {(showAddCallResponse && onCallResponseOpenChange) ||
            (showForceLocation && onForceLocationOpenChange) ||
            (showGenerateReport && onGenerateReportOpenChange) ? (
              <>
                <ToolbarSeparator spacious />
                <div className="flex shrink-0 items-center gap-1.5">
                  {showAddCallResponse && onCallResponseOpenChange && (
                    <div className="relative z-[700] shrink-0">
                      <button
                        type="button"
                        data-call-response-trigger
                        onClick={() => onCallResponseOpenChange(!callResponseOpen)}
                        aria-expanded={callResponseOpen}
                        title="Add call-for-service response on the map"
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-none shadow-sm transition sm:text-[11px] ${
                          callResponseOpen
                            ? "border-red-400 bg-red-500 text-white"
                            : "border-red-500/70 bg-red-600 text-white hover:bg-red-500"
                        }`}
                      >
                        <PhoneCallIcon />
                        <span className="whitespace-nowrap">Add Call Response</span>
                      </button>
                      <AddCallResponsePopover
                        open={callResponseOpen}
                        onClose={() => onCallResponseOpenChange(false)}
                        selectedPlace={callResponsePlace}
                        onSelectedPlaceChange={onCallResponsePlaceChange}
                        onAddIncidentMarker={onAddIncidentMarker}
                      />
                    </div>
                  )}

                  {showForceLocation && onForceLocationOpenChange && (
                    <button
                      type="button"
                      onClick={() => onForceLocationOpenChange(!forceLocationOpen)}
                      aria-expanded={forceLocationOpen}
                      aria-pressed={forceLocationOpen}
                      title="Request fresh GPS from patrol units (silent)"
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-none shadow-sm transition sm:text-[11px] ${
                        forceLocationOpen
                          ? "border-sky-400 bg-sky-500 text-white"
                          : "border-sky-500/70 bg-sky-600 text-white hover:bg-sky-500"
                      }`}
                    >
                      <GpsLocateIcon />
                      <span className="whitespace-nowrap">Force Location</span>
                    </button>
                  )}

                  {showGenerateReport && onGenerateReportOpenChange && (
                    <button
                      type="button"
                      onClick={() => onGenerateReportOpenChange(!generateReportOpen)}
                      aria-expanded={generateReportOpen}
                      aria-pressed={generateReportOpen}
                      title="Generate patrol and incident reports"
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-none shadow-sm transition sm:text-[11px] ${
                        generateReportOpen
                          ? "border-violet-400 bg-violet-500 text-white"
                          : "border-violet-500/70 bg-violet-600 text-white hover:bg-violet-500"
                      }`}
                    >
                      <ReportIcon />
                      <span className="whitespace-nowrap">Generate Report</span>
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {mapViewLayers && onMapViewLayerChange && (
            <>
              <ToolbarSeparator />
              <MapViewPicker
                layers={mapViewLayers}
                onLayerChange={onMapViewLayerChange}
              />
              <button
                type="button"
                onClick={() => setMapOverlayOpen(true)}
                title="Map overlay settings"
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[10px] font-medium text-muted transition hover:bg-background/80 hover:text-foreground sm:text-[11px]"
              >
                <LayersIcon />
                <span className="whitespace-nowrap">Map Overlay</span>
              </button>
            </>
          )}
        </>
      )}

      <div className="ml-auto w-28 shrink-0 sm:w-56">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            disabled
            placeholder="Search..."
            aria-label="Search patrol or location"
            className="w-full rounded-md border border-border/60 bg-background/60 py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
          />
        </div>
      </div>
    </div>
  );
}
