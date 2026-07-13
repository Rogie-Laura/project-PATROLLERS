import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCommandCenterRole } from "@/lib/auth/roles";
import { canAccessSmartLocator } from "@/lib/smartLocator/scope";
import { getSmartLocatorUser } from "@/lib/smartLocator/accessTokenAuth";

/**
 * Smart Locator auth: access-token session OR command-center username login.
 */
export async function authorizeSmartLocator(request) {
  const tokenUser = await getSmartLocatorUser(request);
  if (tokenUser && canAccessSmartLocator(tokenUser)) {
    return { user: tokenUser, error: null };
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  if (!isCommandCenterRole(user.role) || !canAccessSmartLocator(user)) {
    return {
      user,
      error: NextResponse.json(
        { error: "Forbidden — Smart Locator access required." },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
