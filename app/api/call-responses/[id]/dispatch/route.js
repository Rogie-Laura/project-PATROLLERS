import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import {
  canUseCommandFeature,
  COMMAND_FEATURE_KEYS,
} from "@/lib/auth/commandFeatureFlags";
import { callResponseFromRow } from "@/lib/callResponses";
import { DISPATCH_ROLE } from "@/lib/callResponseDispatches";
import {
  createSingleUnitDispatch,
  listCallResponseDispatches,
} from "@/lib/createCallResponseDispatches";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/mobile/systemSettings";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

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
  const { user, error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  const settings = await getSystemSettings();
  if (
    !canUseCommandFeature(
      user.role,
      COMMAND_FEATURE_KEYS.addCallResponse,
      settings.command_feature_flags
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Add Call Response is disabled for your command level. Contact the system administrator.",
      },
      { status: 403 }
    );
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing incident id." }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const accessTokenId = String(body?.access_token_id ?? "").trim();
  const role = body?.role === DISPATCH_ROLE.cordon ? DISPATCH_ROLE.cordon : DISPATCH_ROLE.primary;
  const distanceMeters = Number(body?.distance_meters);

  if (!accessTokenId) {
    return NextResponse.json(
      { error: "access_token_id is required." },
      { status: 400 }
    );
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

  try {
    const result = await createSingleUnitDispatch(
      admin,
      callResponseFromRow(callResponse),
      {
        accessTokenId,
        role,
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
      }
    );

    const dispatches = await listCallResponseDispatches(admin, id);

    return NextResponse.json({
      ...result,
      dispatches,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? "Could not alert mobile unit." },
      { status: 500 }
    );
  }
}
