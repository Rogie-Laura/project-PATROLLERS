import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { MOBILE_LOCATION_INTERVAL_MINUTES } from "@/lib/mobile/accessToken";
import { ADMIN_ROLES } from "@/lib/mobile/adminRoles";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    settings: {
      location_interval_minutes: MOBILE_LOCATION_INTERVAL_MINUTES,
    },
  });
}
