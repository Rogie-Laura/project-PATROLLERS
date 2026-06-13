import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countPatrolUnitsByType, PATROL_UNIT_TYPES } from "@/lib/patrolUnitTypes";

export const dynamic = "force-dynamic";

function verifyCommandApiKey(request) {
  const expected = process.env.PATROLLERS_COMMAND_API_KEY?.trim();
  if (!expected) return true;

  const header =
    request.headers.get("x-patrollers-api-key")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  return header === expected;
}

/** Active patrol unit counts for PRO4A COMMAND (Police Intervention). */
export async function GET(request) {
  if (!verifyCommandApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_monitor_patrol_snapshot");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const locations = Array.isArray(data)
    ? data
    : typeof data === "string"
      ? JSON.parse(data)
      : [];

  const active = locations.filter((loc) => loc?.tracking_active !== false);
  const counts = countPatrolUnitsByType(active);
  const total = PATROL_UNIT_TYPES.reduce(
    (sum, type) => sum + (counts[type.id] ?? 0),
    0
  );

  return NextResponse.json({
    ok: true,
    counts,
    total,
    types: PATROL_UNIT_TYPES.map((type) => ({
      id: type.id,
      label: type.dashboardLabel ?? type.label,
    })),
    updated_at: new Date().toISOString(),
  });
}
