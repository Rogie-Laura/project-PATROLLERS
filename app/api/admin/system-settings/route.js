import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/mobile/adminRoles";
import {
  formatIntervalLabel,
  getLocationIntervalSeconds,
  MAX_LOCATION_INTERVAL_SECONDS,
  MIN_LOCATION_INTERVAL_SECONDS,
  parseIntervalInput,
  updateLocationIntervalSeconds,
} from "@/lib/mobile/systemSettings";

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

function settingsPayload(seconds) {
  const clamped = Math.round(seconds);
  return {
    location_interval_seconds: clamped,
    location_interval_minutes: Math.max(1, Math.ceil(clamped / 60)),
    interval_label: formatIntervalLabel(clamped),
    min_seconds: MIN_LOCATION_INTERVAL_SECONDS,
    max_seconds: MAX_LOCATION_INTERVAL_SECONDS,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const seconds = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    settings: settingsPayload(seconds),
  });
}

export async function PATCH(request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let seconds;

  if (body?.location_interval_seconds != null) {
    const direct = parseIntervalInput(body.location_interval_seconds, "seconds");
    if (direct.error) {
      return NextResponse.json({ error: direct.error }, { status: 400 });
    }
    seconds = direct.seconds;
  } else {
    const unit = body?.unit === "minutes" ? "minutes" : "seconds";
    const parsed = parseIntervalInput(body?.value, unit);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    seconds = parsed.seconds;
  }

  try {
    await updateLocationIntervalSeconds(seconds, user.id);
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not save settings." },
      { status: 500 }
    );
  }

  const saved = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    settings: settingsPayload(saved),
  });
}
