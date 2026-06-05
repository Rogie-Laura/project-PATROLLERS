import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Latest GPS row per patrol unit — scales to thousands of devices (not limit 500). */
export async function GET(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_latest_patrol_locations");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    locations: Array.isArray(data) ? data : [],
    count: Array.isArray(data) ? data.length : 0,
  });
}
