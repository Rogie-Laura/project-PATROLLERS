"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const PatrolMap = dynamic(() => import("@/components/PatrolMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted">
      Loading map...
    </div>
  ),
});

function getLatestByPatrol(locations) {
  const latest = new Map();

  for (const loc of locations) {
    const existing = latest.get(loc.user_id);
    if (!existing || new Date(loc.created_at) > new Date(existing.created_at)) {
      latest.set(loc.user_id, loc);
    }
  }

  return Array.from(latest.values());
}

export default function MonitorPage() {
  const supabase = createClient();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const latestLocations = useMemo(
    () => getLatestByPatrol(locations),
    [locations]
  );

  useEffect(() => {
    async function loadLocations() {
      const { data, error: fetchError } = await supabase
        .from("location_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLocations(data || []);
      }
      setLoading(false);
    }

    loadLocations();

    const channel = supabase
      .channel("location_updates_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_updates" },
        (payload) => {
          setLocations((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <main className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">Monitor Dashboard</h1>
          <p className="text-xs text-muted">
            {latestLocations.length} active patrol
            {latestLocations.length !== 1 ? "s" : ""} on map
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
        >
          Home
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-[400px] flex-1 lg:min-h-0">
          {loading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center text-muted">
              Loading patrol data...
            </div>
          ) : latestLocations.length === 0 ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 px-6 text-center text-muted">
              <p>No locations loaded yet.</p>
              <p className="text-sm">
                Send a location from Patrol Login, then refresh this page.
              </p>
            </div>
          ) : (
            <PatrolMap locations={latestLocations} />
          )}
        </section>

        <aside className="w-full overflow-y-auto border-t border-border bg-card lg:w-80 lg:border-t-0 lg:border-l">
          <div className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Patrol List
            </h2>

            {error && (
              <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {latestLocations.length === 0 ? (
              <p className="text-sm text-muted">
                No patrol locations yet. Ask patrols to log in and send their
                location.
              </p>
            ) : (
              <ul className="space-y-2">
                {latestLocations.map((loc) => (
                  <li
                    key={loc.user_id}
                    className="rounded-lg border border-border bg-background px-3 py-2.5"
                  >
                    <p className="font-medium">
                      {loc.patrol_name || "Unknown Patrol"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Last seen: {new Date(loc.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
