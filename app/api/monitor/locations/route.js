import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Latest GPS row per patrol unit — scales to thousands of devices (not limit 500). */
export async function GET(request) {
  const { error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_monitor_patrol_snapshot");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const locations = Array.isArray(data) ? data : [];

  return NextResponse.json({
    ok: true,
    locations,
    count: locations.length,
  });
}
