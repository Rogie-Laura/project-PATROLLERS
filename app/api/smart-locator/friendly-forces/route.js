import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  friendlyForceFromRow,
  normalizeFriendlyForceType,
} from "@/lib/smartLocator/friendlyForces";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, commanding_officer, contact_number, address_location, latitude, longitude, created_by, created_at, updated_at";

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

function parseRequiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) return { error: `${label} is required.` };
  return { value: text };
}

export async function GET(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("friendly_forces")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Could not load friendly forces." },
      { status: 500 }
    );
  }

  const forces = filterPointsForUser(user, data ?? []).map(friendlyForceFromRow);

  return NextResponse.json({ ok: true, forces });
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

  const typeMeta = normalizeFriendlyForceType(body?.typeKey ?? body?.type_key);
  if (!typeMeta) {
    return NextResponse.json({ error: "Invalid friendly force type." }, { status: 400 });
  }

  const coords = parseCoordinates(body);
  if (coords.error) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const commandingOfficer = parseRequiredText(
    body?.commandingOfficer ?? body?.commanding_officer,
    "Name of Commanding Officer/Chief/Team Leader"
  );
  if (commandingOfficer.error) {
    return NextResponse.json({ error: commandingOfficer.error }, { status: 400 });
  }

  const contactNumber = parseRequiredText(
    body?.contactNumber ?? body?.contact_number,
    "Contact Number"
  );
  if (contactNumber.error) {
    return NextResponse.json({ error: contactNumber.error }, { status: 400 });
  }

  const addressLocation = parseRequiredText(
    body?.addressLocation ?? body?.address_location,
    "Address/Location"
  );
  if (addressLocation.error) {
    return NextResponse.json({ error: addressLocation.error }, { status: 400 });
  }

  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("friendly_forces")
    .insert({
      type: typeMeta.typeLabel,
      type_key: typeMeta.key,
      unit: scope.unit,
      office: scope.office,
      commanding_officer: commandingOfficer.value,
      contact_number: contactNumber.value,
      address_location: addressLocation.value,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save friendly force." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    force: friendlyForceFromRow(data),
  });
}
