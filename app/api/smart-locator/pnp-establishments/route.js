import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  normalizePnpEstablishmentType,
  pnpEstablishmentFromRow,
} from "@/lib/smartLocator/pnpEstablishments";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, station_toc, latitude, longitude, created_by, created_at, updated_at";

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
    .from("pnp_establishments")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Could not load PNP establishments." },
      { status: 500 }
    );
  }

  const establishments = filterPointsForUser(user, data ?? []).map(
    pnpEstablishmentFromRow
  );

  return NextResponse.json({ ok: true, establishments });
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

  const typeMeta = normalizePnpEstablishmentType(body?.typeKey ?? body?.type_key);
  if (!typeMeta) {
    return NextResponse.json({ error: "Invalid establishment type." }, { status: 400 });
  }

  const coords = parseCoordinates(body);
  if (coords.error) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const stationToc = String(body?.stationToc ?? body?.station_toc ?? "").trim();
  if (!stationToc) {
    return NextResponse.json({ error: "Station TOC is required." }, { status: 400 });
  }

  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("pnp_establishments")
    .insert({
      type: typeMeta.typeLabel,
      type_key: typeMeta.key,
      unit: scope.unit,
      office: scope.office,
      station_toc: stationToc,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save PNP establishment." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    establishment: pnpEstablishmentFromRow(data),
  });
}
