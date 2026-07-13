import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  educationalInstitutionFromRow,
  normalizeEducationalInstitutionType,
  normalizePersonnelList,
} from "@/lib/smartLocator/educationalInstitutions";
import { filterPointsForUser, scopeFromUser } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, principal_supervisor, contact_number, address_location, estimated_students, is_polling_center, number_of_voters, personnel, latitude, longitude, created_by, created_at, updated_at";

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

function parsePollingFields(body) {
  const isPollingCenter = Boolean(
    body?.isPollingCenter ?? body?.is_polling_center
  );

  if (!isPollingCenter) {
    return {
      isPollingCenter: false,
      numberOfVoters: "",
      personnel: [],
    };
  }

  const numberOfVoters = String(
    body?.numberOfVoters ?? body?.number_of_voters ?? ""
  ).trim();
  if (!numberOfVoters) {
    return { error: "Number of Voters is required for polling centers." };
  }

  const personnel = normalizePersonnelList(body?.personnel);
  if (personnel.length === 0) {
    return { error: "Add at least one deployed personnel." };
  }
  const incomplete = personnel.find(
    (row) => !row.rankName || !row.contactNumber
  );
  if (incomplete) {
    return {
      error: "Each personnel entry needs Rank/Name and Contact Number.",
    };
  }

  return { isPollingCenter: true, numberOfVoters, personnel };
}

export async function GET(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("educational_institutions")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json(
      { error: "Could not load Educational Institution markers." },
      { status: 500 }
    );
  }

  const markers = filterPointsForUser(user, data ?? []).map(
    educationalInstitutionFromRow
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

  const typeMeta = normalizeEducationalInstitutionType(
    body?.typeKey ?? body?.type_key
  );
  if (!typeMeta) {
    return NextResponse.json(
      { error: "Invalid Educational Institution type." },
      { status: 400 }
    );
  }

  const coords = parseCoordinates(body);
  if (coords.error) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const principalSupervisor = String(
    body?.principalSupervisor ?? body?.principal_supervisor ?? ""
  ).trim();
  if (!principalSupervisor) {
    return NextResponse.json(
      { error: "Principal/School Supervisor is required." },
      { status: 400 }
    );
  }

  const contactNumber = String(
    body?.contactNumber ?? body?.contact_number ?? ""
  ).trim();
  if (!contactNumber) {
    return NextResponse.json(
      { error: "Contact Number is required." },
      { status: 400 }
    );
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

  const estimatedStudents = String(
    body?.estimatedStudents ?? body?.estimated_students ?? ""
  ).trim();
  if (!estimatedStudents) {
    return NextResponse.json(
      { error: "Estimated Number of Students is required." },
      { status: 400 }
    );
  }

  const polling = parsePollingFields(body);
  if (polling.error) {
    return NextResponse.json({ error: polling.error }, { status: 400 });
  }

  const scope = scopeFromUser(user);
  const createdBy =
    user?.accessMode === "token" || !user?.id ? null : user.id;

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("educational_institutions")
    .insert({
      type: typeMeta.typeLabel,
      type_key: typeMeta.key,
      unit: scope.unit,
      office: scope.office,
      principal_supervisor: principalSupervisor,
      contact_number: contactNumber,
      address_location: addressLocation,
      estimated_students: estimatedStudents,
      is_polling_center: polling.isPollingCenter,
      number_of_voters: polling.numberOfVoters,
      personnel: polling.personnel,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_by: createdBy,
    })
    .select(SELECT_FIELDS)
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: "Could not save Educational Institution marker." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    marker: educationalInstitutionFromRow(data),
  });
}
