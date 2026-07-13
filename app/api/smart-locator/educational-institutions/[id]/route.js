import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  educationalInstitutionFromRow,
  normalizeEducationalInstitutionType,
  normalizePersonnelList,
} from "@/lib/smartLocator/educationalInstitutions";
import { canManagePoint } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, principal_supervisor, contact_number, address_location, estimated_students, is_polling_center, number_of_voters, personnel, latitude, longitude, created_by, created_at, updated_at";

async function loadMarker(admin, id) {
  const { data, error } = await admin
    .from("educational_institutions")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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

function parsePollingFields(body, existing) {
  const hasPollingFlag =
    body?.isPollingCenter != null || body?.is_polling_center != null;
  const isPollingCenter = hasPollingFlag
    ? Boolean(body?.isPollingCenter ?? body?.is_polling_center)
    : Boolean(existing?.is_polling_center);

  if (!isPollingCenter) {
    return {
      isPollingCenter: false,
      numberOfVoters: "",
      personnel: [],
    };
  }

  const numberOfVoters = String(
    body?.numberOfVoters ??
      body?.number_of_voters ??
      existing?.number_of_voters ??
      ""
  ).trim();
  if (!numberOfVoters) {
    return { error: "Number of Voters is required for polling centers." };
  }

  const personnelSource =
    body?.personnel != null ? body.personnel : existing?.personnel;
  const personnel = normalizePersonnelList(personnelSource);
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

export async function PATCH(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing marker id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadMarker(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Marker not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const update = { updated_at: new Date().toISOString() };

    if (body?.typeKey != null || body?.type_key != null) {
      const typeMeta = normalizeEducationalInstitutionType(
        body?.typeKey ?? body?.type_key
      );
      if (!typeMeta) {
        return NextResponse.json(
          { error: "Invalid Educational Institution type." },
          { status: 400 }
        );
      }
      update.type = typeMeta.typeLabel;
      update.type_key = typeMeta.key;
    }

    if (
      body?.principalSupervisor != null ||
      body?.principal_supervisor != null
    ) {
      const principalSupervisor = String(
        body?.principalSupervisor ?? body?.principal_supervisor ?? ""
      ).trim();
      if (!principalSupervisor) {
        return NextResponse.json(
          { error: "Principal/School Supervisor is required." },
          { status: 400 }
        );
      }
      update.principal_supervisor = principalSupervisor;
    }

    if (body?.contactNumber != null || body?.contact_number != null) {
      const contactNumber = String(
        body?.contactNumber ?? body?.contact_number ?? ""
      ).trim();
      if (!contactNumber) {
        return NextResponse.json(
          { error: "Contact Number is required." },
          { status: 400 }
        );
      }
      update.contact_number = contactNumber;
    }

    if (body?.addressLocation != null || body?.address_location != null) {
      const addressLocation = String(
        body?.addressLocation ?? body?.address_location ?? ""
      ).trim();
      if (!addressLocation) {
        return NextResponse.json(
          { error: "Address/Location is required." },
          { status: 400 }
        );
      }
      update.address_location = addressLocation;
    }

    if (body?.estimatedStudents != null || body?.estimated_students != null) {
      const estimatedStudents = String(
        body?.estimatedStudents ?? body?.estimated_students ?? ""
      ).trim();
      if (!estimatedStudents) {
        return NextResponse.json(
          { error: "Estimated Number of Students is required." },
          { status: 400 }
        );
      }
      update.estimated_students = estimatedStudents;
    }

    if (
      body?.isPollingCenter != null ||
      body?.is_polling_center != null ||
      body?.numberOfVoters != null ||
      body?.number_of_voters != null ||
      body?.personnel != null
    ) {
      const polling = parsePollingFields(body, existing);
      if (polling.error) {
        return NextResponse.json({ error: polling.error }, { status: 400 });
      }
      update.is_polling_center = polling.isPollingCenter;
      update.number_of_voters = polling.numberOfVoters;
      update.personnel = polling.personnel;
    }

    if (body?.latitude != null || body?.longitude != null) {
      const coords = parseCoordinates({
        latitude: body?.latitude ?? existing.latitude,
        longitude: body?.longitude ?? existing.longitude,
      });
      if (coords.error) {
        return NextResponse.json({ error: coords.error }, { status: 400 });
      }
      update.latitude = coords.latitude;
      update.longitude = coords.longitude;
    }

    const { data, error: dbError } = await admin
      .from("educational_institutions")
      .update(update)
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      ok: true,
      marker: educationalInstitutionFromRow(data),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update Educational Institution marker." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing marker id." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadMarker(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Marker not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: dbError } = await admin
      .from("educational_institutions")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete Educational Institution marker." },
      { status: 500 }
    );
  }
}
