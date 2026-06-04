import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { callResponseFromRow } from "@/lib/callResponses";
import {
  createCallResponseDispatches,
  listCallResponseDispatches,
} from "@/lib/createCallResponseDispatches";
import { maxEnabledRadiusMeters } from "@/lib/incidentRadiusRings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/mobile/systemSettings";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing incident id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const dispatches = await listCallResponseDispatches(admin, id).catch((err) => {
    return NextResponse.json({ error: err.message }, { status: 500 });
  });

  if (dispatches instanceof NextResponse) return dispatches;

  return NextResponse.json({ ok: true, dispatches });
}

export async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing incident id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: callResponse, error: fetchError } = await admin
    .from("call_responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!callResponse) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  if (callResponse.status !== "active") {
    return NextResponse.json({ error: "Incident is not active." }, { status: 409 });
  }

  const settings = await getSystemSettings();
  const maxRadiusM = maxEnabledRadiusMeters(settings.incident_radius_rings) ?? 6000;

  try {
    const result = await createCallResponseDispatches(
      admin,
      callResponseFromRow(callResponse),
      { maxRadiusM, replacePending: true }
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? "Could not alert mobile units." },
      { status: 500 }
    );
  }
}
