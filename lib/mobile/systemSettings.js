import { createAdminClient } from "@/lib/supabase/admin";
import {
  defaultMobileRelease,
  normalizeMobileRelease,
} from "@/lib/mobile/appRelease";
import {
  createDefaultRadiusRingSlots,
  normalizeRadiusRingSlots,
  parseRadiusRingSlotsInput,
} from "@/lib/incidentRadiusRings";

export const MIN_LOCATION_INTERVAL_SECONDS = 30;
export const MAX_LOCATION_INTERVAL_SECONDS = 86_400; // 24 hours

export const DIRECTIONS_PROVIDER = {
  osrm: "osrm",
  google: "google",
};

const ENV_DEFAULT_SECONDS =
  Number(process.env.MOBILE_LOCATION_INTERVAL_MINUTES ?? 3) * 60;

export function clampIntervalSeconds(seconds) {
  const value = Math.round(Number(seconds));
  if (!Number.isFinite(value)) return ENV_DEFAULT_SECONDS;
  return Math.min(
    MAX_LOCATION_INTERVAL_SECONDS,
    Math.max(MIN_LOCATION_INTERVAL_SECONDS, value)
  );
}

export function parseIntervalInput(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid interval greater than zero." };
  }

  const seconds =
    unit === "minutes" ? Math.round(amount * 60) : Math.round(amount);

  return { seconds: clampIntervalSeconds(seconds) };
}

export function formatIntervalLabel(seconds) {
  const clamped = clampIntervalSeconds(seconds);
  if (clamped % 60 === 0 && clamped >= 60) {
    const minutes = clamped / 60;
    return `Every ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `Every ${clamped} second${clamped === 1 ? "" : "s"}`;
}

export function normalizeDirectionsProvider(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === DIRECTIONS_PROVIDER.google) return DIRECTIONS_PROVIDER.google;
  return DIRECTIONS_PROVIDER.osrm;
}

export function isGoogleMapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

export async function getSystemSettings() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select(
        "location_interval_seconds, directions_provider, incident_radius_rings, mobile_latest_version_code, mobile_min_version_code, mobile_latest_version_name, mobile_apk_download_url, mobile_update_required, mobile_release_notes"
      )
      .eq("id", "default")
      .maybeSingle();

    if (!error && data) {
      return {
        location_interval_seconds: clampIntervalSeconds(
          data.location_interval_seconds ?? ENV_DEFAULT_SECONDS
        ),
        directions_provider: normalizeDirectionsProvider(
          data.directions_provider
        ),
        incident_radius_rings: normalizeRadiusRingSlots(
          data.incident_radius_rings
        ),
        ...normalizeMobileRelease(data),
      };
    }
  } catch {
    // Fall through to defaults.
  }

  return {
    location_interval_seconds: clampIntervalSeconds(ENV_DEFAULT_SECONDS),
    directions_provider: DIRECTIONS_PROVIDER.osrm,
    incident_radius_rings: createDefaultRadiusRingSlots(),
    ...defaultMobileRelease(),
  };
}

export async function getMobileAppRelease() {
  const settings = await getSystemSettings();
  return normalizeMobileRelease(settings);
}

export async function updateMobileAppRelease(release, userId = null) {
  const normalized = normalizeMobileRelease(release);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("system_settings")
    .upsert({
      id: "default",
      ...normalized,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .select(
      "mobile_latest_version_code, mobile_min_version_code, mobile_latest_version_name, mobile_apk_download_url, mobile_update_required, mobile_release_notes, updated_at"
    )
    .single();

  if (error) throw error;
  return normalizeMobileRelease(data);
}

export async function getLocationIntervalSeconds() {
  const settings = await getSystemSettings();
  return settings.location_interval_seconds;
}

export async function getDirectionsProvider() {
  const settings = await getSystemSettings();
  return settings.directions_provider;
}

export async function updateLocationIntervalSeconds(seconds, userId = null) {
  const clamped = clampIntervalSeconds(seconds);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("system_settings")
    .upsert({
      id: "default",
      location_interval_seconds: clamped,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .select("location_interval_seconds, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateDirectionsProvider(provider, userId = null) {
  const normalized = normalizeDirectionsProvider(provider);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("system_settings")
    .upsert({
      id: "default",
      directions_provider: normalized,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .select("directions_provider, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateIncidentRadiusRings(slots, userId = null) {
  const parsed = parseRadiusRingSlotsInput(slots);
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("system_settings")
    .upsert({
      id: "default",
      incident_radius_rings: parsed.slots,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .select("incident_radius_rings, updated_at")
    .single();

  if (error) throw error;
  return data;
}
