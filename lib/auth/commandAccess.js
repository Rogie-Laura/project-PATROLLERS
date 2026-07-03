import { canDispatch, isSystemAdministrator, normalizeRole } from "@/lib/auth/roles";

export const COMMAND_BILLING_UNAVAILABLE_CODE = "COMMAND_BILLING_UNAVAILABLE";

export const COMMAND_BILLING_UNAVAILABLE_MESSAGE =
  "This monitoring page is temporarily unavailable due to insufficient on-demand billing capacity. Please contact the Regional System Administrator to restore access.";

/** RCC, PCC, and SCC — not System Administrator. */
export function isOperationalCommandRole(role) {
  return canDispatch(normalizeRole(role));
}

export function isCommandAccessSuspended(suspended) {
  return suspended === true;
}

/**
 * Returns a block object when RCC/PCC/SCC should not use the monitoring center,
 * or null when access is allowed.
 */
export function commandBillingAccessBlock(user, suspended) {
  if (!user || !isCommandAccessSuspended(suspended)) return null;
  if (isSystemAdministrator(user.role)) return null;
  if (!isOperationalCommandRole(user.role)) return null;

  return {
    code: COMMAND_BILLING_UNAVAILABLE_CODE,
    message: COMMAND_BILLING_UNAVAILABLE_MESSAGE,
  };
}
