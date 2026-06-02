export default function MapToolbar() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-card/90 px-3 py-1 sm:px-4">
      <div className="relative min-w-0 flex-1">
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
          placeholder="Search patrol or location..."
          aria-label="Search patrol or location"
          className="w-full rounded-md border border-border/60 bg-background/60 py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
        />
      </div>

      <div
        className="hidden h-6 w-px shrink-0 bg-border/60 sm:block"
        aria-hidden
      />

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled
          title="Tools (coming soon)"
          className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-muted disabled:cursor-not-allowed disabled:opacity-60 sm:text-[11px]"
        >
          Tools
        </button>
        <button
          type="button"
          disabled
          title="Filters (coming soon)"
          className="rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-muted disabled:cursor-not-allowed disabled:opacity-60 sm:text-[11px]"
        >
          Filters
        </button>
      </div>
    </div>
  );
}
