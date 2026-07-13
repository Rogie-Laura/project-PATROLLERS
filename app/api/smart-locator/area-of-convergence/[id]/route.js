import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  areaOfConvergenceFromRow,
  normalizeAreaOfConvergenceType,
  normalizePersonnelList,
} from "@/lib/smartLocator/areaOfConvergence";
import { canManagePoint } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, address_location, estimated_crowd, personnel, latitude, longitude, created_by, created_at, updated_at";

async function loadMarker(admin, id) {
  const { data, error } = await admin
    .from("area_of_convergence")
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
      const typeMeta = normalizeAreaOfConvergenceType(
        body?.typeKey ?? body?.type_key
      );
      if (!typeMeta) {
        return NextResponse.json(
          { error: "Invalid Area of Convergence type." },
          { status: 400 }
        );
      }
      update.type = typeMeta.typeLabel;
      update.type_key = typeMeta.key;
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

    if (body?.estimatedCrowd != null || body?.estimated_crowd != null) {
      const estimatedCrowd = String(
        body?.estimatedCrowd ?? body?.estimated_crowd ?? ""
      ).trim();
      if (!estimatedCrowd) {
        return NextResponse.json(
          { error: "Estimated Crowd is required." },
          { status: 400 }
        );
      }
      update.estimated_crowd = estimatedCrowd;
    }

    if (body?.personnel != null) {
      const personnelParsed = parsePersonnel(body.personnel);
      if (personnelParsed.error) {
        return NextResponse.json(
          { error: personnelParsed.error },
          { status: 400 }
        );
      }
      update.personnel = personnelParsed.personnel;
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
      .from("area_of_convergence")
      .update(update)
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      ok: true,
      marker: areaOfConvergenceFromRow(data),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update Area of Convergence marker." },
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
      .from("area_of_convergence")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete Area of Convergence marker." },
      { status: 500 }
    );
  }
}
