import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  areaOfConvergenceFromRow,
  normalizeAreaOfConvergenceType,
  normalizePersonnelList,
} from "@/lib/smartLocator/areaOfConvergence";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, address_location, estimated_crowd, personnel, latitude, longitude, created_by, created_at, updated_at";

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

function parsePersonnel(raw) {
  const personnel = normalizePersonnelList(raw);
  if (personnel.length === 0) {
    return { error: "Add at least one deployed personnel." };
  }
  const incomplete = personnel.find(
    (row) => !row.rankName || !row.contactNumber
  );
  if (incomplete) {
    return {
      error:
        "Each personnel entry needs Rank/Name and Contact Number.",
    };
  }
  return { personnel };
}

export async function GET(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("area_of_convergence")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Could not load Area of Convergence markers." },
      { status: 500 }
    );
  }

  const markers = filterPointsForUser(user, data ?? []).map(
    areaOfConvergenceFromRow
  );
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

  const typeMeta = normalizeAreaOfConvergenceType(
    body?.typeKey ?? body?.type_key
  );
  if (!typeMeta) {
    return NextResponse.json(
      { error: "Invalid Area of Convergence type." },
      { status: 400 }
    );
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

  const estimatedCrowd = String(
    body?.estimatedCrowd ?? body?.estimated_crowd ?? ""
  ).trim();
  if (!estimatedCrowd) {
    return NextResponse.json(
      { error: "Estimated Crowd is required." },
      { status: 400 }
    );
  }

  const personnelParsed = parsePersonnel(body?.personnel);
  if (personnelParsed.error) {
    return NextResponse.json({ error: personnelParsed.error }, { status: 400 });
  }

  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("area_of_convergence")
    .insert({
      type: typeMeta.typeLabel,
      type_key: typeMeta.key,
      unit: scope.unit,
      office: scope.office,
      address_location: addressLocation,
      estimated_crowd: estimatedCrowd,
      personnel: personnelParsed.personnel,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save Area of Convergence marker." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    marker: areaOfConvergenceFromRow(data),
  });
}
