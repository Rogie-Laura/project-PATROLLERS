import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import { fetchLatestEstablishmentMapPoints } from "@/lib/establishments/commandEstablishments";
import { isCommandSupabaseConfigured } from "@/lib/supabase/commandAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Latest PRO4A COMMAND establishments for map overlay plotting. */
export async function GET(request) {
  const { error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  if (!isCommandSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "COMMAND Supabase is not configured. Set COMMAND_SUPABASE_URL and COMMAND_SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const { batch, establishments } = await fetchLatestEstablishmentMapPoints();

    return NextResponse.json({
      ok: true,
      count: establishments.length,
      batch,
      establishments,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load establishments.",
      },
      { status: 500 },
    );
  }
}
