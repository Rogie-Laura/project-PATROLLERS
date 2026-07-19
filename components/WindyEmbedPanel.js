"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WINDY_OVERLAY_OPTIONS,
  buildWindyEmbedUrl,
  buildWindySiteUrl,
} from "@/lib/windyEmbed";

const FALLBACK_VIEWPORT = {
  lat: 14.2,
  lng: 121.1,
  zoom: 9,
};

/**
 * Full-map Windy overlay via official embed iframe.
 * Default is click-through so Leaflet patrol markers stay usable.
 */
export default function WindyEmbedPanel({
  mapViewport = null,
  onClose,
}) {
  const [productOverlay, setProductOverlay] = useState("wind");
  const [followMap, setFollowMap] = useState(true);
  const [interactWithWindy, setInteractWithWindy] = useState(false);
  const [opacity, setOpacity] = useState(0.62);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [lockedViewport, setLockedViewport] = useState(() => ({
    lat: mapViewport?.lat ?? FALLBACK_VIEWPORT.lat,
    lng: mapViewport?.lng ?? FALLBACK_VIEWPORT.lng,
    zoom: mapViewport?.zoom ?? FALLBACK_VIEWPORT.zoom,
  }));

  useEffect(() => {
    if (!followMap || !mapViewport || interactWithWindy) return;
    const timer = window.setTimeout(() => {
      setLockedViewport({
        lat: mapViewport.lat,
        lng: mapViewport.lng,
        zoom: mapViewport.zoom,
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [followMap, mapViewport, interactWithWindy]);

  const embedUrl = useMemo(
    () =>
      buildWindyEmbedUrl({
        lat: lockedViewport.lat,
        lon: lockedViewport.lng,
        zoom: lockedViewport.zoom,
        overlay: productOverlay,
      }),
    [lockedViewport, productOverlay]
  );

  const siteUrl = useMemo(
    () =>
      buildWindySiteUrl({
        lat: lockedViewport.lat,
        lon: lockedViewport.lng,
        zoom: lockedViewport.zoom,
        overlay: productOverlay,
      }),
    [lockedViewport, productOverlay]
  );

  function syncNow() {
    if (!mapViewport) return;
    setLockedViewport({
      lat: mapViewport.lat,
      lng: mapViewport.lng,
      zoom: mapViewport.zoom,
    });
  }

  return (
    <>
      {/* Full-bleed Windy over the command map */}
      <div
        className="pointer-events-none absolute inset-0 z-[420] overflow-hidden"
        aria-hidden={!interactWithWindy}
      >
        <div
          className={`absolute inset-0 ${
            interactWithWindy ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ opacity }}
        >
          <iframe
            key={embedUrl}
            title="Windy weather map overlay"
            src={embedUrl}
            className="h-full w-full border-0"
            style={{
              // Soft-blend Windy basemap so our map + markers still read through.
              mixBlendMode: "screen",
              filter: "contrast(1.05) saturate(1.1)",
            }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      {/* Floating controls — always clickable */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[1200] w-[min(100%-1.5rem,34rem)] -translate-x-1/2">
        <div className="overflow-hidden rounded-xl border border-sky-500/40 bg-card/95 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                Windy on map
              </p>
              <p className="truncate text-xs text-muted">
                {interactWithWindy
                  ? "Interacting with Windy (patrol map pan/zoom paused under overlay)"
                  : "Click-through mode — pan/zoom patrol map; Windy follows view"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setControlsOpen((open) => !open)}
                className="rounded-md px-2 py-1 text-xs text-muted transition hover:bg-background/80 hover:text-foreground"
              >
                {controlsOpen ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                aria-label="Close Windy overlay"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>

          {controlsOpen ? (
            <div className="space-y-2 px-3 py-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-muted">
                  Layer
                  <select
                    value={productOverlay}
                    onChange={(event) => setProductOverlay(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-sky-400"
                  >
                    {WINDY_OVERLAY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-muted">
                  Opacity {Math.round(opacity * 100)}%
                  <input
                    type="range"
                    min={0.2}
                    max={0.95}
                    step={0.05}
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={followMap}
                    disabled={interactWithWindy}
                    onChange={(event) => setFollowMap(event.target.checked)}
                  />
                  Follow map
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200">
                  <input
                    type="checkbox"
                    checked={interactWithWindy}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setInteractWithWindy(next);
                      if (next) setFollowMap(false);
                      else setFollowMap(true);
                    }}
                  />
                  Interact with Windy
                </label>
                <button
                  type="button"
                  onClick={syncNow}
                  className="rounded-lg border border-border/70 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-background/80"
                >
                  Sync now
                </button>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-sky-500/40 px-2.5 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                >
                  Open windy.com
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
