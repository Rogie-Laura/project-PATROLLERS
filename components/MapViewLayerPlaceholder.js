"use client";

export default function MapViewLayerPlaceholder({ title }) {
  return (
    <div className="pointer-events-auto w-[min(100%,220px)] rounded-lg border border-zinc-600/45 bg-zinc-800/88 px-3 py-2.5 shadow-lg shadow-black/25 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-300">
        Layer preview — ongoing development.
      </p>
    </div>
  );
}
