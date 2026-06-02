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
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Image
            src="/PNP.png"
            alt="PNP"
            width={36}
            height={36}
            className="h-8 w-auto shrink-0 object-contain"
          />
          <Image
            src="/PRO4A.png"
            alt="PRO4A"
            width={36}
            height={40}
            className="h-8 w-auto shrink-0 object-contain"
          />
          <div className="min-w-0 border-l border-border/60 pl-2 sm:pl-2.5">
            <h1 className="truncate text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
              PATROLLERS MONITORING CENTER
            </h1>
          </div>
        </div>

        <AccountCard
          user={user}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </header>

      <section className="relative min-h-0 flex-1">
        <PatrolMap locations={latestLocations} />

        {error && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
            {error}
          </div>
        )}

        {!loading && !error && latestLocations.length === 0 && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 max-w-md -translate-x-1/2 rounded-xl border border-border bg-card/95 px-4 py-3 text-center text-sm text-muted shadow-lg backdrop-blur-sm">
            Waiting for patrol locations from mobile devices. Updates appear here
            in realtime.
          </div>
        )}
      </section>
    </main>
  );
}
