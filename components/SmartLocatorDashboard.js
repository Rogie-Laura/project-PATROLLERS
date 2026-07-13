"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import SmartLocatorHeader from "@/components/SmartLocatorHeader";
import { isSystemAdministrator } from "@/lib/auth/roles";

const SmartLocatorMap = dynamic(() => import("@/components/SmartLocatorMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted">
      Loading map...
    </div>
  ),
});

export default function SmartLocatorDashboard({ user, onLogout }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const canEditMarkerSize = isSystemAdministrator(user?.role);

  const loadPoints = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/smart-locator/points");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load map points.");
      setPoints(data.points ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  async function handleCreatePoint(payload) {
    const res = await fetch("/api/smart-locator/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save point.");
    setPoints((prev) => [data.point, ...prev]);
    return data.point;
  }

  async function handleDeletePoint(id) {
    const res = await fetch(`/api/smart-locator/points/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not delete point.");
    setPoints((prev) => prev.filter((point) => point.id !== id));
  }

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/smart-locator/auth/logout", { method: "POST" }).catch(() => {});
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <SmartLocatorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />

      {error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading plotted points...
          </div>
        ) : (
          <SmartLocatorMap
            points={points}
            onCreatePoint={handleCreatePoint}
            onDeletePoint={handleDeletePoint}
            canEditMarkerSize={canEditMarkerSize}
          />
        )}
      </div>
    </main>
  );
}
