import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import { callResponsesFromRows } from "@/lib/callResponses";
import { filterSubordinateForUser } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Read-only awareness feed for higher offices. Returns the active incidents
 * owned by SUBORDINATE command levels so RCC/PCC can see which stations have an
 * active response — without exposing the interactive dispatch panel.
 *   - RCC / System Administrator : every PCC/station incident
 *   - PCC                        : every station incident in its office
 *   - SCC / others               : none
 */
export async function GET(request) {
  const { user, error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("call_responses")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scoped = filterSubordinateForUser(user, data ?? []);

  return NextResponse.json({
    ok: true,
    incidents: callResponsesFromRows(scoped),
  });
}
