import { createAdminClient } from "@/lib/supabase/admin";

export const MOBILE_LOCATION_INTERVAL_MINUTES = Number(
  process.env.MOBILE_LOCATION_INTERVAL_MINUTES ?? 30
);

export const ADMIN_ROLES = new Set(["phq", "RCC", "System Administrator"]);

export function extractBearerToken(request) {
  const authHeader = request?.headers?.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  return null;
}

export async function resolveAccessToken(rawToken) {
  if (!rawToken) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("access_tokens")
    .select("id, token, label, is_active")
    .eq("token", rawToken)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;
  return data;
}

export async function getAccessTokenFromRequest(request) {
  const bearer = extractBearerToken(request);
  if (bearer) return resolveAccessToken(bearer);

  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  const token = String(body?.token ?? "").trim();
  if (!token) return null;
  return resolveAccessToken(token);
}

export function normalizePersonnelOnBoard(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => ({
      rank_name: String(entry?.rank_name ?? entry?.rankName ?? "").trim(),
      mobile_number: String(
        entry?.mobile_number ?? entry?.mobileNumber ?? ""
      ).trim(),
    }))
    .filter((entry) => entry.rank_name || entry.mobile_number);
}

export function buildPatrolLabel(profile) {
  if (profile?.mobile_plate) return profile.mobile_plate;
  if (profile?.radio_call_sign) return profile.radio_call_sign;
  if (profile?.unit) return profile.unit;
  return "Mobile Patrol";
}
