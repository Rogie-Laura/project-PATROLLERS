"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MonitorHeader from "@/components/MonitorHeader";
import MapToolbar from "@/components/MapToolbar";
import TrackReview from "@/components/TrackReview";
import { DEFAULT_BASEMAP_ID } from "@/lib/mapBasemaps";
import { useMapViewOptions } from "@/lib/useMapViewOptions";

export default function TrackReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [basemapId, setBasemapId] = useState(DEFAULT_BASEMAP_ID);
  const {
    showPatrolStatus,
    setShowPatrolStatus,
    showLegend,
    setShowLegend,
    showStatistics,
    setShowStatistics,
  } = useMapViewOptions();

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (!data.user) {
          router.replace("/");
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        if (active) router.replace("/");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="flex h-dvh flex-col bg-background">
      <MonitorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <MapToolbar
        active="review"
        user={user}
        showBasemap
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
        showPatrolStatus={showPatrolStatus}
        onShowPatrolStatusChange={setShowPatrolStatus}
        showLegend={showLegend}
        onShowLegendChange={setShowLegend}
        showStatistics={showStatistics}
        onShowStatisticsChange={setShowStatistics}
      />
      <TrackReview
        basemapId={basemapId}
        showPatrolStatus={showPatrolStatus}
        showLegend={showLegend}
        showStatistics={showStatistics}
      />
    </main>
  );
}
