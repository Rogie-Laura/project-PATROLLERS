"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PatrollersBranding from "@/components/PatrollersBranding";
import PatrolLoginCard from "@/components/PatrolLoginCard";

export default function PatrolPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [manualLat, setManualLat] = useState("14.5995");
  const [manualLng, setManualLng] = useState("120.9842");
  const [showManual, setShowManual] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
      } else {
        setUser(data.user);
        setPassword("");
        setStatus("");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setSubmitting(false);
  }

  async function handleLogout() {
    stopTracking();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setLastLocation(null);
    setStatus("");
  }

  function handleSessionLost() {
    stopTracking();
    setUser(null);
    setError("You were signed in on another device. Please log in again.");
  }

  async function sendCoords(latitude, longitude, accuracy = null) {
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, accuracy }),
      });

      if (res.status === 401) {
        handleSessionLost();
        return false;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send location.");
        return false;
      }

      setLastLocation({ latitude, longitude, accuracy, at: new Date() });
      setStatus("Location sent successfully");
      setError("");
      return true;
    } catch {
      setError("Network error while sending location.");
      return false;
    }
  }

  async function sendLocation(position) {
    const { latitude, longitude, accuracy } = position.coords;
    return sendCoords(latitude, longitude, accuracy);
  }

  function getGeoErrorMessage(geoError) {
    if (geoError.code === 1) {
      return "Location blocked. Allow location access in your browser settings.";
    }
    if (geoError.code === 2) {
      return "GPS unavailable on this device. Try on a phone, or use manual coordinates below.";
    }
    if (geoError.code === 3) {
      return "Location request timed out. Try again or use manual coordinates below.";
    }
    return `${geoError.message}. On desktop localhost, GPS often fails — use manual coordinates or test on phone.`;
  }

  function getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported on this device.");
    }

    try {
      return await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    } catch {
      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      });
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    setTracking(true);
    setStatus("Getting location...");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
      },
      (geoError) => {
        setError(getGeoErrorMessage(geoError));
        setShowManual(true);
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  }

  function stopTracking() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setStatus("Tracking stopped");
  }

  async function sendOnce() {
    setSubmitting(true);
    setStatus("Getting location...");
    setError("");

    try {
      const position = await requestLocation();
      await sendLocation(position);
    } catch (geoError) {
      setError(getGeoErrorMessage(geoError));
      setShowManual(true);
    }

    setSubmitting(false);
  }

  async function sendManual() {
    const latitude = parseFloat(manualLat);
    const longitude = parseFloat(manualLng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Enter valid latitude and longitude numbers.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setError("Coordinates are out of range.");
      return;
    }

    setSubmitting(true);
    const ok = await sendCoords(latitude, longitude, null);
    if (ok) {
      setStatus("Manual location sent successfully");
    }
    setSubmitting(false);
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

  const inputClassName =
    "w-full rounded-xl border border-border/80 bg-background/80 py-3.5 pl-11 pr-4 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-hidden px-4 ${
        user ? "py-6 sm:py-10" : "justify-center py-4"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/5 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          ← Back to home
        </Link>

        <PatrollersBranding compact={!!user} />

        <PatrolLoginCard
          title={user ? "Patrol Console" : "Patrol Login"}
          subtitle={
            user
              ? "Share your live GPS location to the command center."
              : "Sign in with your badge number to begin location reporting."
          }
        >
          {!user ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClassName}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClassName} pr-12`}
                    placeholder="Enter Password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-background shadow-lg shadow-accent/20 transition hover:bg-accent-dark disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Signed in as
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {user.rank_fullname || user.full_name || user.email}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {user.email}
                  {user.unit ? ` · ${user.unit}` : ""}
                  {user.role ? ` · ${user.role}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={sendOnce}
                  disabled={submitting || tracking}
                  className="rounded-xl border border-border/80 bg-background/60 py-3 font-medium transition hover:border-accent hover:bg-accent/5 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Location Once"}
                </button>

                {!tracking ? (
                  <button
                    onClick={startTracking}
                    className="rounded-xl bg-accent py-3 font-semibold text-background shadow-lg shadow-accent/20 transition hover:bg-accent-dark"
                  >
                    Start Live Tracking
                  </button>
                ) : (
                  <button
                    onClick={stopTracking}
                    className="rounded-xl bg-red-600 py-3 font-semibold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
                  >
                    Stop Live Tracking
                  </button>
                )}
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
                  {error}
                </p>
              )}

              <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-4">
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="text-sm font-medium text-accent transition hover:text-accent-dark"
                >
                  {showManual
                    ? "Hide manual coordinates"
                    : "GPS not working? Enter coordinates manually"}
                </button>

                {showManual && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs leading-relaxed text-muted">
                      Useful for desktop testing. Default is Manila area. On real
                      patrol, use phone GPS.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                    </div>
                    <button
                      onClick={sendManual}
                      disabled={submitting}
                      className="w-full rounded-lg border border-accent/40 bg-accent/10 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
                    >
                      Send Manual Location
                    </button>
                  </div>
                )}
              </div>

              {status && (
                <p className="rounded-xl bg-accent/10 px-3 py-2.5 text-sm text-accent ring-1 ring-accent/20">
                  {status}
                </p>
              )}

              {lastLocation && (
                <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm">
                  <p className="font-medium">Last sent location</p>
                  <p className="mt-1 font-mono text-muted">
                    Lat: {lastLocation.latitude.toFixed(6)}
                  </p>
                  <p className="font-mono text-muted">
                    Lng: {lastLocation.longitude.toFixed(6)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {lastLocation.at.toLocaleString()}
                  </p>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-border/80 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          )}
        </PatrolLoginCard>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted/80">
          Authorized personnel only. Location data is transmitted for operational
          monitoring.
        </p>
      </div>
    </main>
  );
}
