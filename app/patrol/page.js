"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Pro4aLogo from "@/components/Pro4aLogo";

export default function PatrolPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }
    setSubmitting(false);
  }

  async function handleLogout() {
    stopTracking();
    await supabase.auth.signOut();
    setUser(null);
  }

  async function sendCoords(latitude, longitude, accuracy = null) {
    if (!user) return false;

    const displayName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Patrol";

    const { error: insertError } = await supabase.from("location_updates").insert({
      user_id: user.id,
      latitude,
      longitude,
      accuracy,
      patrol_name: displayName,
    });

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setLastLocation({ latitude, longitude, accuracy, at: new Date() });
    setStatus("Location sent successfully");
    setError("");
    return true;
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
    } catch (highAccuracyError) {
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
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-6 inline-block text-sm text-muted hover:text-foreground">
          ← Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-6 text-center">
            <Pro4aLogo />
            <h1 className="mt-4 text-2xl font-bold">Patrol Login</h1>
            <p className="mt-1 text-sm text-muted">
              Log in and share your GPS location from your phone browser.
            </p>
          </div>

          {!user ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-accent"
                  placeholder="patrol@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-accent"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-accent py-3 font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-sm text-muted">Signed in as</p>
                <p className="font-medium">{user.email}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={sendOnce}
                  disabled={submitting || tracking}
                  className="rounded-lg border border-border bg-background py-3 font-medium transition hover:border-accent disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Location Once"}
                </button>

                {!tracking ? (
                  <button
                    onClick={startTracking}
                    className="rounded-lg bg-accent py-3 font-semibold text-background transition hover:bg-accent-dark"
                  >
                    Start Live Tracking
                  </button>
                ) : (
                  <button
                    onClick={stopTracking}
                    className="rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
                  >
                    Stop Live Tracking
                  </button>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="rounded-lg border border-dashed border-border bg-background/50 p-4">
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="text-sm font-medium text-accent"
                >
                  {showManual ? "Hide manual coordinates" : "GPS not working? Enter coordinates manually"}
                </button>

                {showManual && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-muted">
                      Useful for desktop testing. Default is Manila area. On real patrol, use phone GPS.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted">Latitude</label>
                        <input
                          type="text"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted">Longitude</label>
                        <input
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
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
                <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                  {status}
                </p>
              )}

              {lastLocation && (
                <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
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
                className="w-full rounded-lg border border-border py-3 text-sm text-muted transition hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
