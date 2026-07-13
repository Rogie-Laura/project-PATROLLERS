import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import { isoFromRow, normalizeIsoType } from "@/lib/smartLocator/iso";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, address_location, remarks, latitude, longitude, created_by, created_at, updated_at";

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
    .from("iso")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: "Could not load ISO markers." }, { status: 500 });
  }

  const markers = filterPointsForUser(user, data ?? []).map(isoFromRow);
  return NextResponse.json({ ok: true, markers });
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

  const typeMeta = normalizeIsoType(body?.typeKey ?? body?.type_key);
  if (!typeMeta) {
    return NextResponse.json({ error: "Invalid ISO type." }, { status: 400 });
  }

  const coords = parseCoordinates(body);
  if (coords.error) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const addressLocation = String(
    body?.addressLocation ?? body?.address_location ?? ""
  ).trim();
  if (!addressLocation) {
    return NextResponse.json(
      { error: "Address/Location is required." },
      { status: 400 }
    );
  }

  const remarks = String(body?.remarks ?? "").trim() || null;
  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("iso")
    .insert({
      type: typeMeta.typeLabel,
      type_key: typeMeta.key,
      unit: scope.unit,
      office: scope.office,
      address_location: addressLocation,
      remarks,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json({ error: "Could not save ISO marker." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, marker: isoFromRow(data) });
}
