import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAccessTokens } from "@/lib/auth/roles";

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageAccessTokens(user.role)) {
    return NextResponse.json(
      { error: "Only system administrators can manage access tokens." },
      { status: 403 }
    );
  }

  return null;
}

function mapTokenRow(token, profile, creator) {
  return {
    id: token.id,
    token: token.token,
    label: token.label,
    is_active: token.is_active,
    created_at: token.created_at,
    created_by: creator
      ? {
          id: creator.id,
          name: creator.rank_fullname || creator.full_name || creator.email,
          email: creator.email,
        }
      : null,
    mobile_user: profile
      ? {
          mobile_plate: profile.mobile_plate,
          mobile_phone: profile.mobile_phone,
          radio_call_sign: profile.radio_call_sign,
          office: profile.office,
          unit: profile.unit,
          updated_at: profile.updated_at,
        }
      : null,
  };
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body?.is_active !== "boolean") {
    return NextResponse.json(
      { error: "Provide is_active: true or false." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("access_tokens")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("id, token, label, is_active, created_at, created_by")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Access token not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, token: data });
}
