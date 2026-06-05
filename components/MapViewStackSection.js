"use client";

export default function MapViewStackSection({ title, children }) {
  return (
    <section className="min-w-0">
      <header className="border-b border-zinc-600/40 bg-zinc-900/35 px-3.5 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </p>
      </header>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

export function MapViewStackEmptyFrame({ message = "Layer preview — ongoing development." }) {
  return (
    <div className="flex min-h-[72px] items-center justify-center rounded-md border border-dashed border-zinc-600/35 bg-zinc-900/25 px-3 py-4">
      <p className="text-center text-[11px] leading-snug text-zinc-500">{message}</p>
    </div>
  );
}
