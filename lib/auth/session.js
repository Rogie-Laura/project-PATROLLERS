import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const SESSION_COOKIE = "patrol_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

const PUBLIC_USER_FIELDS =
  "id, rank, full_name, rank_fullname, badge_number, office, unit, role";

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

// Returns the logged-in user for the current request, or null.
// Single-device rule: a cookie token only resolves if it still matches the
// `session` value stored on the user row. Logging in elsewhere overwrites
// that value, so older devices stop resolving.
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user")
    .select(PUBLIC_USER_FIELDS)
    .eq("session", token)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
