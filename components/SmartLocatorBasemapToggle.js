"use client";

import { BASEMAPS } from "@/lib/mapBasemaps";

const SHORT_LABELS = {
  street: "Street",
  satellite: "Sat",
  cartoDark: "Dark",
  cartoLight: "Light",
};

export default function SmartLocatorBasemapToggle({ basemapId, onBasemapChange }) {
  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-3 z-[1000]"
      role="group"
      aria-label="Map style"
    >
      <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white/95 shadow-sm backdrop-blur-sm">
        {BASEMAPS.map((basemap) => {
          const active = basemap.id === basemapId;
          return (
            <button
              key={basemap.id}
              type="button"
              title={basemap.label}
              aria-pressed={active}
              onClick={() => onBasemapChange(basemap.id)}
              className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {SHORT_LABELS[basemap.id] ?? basemap.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
