import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSystemAdministrator } from "@/lib/auth/roles";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  normalizeSmartLocatorMarkerSizeSetting,
  serializeSmartLocatorMarkerSizeSetting,
} from "@/lib/smartLocator/markerSize";

const DEFAULT_SETTING = normalizeSmartLocatorMarkerSizeSetting({
  presetId: DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  customSizes: null,
});

async function readMarkerSizeSetting() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("smart_locator_marker_size")
    .eq("id", "default")
    .maybeSingle();

  if (error) throw error;
  return normalizeSmartLocatorMarkerSizeSetting(data?.smart_locator_marker_size);
}

/** Any Smart Locator account can read the system-wide marker size. */
export async function GET(request) {
  const { error } = await authorizeSmartLocator(request);
  if (error) return error;

  try {
    const setting = await readMarkerSizeSetting();
    return NextResponse.json({ ok: true, setting });
  } catch {
    return NextResponse.json({ ok: true, setting: DEFAULT_SETTING });
  }
}

/** Only System Administrator can change the system-wide marker size. */
export async function PUT(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  if (
    !isSystemAdministrator(user?.role) &&
    user?.smartLocatorRole !== "System Administrator"
  ) {
    return NextResponse.json(
      { error: "Only System Administrator can change marker size." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const setting = serializeSmartLocatorMarkerSizeSetting(
    body?.presetId ?? body?.setting?.presetId,
    body?.customSizes ?? body?.setting?.customSizes
  );

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("system_settings")
    .update({
      smart_locator_marker_size: setting,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default")
    .select("smart_locator_marker_size")
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save marker size setting." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    setting: normalizeSmartLocatorMarkerSizeSetting(data.smart_locator_marker_size),
  });
}
