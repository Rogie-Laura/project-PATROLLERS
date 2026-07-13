"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import PatrolLoginCard from "@/components/PatrolLoginCard";
import SmartLocatorDashboard from "@/components/SmartLocatorDashboard";

export default function SmartLocatorPage() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/smart-locator/auth/me")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data.user) {
          setUser(data.user);
          return;
        }
        setUser(null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/smart-locator/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Access denied.");
        return;
      }

      setUser(data.user);
      setToken("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setError("");
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return <SmartLocatorDashboard user={user} onLogout={handleLogout} />;
  }

  const inputClassName =
    "w-full rounded-lg border border-border/80 bg-background/80 py-2.5 pl-3 pr-16 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:rounded-xl sm:py-3 sm:text-base";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]"
      />

      <div className="relative w-full max-w-sm sm:max-w-md">
        <PatrolLoginCard
          title="Patrollers Smart Locator"
          subtitle="Enter your station access token. No username or password needed."
        >
          <div className="mb-5 flex items-center justify-center gap-3">
            <Image
              src="/PNP.png"
              alt="PNP"
              width={48}
              height={48}
              className="h-12 w-auto object-contain"
            />
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                Patrollers
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Smart Locator
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-foreground/90 sm:mb-1 sm:text-sm">
                Access token
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={inputClassName}
                  placeholder="Enter station token"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-muted transition hover:text-foreground"
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Token is linked to your Office and Unit (example: Rosario MPS · Cavite PPO).
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background shadow-lg shadow-accent/20 transition hover:bg-accent-dark disabled:opacity-50 sm:rounded-xl sm:py-3 sm:text-base"
            >
              {submitting ? "Opening map..." : "Open Smart Locator"}
            </button>
          </form>
        </PatrolLoginCard>
      </div>
    </main>
  );
}
