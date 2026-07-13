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
  const [establishments, setEstablishments] = useState([]);
  const [friendlyForces, setFriendlyForces] = useState([]);
  const [isoMarkers, setIsoMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const canEditMarkerSize =
    isSystemAdministrator(user?.role) ||
    user?.smartLocatorRole === "System Administrator";

  const loadMapData = useCallback(async () => {
    setError("");
    try {
      const [pointsRes, establishmentsRes, forcesRes, isoRes] =
        await Promise.all([
          fetch("/api/smart-locator/points"),
          fetch("/api/smart-locator/pnp-establishments"),
          fetch("/api/smart-locator/friendly-forces"),
          fetch("/api/smart-locator/iso"),
        ]);
      const pointsData = await pointsRes.json();
      const establishmentsData = await establishmentsRes.json();
      const forcesData = await forcesRes.json();
      const isoData = await isoRes.json();
      if (!pointsRes.ok) {
        throw new Error(pointsData.error || "Could not load map points.");
      }
      if (!establishmentsRes.ok) {
        throw new Error(
          establishmentsData.error || "Could not load PNP establishments."
        );
      }
      if (!forcesRes.ok) {
        throw new Error(forcesData.error || "Could not load friendly forces.");
      }
      if (!isoRes.ok) {
        throw new Error(isoData.error || "Could not load ISO markers.");
      }
      setPoints(pointsData.points ?? []);
      setEstablishments(establishmentsData.establishments ?? []);
      setFriendlyForces(forcesData.forces ?? []);
      setIsoMarkers(isoData.markers ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

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

  async function handleCreateEstablishment(payload) {
    const res = await fetch("/api/smart-locator/pnp-establishments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save establishment.");
    setEstablishments((prev) => [data.establishment, ...prev]);
    return data.establishment;
  }

  async function handleUpdateEstablishment(id, payload) {
    const res = await fetch(`/api/smart-locator/pnp-establishments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not update establishment.");
    setEstablishments((prev) =>
      prev.map((row) => (row.id === id ? data.establishment : row))
    );
    return data.establishment;
  }

  async function handleDeleteEstablishment(id) {
    const res = await fetch(`/api/smart-locator/pnp-establishments/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not delete establishment.");
    setEstablishments((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleCreateFriendlyForce(payload) {
    const res = await fetch("/api/smart-locator/friendly-forces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save friendly force.");
    setFriendlyForces((prev) => [data.force, ...prev]);
    return data.force;
  }

  async function handleUpdateFriendlyForce(id, payload) {
    const res = await fetch(`/api/smart-locator/friendly-forces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not update friendly force.");
    setFriendlyForces((prev) =>
      prev.map((row) => (row.id === id ? data.force : row))
    );
    return data.force;
  }

  async function handleDeleteFriendlyForce(id) {
    const res = await fetch(`/api/smart-locator/friendly-forces/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not delete friendly force.");
    setFriendlyForces((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleCreateIso(payload) {
    const res = await fetch("/api/smart-locator/iso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save ISO marker.");
    setIsoMarkers((prev) => [data.marker, ...prev]);
    return data.marker;
  }

  async function handleUpdateIso(id, payload) {
    const res = await fetch(`/api/smart-locator/iso/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not update ISO marker.");
    setIsoMarkers((prev) =>
      prev.map((row) => (row.id === id ? data.marker : row))
    );
    return data.marker;
  }

  async function handleDeleteIso(id) {
    const res = await fetch(`/api/smart-locator/iso/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not delete ISO marker.");
    setIsoMarkers((prev) => prev.filter((row) => row.id !== id));
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
            user={user}
            points={points}
            establishments={establishments}
            friendlyForces={friendlyForces}
            isoMarkers={isoMarkers}
            onCreatePoint={handleCreatePoint}
            onDeletePoint={handleDeletePoint}
            onCreateEstablishment={handleCreateEstablishment}
            onUpdateEstablishment={handleUpdateEstablishment}
            onDeleteEstablishment={handleDeleteEstablishment}
            onCreateFriendlyForce={handleCreateFriendlyForce}
            onUpdateFriendlyForce={handleUpdateFriendlyForce}
            onDeleteFriendlyForce={handleDeleteFriendlyForce}
            onCreateIso={handleCreateIso}
            onUpdateIso={handleUpdateIso}
            onDeleteIso={handleDeleteIso}
            canEditMarkerSize={canEditMarkerSize}
          />
        )}
      </div>
    </main>
  );
}
