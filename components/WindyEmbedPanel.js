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

export default function WindyEmbedPanel({
  mapViewport = null,
  onClose,
}) {
  const [productOverlay, setProductOverlay] = useState("wind");
  const [followMap, setFollowMap] = useState(true);
  const [lockedViewport, setLockedViewport] = useState(() => ({
    lat: mapViewport?.lat ?? FALLBACK_VIEWPORT.lat,
    lng: mapViewport?.lng ?? FALLBACK_VIEWPORT.lng,
    zoom: mapViewport?.zoom ?? FALLBACK_VIEWPORT.zoom,
  }));

  useEffect(() => {
    if (!followMap || !mapViewport) return;
    const timer = window.setTimeout(() => {
      setLockedViewport({
        lat: mapViewport.lat,
        lng: mapViewport.lng,
        zoom: mapViewport.zoom,
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [followMap, mapViewport]);

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
    <aside className="pointer-events-auto absolute bottom-3 right-3 top-3 z-[1100] flex w-[min(100%-1.5rem,26rem)] flex-col overflow-hidden rounded-xl border border-sky-500/40 bg-card/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300">
            Windy overlay
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">
            Windy.com weather
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Official embed — patrol map stays interactive beside this panel.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close Windy panel"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 border-b border-border/60 px-4 py-3">
        <label className="block text-xs font-medium text-muted">
          Windy layer
          <select
            value={productOverlay}
            onChange={(event) => setProductOverlay(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-sky-400"
          >
            {WINDY_OVERLAY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={followMap}
              onChange={(event) => setFollowMap(event.target.checked)}
              className="rounded border-border/70"
            />
            Follow map
          </label>
          <button
            type="button"
            onClick={syncNow}
            className="rounded-lg border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-background/80"
          >
            Sync now
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-sky-500/40 px-2.5 py-1 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
          >
            Open windy.com
          </a>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-black/40">
        <iframe
          key={embedUrl}
          title="Windy weather map"
          src={embedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </aside>
  );
}
