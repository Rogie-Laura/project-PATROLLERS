import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  closeLocationRequestBatch,
  getLocationRequestBatch,
} from "@/lib/mobile/locationRequests";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

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

/** Close batch — remaining pending units are marked failed (no more mobile retries). */
export async function PATCH(request, { params }) {
  const { error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing batch id." }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = String(body?.action ?? "close").trim().toLowerCase();
  if (action !== "close") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const result = await closeLocationRequestBatch(admin, id);
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
      { error: err.message ?? "Could not close batch." },
      { status: 500 }
    );
  }
}
