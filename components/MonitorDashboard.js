"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import AccountCard from "@/components/AccountCard";

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

export default function MonitorDashboard({ user, onLogout }) {
  const supabase = createClient();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/PRO4A.png"
            alt="PRO4A"
            width={40}
            height={44}
            className="h-10 w-auto shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-wide sm:text-lg">
              PATROLLERS
            </h1>
            <p className="truncate text-xs text-muted sm:text-sm">
              Live Locator Map
              {!loading && (
                <>
                  {" "}
                  · {latestLocations.length} active patrol
                  {latestLocations.length !== 1 ? "s" : ""}
                </>
              )}
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent sm:inline">
          Online
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative min-h-[280px] flex-1 lg:min-h-0">
          <PatrolMap locations={latestLocations} />

          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-background/40 pt-8">
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted shadow-sm">
                Loading patrol data...
              </p>
            </div>
          )}

          {!loading && latestLocations.length === 0 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-xs -translate-x-1/2 rounded-xl border border-border bg-card/95 px-4 py-2.5 text-center text-sm text-muted shadow-lg backdrop-blur-sm">
              No patrol locations yet. Markers will appear here in realtime.
            </div>
          )}
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-80 lg:border-t-0 lg:border-l">
          <AccountCard
            user={user}
            onSignOut={handleSignOut}
            signingOut={signingOut}
          />

          <section className="rounded-xl border border-border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Patrol List
            </h2>

            {error && (
              <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {loading ? (
              <p className="text-sm text-muted">Loading patrols...</p>
            ) : latestLocations.length === 0 ? (
              <p className="text-sm text-muted">Waiting for patrol updates...</p>
            ) : (
              <ul className="space-y-2">
                {latestLocations.map((loc) => (
                  <li
                    key={loc.user_id}
                    className="rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <p className="font-medium">
                      {loc.patrol_name || "Unknown Patrol"}
                    </p>
                    {loc.badge_number && (
                      <p className="text-xs text-muted">
                        Badge {loc.badge_number}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-muted">
                      {Number(loc.latitude).toFixed(5)},{" "}
                      {Number(loc.longitude).toFixed(5)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Last seen: {new Date(loc.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
