"use client";

import { useCallback, useState } from "react";
import MapLegendContent from "@/components/MapLegendContent";
import { MapViewStackEmptyFrame } from "@/components/MapViewStackSection";

const PANEL_WIDTH = 300;

const OTHER_SECTIONS = [
  { id: "pnpStations", title: "PNP Stations" },
  { id: "friendlyUnit", title: "Friendly Unit" },
  { id: "crimeEnvironment", title: "Crime Environment" },
];

function CollapsibleSection({ title, defaultOpen = false, children }) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-zinc-600/40 last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-zinc-900/35 px-3.5 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </span>
        <svg
          className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="px-3.5 py-3">{children}</div>
    </details>
  );
}

export default function MapPatrolLegendPanel({
  locations = [],
  visibility,
  onVisibilityChange,
}) {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-[550]">
      <button
        type="button"
        onClick={handleToggle}
        className="pointer-events-auto absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-600/50 bg-zinc-800/95 text-zinc-100 shadow-lg shadow-black/25 backdrop-blur-sm transition hover:border-zinc-500/70 hover:bg-zinc-700/95"
        aria-label={open ? "Close map legend" : "Open map legend"}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M2.75 5.75a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.5a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.5a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H3.5a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div
        className={`pointer-events-auto absolute left-0 top-0 flex max-h-full flex-col overflow-hidden border-r border-zinc-600/45 bg-zinc-800/94 shadow-[8px_0_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform duration-300 ease-out ${
          open
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full"
        }`}
        style={{ width: PANEL_WIDTH }}
        aria-hidden={!open}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-600/40 bg-zinc-900/50 py-2 pl-14 pr-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
            Map Legend
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-100"
            aria-label="Close legend panel"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <CollapsibleSection title="Patrolling" defaultOpen>
            <MapLegendContent
              locations={locations}
              visibility={visibility}
              onVisibilityChange={onVisibilityChange}
              showCheckboxes
              usePanelLabels
            />
          </CollapsibleSection>

          {OTHER_SECTIONS.map((section) => (
            <CollapsibleSection key={section.id} title={section.title}>
              <MapViewStackEmptyFrame />
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </div>
  );
}
