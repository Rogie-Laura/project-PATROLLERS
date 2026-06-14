export const SESSION_ACTIVE_CODE = "SESSION_ACTIVE";

export const SESSION_ACTIVE_MESSAGE =
  "Your account is currently logged in on another device. Please sign out on that device before signing in here.";

export const SESSION_ENDED_MESSAGE =
  "Your session has ended. Please sign in again.";

export function isSessionExpired(sessionStartedAt, maxAgeSeconds) {
  if (!sessionStartedAt) return false;

  const startedMs = new Date(sessionStartedAt).getTime();
  if (Number.isNaN(startedMs)) return false;

  return Date.now() - startedMs > maxAgeSeconds * 1000;
}

export function evaluateSessionLogin(user, requestSessionToken, maxAgeSeconds) {
  const activeSession = String(user?.session ?? "").trim();
  if (!activeSession) {
    return { allowed: true };
  }

  if (requestSessionToken && requestSessionToken === activeSession) {
    return { allowed: true, sameDevice: true };
  }

  // Legacy rows may have session set before session_started_at existed.
  // Treat that as an active session — do not allow a second device in.
  if (!user.session_started_at) {
    return { allowed: false, code: SESSION_ACTIVE_CODE };
  }

  if (isSessionExpired(user.session_started_at, maxAgeSeconds)) {
    return { allowed: true, expired: true };
  }

  return { allowed: false, code: SESSION_ACTIVE_CODE };
}
