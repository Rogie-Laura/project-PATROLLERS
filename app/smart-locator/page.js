"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import PatrolLoginCard from "@/components/PatrolLoginCard";
import SmartLocatorDashboard from "@/components/SmartLocatorDashboard";
import { isCommandCenterRole } from "@/lib/auth/roles";

export default function SmartLocatorPage() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState("error");

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const sessionUser = data.user ?? null;
        if (sessionUser && !isCommandCenterRole(sessionUser.role)) {
          setError("Smart Locator is for command center accounts only.");
          setUser(null);
          return;
        }
        setUser(sessionUser);
      })
      .catch(() => {})
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
    setErrorKind("error");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorKind(res.status === 409 ? "session_active" : "error");
        setError(data.error || "Login failed.");
        return;
      }

      if (!isCommandCenterRole(data.user?.role)) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        setError("Smart Locator is for command center accounts only.");
        setUser(null);
        return;
      }

      setUser(data.user);
      setPassword("");
    } catch {
      setError("Network error. Please try again.");
      setErrorKind("error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setError("");
    setErrorKind("error");
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
    "w-full rounded-lg border border-border/80 bg-background/80 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:rounded-xl sm:py-3 sm:pl-11 sm:text-base";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]"
      />

      <div className="relative w-full max-w-sm sm:max-w-md">
        <PatrolLoginCard
          title="Patrollers Smart Locator"
          subtitle="Sign in with your Patrollers monitoring account."
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
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`${inputClassName} pl-3`}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-0.5 block text-xs font-medium text-foreground/90 sm:mb-1 sm:text-sm">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClassName} pl-3`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-muted transition hover:text-foreground"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p
                className={`rounded-xl px-3 py-2.5 text-sm ring-1 ${
                  errorKind === "session_active"
                    ? "bg-amber-500/10 text-amber-300 ring-amber-500/25"
                    : "bg-red-500/10 text-red-400 ring-red-500/20"
                }`}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background shadow-lg shadow-accent/20 transition hover:bg-accent-dark disabled:opacity-50 sm:rounded-xl sm:py-3 sm:text-base"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </PatrolLoginCard>
      </div>
    </main>
  );
}
