"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import { upsertLatestLocationRow } from "@/lib/monitorLocations";
import {
  createPatrolStatusPopoutChannel,
  patrolUnitKey,
  POPOUT_MESSAGE,
  postPopoutMessage,
} from "@/lib/patrolStatusPopout";

const MONITOR_LOCATIONS_REFRESH_MS = 90_000;

export default function PatrolStatusPopoutView() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(180);
  const [selectedPatrolKey, setSelectedPatrolKey] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const latestLocations = useMemo(
    () => locations.filter((loc) => loc.tracking_active !== false),
    [locations]
  );

  const handleSelectPatrol = useCallback((location) => {
    const key = patrolUnitKey(location);
    setSelectedPatrolKey(key);

    const channel = createPatrolStatusPopoutChannel();
    postPopoutMessage(channel, POPOUT_MESSAGE.SELECT_UNIT, { location });
    channel?.close();
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (!data.user) router.replace("/");
      })
      .catch(() => {
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    fetch("/api/system-settings/map")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.location_interval_seconds) return;
        setIntervalSeconds(Number(data.location_interval_seconds));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const res = await fetch("/api/monitor/locations");
        const data = await res.json();
        if (!active) return;

        if (!res.ok) {
          setError(data.error ?? "Could not load patrol locations.");
          return;
        }

        setLocations(data.locations ?? []);
      } catch {
        if (active) setError("Could not load patrol locations.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    const refreshId = setInterval(loadLocations, MONITOR_LOCATIONS_REFRESH_MS);

    const channel = supabase
      .channel("patrol_status_popout_locations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_updates" },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          setLocations((prev) => upsertLatestLocationRow(prev, row));
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(refreshId);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const channel = createPatrolStatusPopoutChannel();
    if (!channel) return undefined;

    postPopoutMessage(channel, POPOUT_MESSAGE.POPOUT_OPEN);

    channel.onmessage = (event) => {
      const { type, payload } = event.data ?? {};
      if (type === POPOUT_MESSAGE.SYNC_SELECTION) {
        setSelectedPatrolKey(payload?.unitKey ?? null);
      }
    };

    function notifyClosed() {
      postPopoutMessage(channel, POPOUT_MESSAGE.POPOUT_CLOSED);
    }

    window.addEventListener("beforeunload", notifyClosed);

    return () => {
      notifyClosed();
      window.removeEventListener("beforeunload", notifyClosed);
      channel.close();
    };
  }, []);

  function handleDockBack() {
    window.close();
  }

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading patrol status...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-card px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Pop-out window
          </p>
          <h1 className="truncate text-sm font-semibold text-foreground">Patrol Status</h1>
        </div>
        <button
          type="button"
          onClick={handleDockBack}
          title="Close this window and show the list on the main map again"
          className="shrink-0 rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[10px] font-medium text-foreground transition hover:bg-background/80 sm:text-[11px]"
        >
          Dock to map
        </button>
      </header>

      {error && (
        <p className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1">
        <PatrolStatusListPanel
          locations={latestLocations}
          selectedPatrolKey={selectedPatrolKey}
          onSelectPatrol={handleSelectPatrol}
          nowMs={nowMs}
          intervalSeconds={intervalSeconds}
        />
      </div>

      <p className="shrink-0 border-t border-border/60 px-3 py-1.5 text-center text-[10px] text-muted">
        Click a unit to highlight it on the main map.
      </p>
    </main>
  );
}
