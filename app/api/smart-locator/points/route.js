import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSmartLocatorSelection } from "@/lib/smartLocator/categories";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";
import { pointFromRow } from "@/lib/smartLocator/points";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";

const SELECT_FIELDS =
  "id, category, subcategory, label, description, latitude, longitude, office, unit, created_by, created_at, updated_at";

function parseCoordinates(body) {
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Invalid latitude." };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Invalid longitude." };
  }
  return { latitude, longitude };
}

export async function GET(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("smart_locator_points")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Could not load map points." },
      { status: 500 }
    );
  }

  const points = filterPointsForUser(user, data ?? []).map(pointFromRow);

  return NextResponse.json({ ok: true, points });
}

export async function POST(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const selection = normalizeSmartLocatorSelection(body?.category, body?.subcategory);
  if (!selection) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const coords = parseCoordinates(body);
  if (coords.error) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const label = String(body?.label ?? "").trim();
  if (!label) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }

  const description = String(body?.description ?? "").trim();
  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("smart_locator_points")
    .insert({
      category: selection.category,
      subcategory: selection.subcategory,
      label,
      description: description || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      office: scope.office,
      unit: scope.unit,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save map point." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, point: pointFromRow(data) });
}
