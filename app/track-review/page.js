"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MonitorHeader from "@/components/MonitorHeader";
import MapToolbar from "@/components/MapToolbar";
import TrackReview from "@/components/TrackReview";
import CommandBillingUnavailable from "@/components/CommandBillingUnavailable";
import { DEFAULT_BASEMAP_ID } from "@/lib/mapBasemaps";
import { useMapViewOptions } from "@/lib/useMapViewOptions";
import { readTrackReviewUnitKey } from "@/lib/trackReview";
import { useCommandBillingGate } from "@/lib/useCommandBillingGate";

function TrackReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUnitKey = readTrackReviewUnitKey(searchParams);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [basemapId, setBasemapId] = useState(DEFAULT_BASEMAP_ID);
  const { layers: mapViewLayers } = useMapViewOptions();
  const { loading: billingGateLoading, blocked: billingBlocked, message: billingMessage } =
    useCommandBillingGate(user);

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

  if (billingGateLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  if (billingBlocked) {
    return (
      <CommandBillingUnavailable
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        message={billingMessage}
      />
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
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
      />
      <TrackReview
        basemapId={basemapId}
        showPatrolStatus={mapViewLayers.patrolStatus}
        initialUnitKey={initialUnitKey}
      />
    </main>
  );
}

export default function TrackReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-muted">Loading...</p>
          </div>
        </main>
      }
    >
      <TrackReviewPageContent />
    </Suspense>
  );
}
