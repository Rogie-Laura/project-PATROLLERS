"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccessTokensManager from "@/components/AccessTokensManager";
import MonitorHeader from "@/components/MonitorHeader";
import MapToolbar from "@/components/MapToolbar";
import { isAdminRole } from "@/lib/mobile/adminRoles";

export default function AccessTokensPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

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

        if (!isAdminRole(data.user.role)) {
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
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <MonitorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
      <MapToolbar active="tokens" user={user} />
      <AccessTokensManager />
    </main>
  );
}
