"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PatrolStatusDetachFrame from "@/components/PatrolStatusDetachFrame";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import { upsertLatestLocationRow } from "@/lib/monitorLocations";
import {
  readDetachLocked,
  writeDetachLocked,
} from "@/lib/patrolStatusDetachStorage";
import { useWindowDrag } from "@/lib/useWindowDrag";
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
  const [locked, setLocked] = useState(false);

  const latestLocations = useMemo(
    () => locations.filter((loc) => loc.live_tracking_active !== false),
    [locations]
  );

  const { onTitleBarPointerDown, moveBlocked } = useWindowDrag({ locked });

  useEffect(() => {
    setLocked(readDetachLocked());
  }, []);

  const handleLockedChange = useCallback((next) => {
    setLocked(next);
    writeDetachLocked(next);
  }, []);

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

        setError("");
        setLocations(data.locations ?? []);
      } catch {
        if (active) setError("Could not load patrol locations.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    const refreshId = setInterval(loadLocations, MONITOR_LOCATIONS_REFRESH_MS);

    const locationChannel = supabase
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

    const presenceChannel = supabase
      .channel("patrol_status_popout_presence")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mobile_device_profiles" },
        (payload) => {
          const row = payload.new;
          if (!row?.access_token_id || !row.last_seen_at) return;

          setLocations((prev) =>
            prev.map((loc) =>
              loc.access_token_id === row.access_token_id
                ? { ...loc, last_seen_at: row.last_seen_at }
                : loc
            )
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(refreshId);
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(presenceChannel);
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

  const subtitle = `${latestLocations.length} active unit${
    latestLocations.length === 1 ? "" : "s"
  } · separate window`;

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
    <main className="h-dvh overflow-hidden bg-background p-1.5">
      <PatrolStatusDetachFrame
        className="h-full w-full"
        locked={locked}
        onLockedChange={handleLockedChange}
        onDock={() => window.close()}
        onTitleBarPointerDown={onTitleBarPointerDown}
        subtitle={subtitle}
        dragHint={
          locked
            ? null
            : moveBlocked
              ? "Unlock, then drag — or move using the browser window frame"
              : "Drag title bar to move this window"
        }
      >
        {error && (
          <p className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}
        <PatrolStatusListPanel
          locations={latestLocations}
          selectedPatrolKey={selectedPatrolKey}
          onSelectPatrol={handleSelectPatrol}
          nowMs={nowMs}
          intervalSeconds={intervalSeconds}
          showHeader={false}
          embedded
        />
      </PatrolStatusDetachFrame>
    </main>
  );
}
