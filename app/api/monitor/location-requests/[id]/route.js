import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocationRequestBatch } from "@/lib/mobile/locationRequests";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing batch id." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const result = await getLocationRequestBatch(admin, id);
    if (!result) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      batch: result.batch,
      items: result.items,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? "Could not load batch." },
      { status: 500 }
    );
  }
}
