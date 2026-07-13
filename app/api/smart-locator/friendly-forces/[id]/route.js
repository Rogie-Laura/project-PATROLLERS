import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";
import {
  friendlyForceFromRow,
  normalizeFriendlyForceType,
} from "@/lib/smartLocator/friendlyForces";
import { canManagePoint } from "@/lib/smartLocator/scope";

const SELECT_FIELDS =
  "id, type, type_key, unit, office, commanding_officer, contact_number, address_location, remarks, latitude, longitude, created_by, created_at, updated_at";

async function loadForce(admin, id) {
  const { data, error } = await admin
    .from("friendly_forces")
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

function parseRequiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) return { error: `${label} is required.` };
  return { value: text };
}

export async function PATCH(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing friendly force id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadForce(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Friendly force not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const update = { updated_at: new Date().toISOString() };

    if (body?.typeKey != null || body?.type_key != null) {
      const typeMeta = normalizeFriendlyForceType(body?.typeKey ?? body?.type_key);
      if (!typeMeta) {
        return NextResponse.json(
          { error: "Invalid friendly force type." },
          { status: 400 }
        );
      }
      update.type = typeMeta.typeLabel;
      update.type_key = typeMeta.key;
    }

    if (body?.commandingOfficer != null || body?.commanding_officer != null) {
      const parsed = parseRequiredText(
        body?.commandingOfficer ?? body?.commanding_officer,
        "Name of Commanding Officer/Chief/Team Leader"
      );
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      update.commanding_officer = parsed.value;
    }

    if (body?.contactNumber != null || body?.contact_number != null) {
      const parsed = parseRequiredText(
        body?.contactNumber ?? body?.contact_number,
        "Contact Number"
      );
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      update.contact_number = parsed.value;
    }

    if (body?.addressLocation != null || body?.address_location != null) {
      const parsed = parseRequiredText(
        body?.addressLocation ?? body?.address_location,
        "Address/Location"
      );
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      update.address_location = parsed.value;
    }

    if (body?.remarks != null) {
      const remarks = String(body.remarks).trim();
      update.remarks = remarks || null;
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
      .from("friendly_forces")
      .update(update)
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      ok: true,
      force: friendlyForceFromRow(data),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update friendly force." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing friendly force id." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadForce(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Friendly force not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: dbError } = await admin
      .from("friendly_forces")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete friendly force." },
      { status: 500 }
    );
  }
}
