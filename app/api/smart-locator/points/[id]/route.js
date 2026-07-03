import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCommandCenterRole } from "@/lib/auth/roles";
import { normalizeSmartLocatorSelection } from "@/lib/smartLocator/categories";
import { canManagePoint } from "@/lib/smartLocator/scope";
import { pointFromRow } from "@/lib/smartLocator/points";

const SELECT_FIELDS =
  "id, category, subcategory, label, description, latitude, longitude, office, unit, created_by, created_at, updated_at";

async function authorizeSmartLocator(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  if (!isCommandCenterRole(user.role)) {
    return {
      user,
      error: NextResponse.json(
        { error: "Forbidden — command center access required." },
        { status: 403 }
      ),
    };
  }
  return { user, error: null };
}

async function loadPoint(admin, id) {
  const { data, error } = await admin
    .from("smart_locator_points")
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

export async function PATCH(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing point id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadPoint(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Point not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const update = { updated_at: new Date().toISOString() };

    if (body?.category != null || body?.subcategory != null) {
      const selection = normalizeSmartLocatorSelection(
        body?.category ?? existing.category,
        body?.subcategory ?? existing.subcategory
      );
      if (!selection) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }
      update.category = selection.category;
      update.subcategory = selection.subcategory;
    }

    if (body?.label != null) {
      const label = String(body.label).trim();
      if (!label) {
        return NextResponse.json({ error: "Label is required." }, { status: 400 });
      }
      update.label = label;
    }

    if (body?.description != null) {
      const description = String(body.description).trim();
      update.description = description || null;
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
      .from("smart_locator_points")
      .update(update)
      .eq("id", id)
      .select(SELECT_FIELDS)
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true, point: pointFromRow(data) });
  } catch {
    return NextResponse.json(
      { error: "Could not update map point." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing point id." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const existing = await loadPoint(admin, id);
    if (!existing) {
      return NextResponse.json({ error: "Point not found." }, { status: 404 });
    }
    if (!canManagePoint(user, existing)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: dbError } = await admin
      .from("smart_locator_points")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete map point." },
      { status: 500 }
    );
  }
}
