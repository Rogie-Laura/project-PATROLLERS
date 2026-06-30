import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAccessTokens } from "@/lib/auth/roles";
import {
  DEFAULT_CONFLICT_LOOKBACK_DAYS,
  DEFAULT_MIN_CONFLICT_MINUTES,
  parseConflictReport,
} from "@/lib/admin/tokenConflicts";

export const dynamic = "force-dynamic";

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageAccessTokens(user.role)) {
    return NextResponse.json(
      { error: "Only system administrators can view token conflict reports." },
      { status: 403 }
    );
  }

  return null;
}

function parsePositiveInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const lookbackDays = parsePositiveInt(
    searchParams.get("days"),
    DEFAULT_CONFLICT_LOOKBACK_DAYS,
    1,
    30
  );
  const minConflictMinutes = parsePositiveInt(
    searchParams.get("min_minutes"),
    DEFAULT_MIN_CONFLICT_MINUTES,
    1,
    120
  );

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_token_conflict_report", {
      p_days: lookbackDays,
      p_min_conflict_minutes: minConflictMinutes,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const report = parseConflictReport(data, {
      lookbackDays,
      minConflictMinutes,
    });

    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not load token conflict report." },
      { status: 500 }
    );
  }
}
