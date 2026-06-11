import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createLocationRequestBatch,
  normalizeLocationRequestMode,
} from "@/lib/mobile/locationRequests";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const accessTokenIds = Array.isArray(body?.access_token_ids)
    ? body.access_token_ids.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (accessTokenIds.length === 0) {
    return NextResponse.json(
      { error: "access_token_ids must be a non-empty array." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    const result = await createLocationRequestBatch(admin, {
      accessTokenIds,
      createdBy: user.id,
      label: body?.label ?? null,
      requestMode: normalizeLocationRequestMode(body?.request_mode),
    });

    return NextResponse.json({
      ok: true,
      batch: result.batch,
      itemCount: result.itemCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? "Could not request locations." },
      { status: 500 }
    );
  }
}
