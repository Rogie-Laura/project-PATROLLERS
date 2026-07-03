import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { commandBillingAccessBlock } from "@/lib/auth/commandAccess";
import { isCommandCenterRole } from "@/lib/auth/roles";
import { getSystemSettings } from "@/lib/mobile/systemSettings";

/**
 * Resolves the current user and returns a 401 response when unauthenticated.
 * Use for endpoints that any signed-in account may call.
 *
 * @returns {Promise<{ user: object|null, error: NextResponse|null }>}
 */
export async function authorizeUser(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/**
 * Resolves the current user and enforces a command-center role (RCC/PCC/SCC or
 * System Administrator). Returns 401 when unauthenticated, 403 when the role is
 * not permitted. Use for monitor/dispatch endpoints that patrollers must not hit.
 *
 * @returns {Promise<{ user: object|null, error: NextResponse|null }>}
 */
export async function authorizeCommandCenter(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  if (!isCommandCenterRole(user.role)) {
    return {
      user,
      error: NextResponse.json(
        { error: "Forbidden — command center access required." },
        { status: 403 }
      ),
    };
  }

  const settings = await getSystemSettings();
  const billingBlock = commandBillingAccessBlock(
    user,
    settings.command_access_suspended
  );
  if (billingBlock) {
    return {
      user,
      error: NextResponse.json(
        { error: billingBlock.message, code: billingBlock.code },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
