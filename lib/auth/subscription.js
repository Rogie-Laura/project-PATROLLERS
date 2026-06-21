import { COMMAND_ROLES, normalizeRole } from "./roles";

export const ACCOUNT_DEACTIVATED_CODE = "ACCOUNT_DEACTIVATED";
export const SUBSCRIPTION_EXPIRED_CODE = "SUBSCRIPTION_EXPIRED";

export const ACCOUNT_DEACTIVATED_MESSAGE =
  "This account is deactivated. Please contact the Regional System Administrator.";
export const SUBSCRIPTION_EXPIRED_MESSAGE =
  "This account's subscription has expired. Please contact the Regional System Administrator to renew.";

/** True when an expiry date is set and already in the past. NULL = never expires. */
export function isSubscriptionExpired(expiresAt) {
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() > ms;
}

/**
 * Returns { code, message } when an account should be blocked from signing in,
 * or null when it may proceed. The System Administrator (region owner) is never
 * blocked by subscription rules so they can always manage the system.
 */
export function accountAccessBlock(user) {
  if (!user) return null;
  if (normalizeRole(user.role) === COMMAND_ROLES.SYSTEM_ADMIN) return null;

  if (user.is_active === false) {
    return {
      code: ACCOUNT_DEACTIVATED_CODE,
      message: ACCOUNT_DEACTIVATED_MESSAGE,
    };
  }

  if (isSubscriptionExpired(user.subscription_expires_at)) {
    return {
      code: SUBSCRIPTION_EXPIRED_CODE,
      message: SUBSCRIPTION_EXPIRED_MESSAGE,
    };
  }

  return null;
}

/** UI-friendly status: "active" | "inactive" | "expired" | "expiring". */
export function subscriptionStatus(user, soonDays = 7) {
  if (user?.is_active === false) return "inactive";
  if (isSubscriptionExpired(user?.subscription_expires_at)) return "expired";
  if (user?.subscription_expires_at) {
    const ms = new Date(user.subscription_expires_at).getTime();
    if (!Number.isNaN(ms)) {
      const days = (ms - Date.now()) / 86_400_000;
      if (days <= soonDays) return "expiring";
    }
  }
  return "active";
}
