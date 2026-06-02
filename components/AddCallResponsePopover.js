"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function LocationSearchIcon() {
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
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function AddCallResponsePopover({
  open,
  onClose,
  selectedPlace,
  onSelectedPlaceChange,
  onAddIncidentMarker,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef(null);
  const panelRef = useRef(null);

  const runSearch = useCallback(async (term) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearchError("");
      return;
    }

    setSearching(true);
    setSearchError("");

    try {
      const res = await fetch(
        `/api/places/search?q=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSuggestions([]);
        setSearchError(data.error || "Search failed");
        return;
      }

      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
      setSearchError("Could not search places");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, runSearch]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest?.("[data-call-response-trigger]")) return;
      onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSuggestions([]);
      setSearchError("");
    }
  }, [open]);

  if (!open) return null;

  function handleSelectPlace(place) {
    onSelectedPlaceChange(place);
    setQuery(place.displayName);
    setSuggestions([]);
  }

  function handleAddMarker() {
    if (!selectedPlace) return;
    onAddIncidentMarker(selectedPlace);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Add call response"
      className="absolute left-0 top-full z-[700] mt-2 w-[min(100vw-1.5rem,20rem)] rounded-lg border border-border/80 bg-card/98 p-3 shadow-2xl backdrop-blur-md sm:w-80"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
        Call response location
      </p>

      <label className="mb-1 block text-[10px] font-medium text-muted">
        Search place
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted">
          <LocationSearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedPlace && e.target.value !== selectedPlace.displayName) {
              onSelectedPlaceChange(null);
            }
          }}
          placeholder="Barangay, city, landmark…"
          autoComplete="off"
          className="w-full rounded-md border border-border/70 bg-background/80 py-1.5 pl-8 pr-2 text-xs text-foreground outline-none focus:border-accent"
        />
      </div>

      {searching && (
        <p className="mt-1.5 text-[10px] text-muted">Searching…</p>
      )}
      {searchError && (
        <p className="mt-1.5 text-[10px] text-red-400">{searchError}</p>
      )}

      {suggestions.length > 0 && (
        <ul
          className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border/60 bg-background/60"
          role="listbox"
        >
          {suggestions.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                role="option"
                onClick={() => handleSelectPlace(place)}
                className="w-full border-b border-border/40 px-2 py-2 text-left text-[11px] text-foreground transition last:border-b-0 hover:bg-accent/10"
              >
                {place.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedPlace && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5 text-[10px] leading-snug text-foreground">
          <span className="font-medium text-accent">Selected: </span>
          {selectedPlace.displayName}
        </p>
      )}

      <button
        type="button"
        disabled={!selectedPlace}
        onClick={handleAddMarker}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/70 bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Add call response
      </button>
    </div>
  );
}
