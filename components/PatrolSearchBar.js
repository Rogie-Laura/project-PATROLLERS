"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchPatrolLocations } from "@/lib/patrolSearch";

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function PatrolSearchBar({
  locations = [],
  onSelectPatrol,
  placeholder = "Office, unit, plate, name…",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  const results = useMemo(
    () => searchPatrolLocations(locations, query, 10),
    [locations, query]
  );

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleSelect(location) {
    if (!location) return;
    onSelectPatrol?.(location);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const picked =
        activeIndex >= 0 ? results[activeIndex]?.location : results[0]?.location;
      handleSelect(picked);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search patrol unit"
        aria-expanded={showDropdown}
        aria-controls="patrol-search-results"
        autoComplete="off"
        className="w-full rounded-md border border-border/60 bg-background/60 py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted/70 outline-none focus:border-accent sm:text-xs"
      />

      {showDropdown && (
        <div
          id="patrol-search-results"
          role="listbox"
          className="absolute right-0 top-full z-[700] mt-1 max-h-72 w-[min(100vw-1.5rem,22rem)] overflow-y-auto rounded-lg border border-border/80 bg-card/98 py-1 shadow-2xl backdrop-blur-md sm:w-80"
        >
          {results.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted">
              Walang unit na tumugma. Subukan office, unit, plate, o pangalan ng
              naka-deploy.
            </p>
          ) : (
            results.map((result, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={result.key ?? index}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(result.location)}
                  className={`block w-full px-3 py-2 text-left transition ${
                    active
                      ? "bg-accent/15 text-foreground"
                      : "text-foreground hover:bg-background/70"
                  }`}
                >
                  <span className="block truncate text-xs font-medium">
                    {result.label}
                  </span>
                  {result.meta ? (
                    <span className="mt-0.5 block truncate text-[10px] text-muted">
                      {result.meta}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
