import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { callResponseFromRow, callResponsesFromRows } from "@/lib/callResponses";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function requireUser(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(request) {
  const user = await getCurrentUser(request);
  const denied = requireUser(user);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") === "closed" ? "closed" : "active";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("call_responses")
    .select("*")
    .eq("status", status)
    .order(status === "closed" ? "closed_at" : "created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    callResponses: callResponsesFromRows(data),
  });
}

export async function POST(request) {
  const user = await getCurrentUser(request);
  const denied = requireUser(user);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const label = String(body?.label ?? body?.displayName ?? "").trim();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required." },
      { status: 400 }
    );
  }

  if (!label) {
    return NextResponse.json({ error: "Location label is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("call_responses")
    .insert({
      latitude,
      longitude,
      label,
      status: "active",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    callResponse: callResponseFromRow(data),
  });
}
