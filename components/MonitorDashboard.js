"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapToolbar from "@/components/MapToolbar";
import MonitorHeader from "@/components/MonitorHeader";

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
    const key = loc.access_token_id || loc.user_id;
    if (!key) continue;

    const existing = latest.get(key);
    if (!existing || new Date(loc.created_at) > new Date(existing.created_at)) {
      latest.set(key, loc);
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
      <MonitorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />

      <MapToolbar active="map" user={user} />

      <section className="relative min-h-0 flex-1">
        <PatrolMap locations={latestLocations} />

        {error && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
