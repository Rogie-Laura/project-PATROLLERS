import { createAdminClient } from "@/lib/supabase/admin";

export const MIN_LOCATION_INTERVAL_SECONDS = 30;
export const MAX_LOCATION_INTERVAL_SECONDS = 86_400; // 24 hours

const ENV_DEFAULT_SECONDS =
  Number(process.env.MOBILE_LOCATION_INTERVAL_MINUTES ?? 30) * 60;

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

export async function getLocationIntervalSeconds() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("location_interval_seconds")
      .eq("id", "default")
      .maybeSingle();

    if (!error && data?.location_interval_seconds != null) {
      return clampIntervalSeconds(data.location_interval_seconds);
    }
  } catch {
    // Fall through to env default.
  }

  return clampIntervalSeconds(ENV_DEFAULT_SECONDS);
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
