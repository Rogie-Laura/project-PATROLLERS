import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRole } from "@/lib/auth/roles";
import { isSessionExpired } from "@/lib/auth/sessionPolicy";
import { accountAccessBlock } from "@/lib/auth/subscription";

export const SESSION_COOKIE = "patrol_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

const PUBLIC_USER_FIELDS =
  "id, email, rank, full_name, rank_fullname, badge_number, office, unit, role, is_active, subscription_expires_at";

export function buildSessionCookie(token) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function extractSessionToken(request) {
  const authHeader = request?.headers?.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  return null;
}

async function resolveUserFromToken(token) {
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user")
    .select(PUBLIC_USER_FIELDS)
    .eq("session", token)
    .maybeSingle();

  if (error || !data) return null;

  // Enforce server-side session expiry on every request, not just at login.
  if (isSessionExpired(data.session_started_at, SESSION_MAX_AGE)) {
    return null;
  }

  // Lock out accounts that were deactivated or whose subscription expired
  // mid-session (System Administrator is never blocked).
  if (accountAccessBlock(data)) {
    return null;
  }

  if (!data.session_started_at) {
    void admin
      .from("user")
      .update({ session_started_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("session_started_at", null);
  }

  return { ...data, role: normalizeRole(data.role) };
}

// Returns the logged-in user for the current request, or null.
// Web: session cookie. Mobile: Authorization: Bearer <token> from login.
// Single-device rule: only one active session per account. A new login on
// another device is rejected until the current device signs out (or the
// session expires after SESSION_MAX_AGE).
export async function getCurrentUser(request = null) {
  const bearerToken = request ? extractSessionToken(request) : null;
  if (bearerToken) {
    return resolveUserFromToken(bearerToken);
  }

  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  return resolveUserFromToken(cookieToken);
}

export async function resolveSessionTokenFromRequest(request) {
  const bearerToken = extractSessionToken(request);
  if (bearerToken) return bearerToken;

  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
