import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMMAND_ROLES, normalizeRole } from "@/lib/auth/roles";
import { isSessionExpired } from "@/lib/auth/sessionPolicy";
import {
  SESSION_MAX_AGE,
  extractSessionToken,
} from "@/lib/auth/session";
import { randomUUID } from "crypto";

export const SMART_LOCATOR_SESSION_COOKIE = "smart_locator_session";

/** Excel roles from access-token.xlsx */
export const SMART_LOCATOR_ROLES = {
  ENCODER: "Encoder",
  SYSTEM_ADMIN: "System Administrator",
};

const TOKEN_FIELDS =
  "id, access_token, office, unit, role, is_active, session, session_started_at";

export function buildSmartLocatorSessionCookie(sessionToken) {
  return {
    name: SMART_LOCATOR_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearSmartLocatorSessionCookie() {
  return {
    name: SMART_LOCATOR_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

/**
 * Map Smart Locator Excel role → command-center scope role for map filtering.
 * Encoder (station) → SCC · System Administrator → System Administrator
 */
function scopeRole(row) {
  const raw = String(row?.role ?? "").trim();
  if (raw === SMART_LOCATOR_ROLES.SYSTEM_ADMIN) {
    return COMMAND_ROLES.SYSTEM_ADMIN;
  }
  if (raw === SMART_LOCATOR_ROLES.ENCODER) {
    return COMMAND_ROLES.SCC;
  }

  const role = normalizeRole(raw);
  if (
    role === COMMAND_ROLES.SCC ||
    role === COMMAND_ROLES.PCC ||
    role === COMMAND_ROLES.RCC ||
    role === COMMAND_ROLES.SYSTEM_ADMIN
  ) {
    return role;
  }

  const unit = String(row?.unit ?? "").trim();
  return unit ? COMMAND_ROLES.SCC : COMMAND_ROLES.PCC;
}

export function userFromSmartLocatorToken(row) {
  if (!row) return null;

  const office = String(row.office ?? "").trim();
  const unit = String(row.unit ?? "").trim();
  const excelRole = String(row.role ?? "").trim() || SMART_LOCATOR_ROLES.ENCODER;
  const scopeLabel = [unit, office].filter(Boolean).join(" · ") || "Smart Locator";

  return {
    id: row.id,
    email: null,
    username: null,
    full_name: scopeLabel,
    rank: null,
    rank_fullname: scopeLabel,
    badge_number: unit || null,
    office,
    unit,
    role: scopeRole(row),
    smartLocatorRole: excelRole,
    is_active: row.is_active !== false,
    subscription_expires_at: null,
    accessMode: "token",
    smartLocatorTokenId: row.id,
  };
}

export async function resolveSmartLocatorAccessToken(rawToken) {
  const token = String(rawToken ?? "").trim();
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("smart_locator_access_tokens")
    .select(TOKEN_FIELDS)
    .ilike("access_token", token)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  if (String(data.access_token).trim().toLowerCase() !== token.toLowerCase()) {
    return null;
  }

  return data;
}

async function resolveSmartLocatorUserFromSession(sessionToken) {
  if (!sessionToken) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("smart_locator_access_tokens")
    .select(TOKEN_FIELDS)
    .eq("session", sessionToken)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  if (isSessionExpired(data.session_started_at, SESSION_MAX_AGE)) {
    await admin
      .from("smart_locator_access_tokens")
      .update({
        session: null,
        session_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return null;
  }

  return userFromSmartLocatorToken(data);
}

export async function getSmartLocatorUser(request = null) {
  const bearerToken = request ? extractSessionToken(request) : null;
  if (bearerToken) {
    return resolveSmartLocatorUserFromSession(bearerToken);
  }

  const store = await cookies();
  const cookieToken = store.get(SMART_LOCATOR_SESSION_COOKIE)?.value;
  return resolveSmartLocatorUserFromSession(cookieToken || null);
}

export async function createSmartLocatorSession(accessTokenRow) {
  const admin = createAdminClient();
  const sessionToken = randomUUID().replace(/-/g, "");
  const startedAt = new Date().toISOString();

  const { data, error } = await admin
    .from("smart_locator_access_tokens")
    .update({
      session: sessionToken,
      session_started_at: startedAt,
      updated_at: startedAt,
    })
    .eq("id", accessTokenRow.id)
    .eq("is_active", true)
    .select(TOKEN_FIELDS)
    .single();

  if (error || !data) {
    throw new Error("Could not start Smart Locator session.");
  }

  return {
    sessionToken,
    user: userFromSmartLocatorToken(data),
  };
}

export async function clearSmartLocatorSession(sessionToken) {
  if (!sessionToken) return;

  const admin = createAdminClient();
  await admin
    .from("smart_locator_access_tokens")
    .update({
      session: null,
      session_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("session", sessionToken);
}
