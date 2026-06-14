import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageAccessTokens } from "@/lib/auth/roles";

function generateAccessToken() {
  const suffix = randomBytes(8).toString("hex").toUpperCase();
  return `PATROLLERS-${suffix}`;
}

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

async function loadTokenRows(admin) {
  const { data: tokens, error } = await admin
    .from("access_tokens")
    .select("id, token, label, is_active, created_at, created_by")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const tokenIds = (tokens ?? []).map((row) => row.id);
  const creatorIds = [
    ...new Set((tokens ?? []).map((row) => row.created_by).filter(Boolean)),
  ];

  const [{ data: profiles }, { data: creators }] = await Promise.all([
    tokenIds.length
      ? admin
          .from("mobile_device_profiles")
          .select(
            "access_token_id, mobile_plate, mobile_phone, radio_call_sign, office, unit, updated_at"
          )
          .in("access_token_id", tokenIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? admin
          .from("user")
          .select("id, email, full_name, rank_fullname")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileByToken = new Map(
    (profiles ?? []).map((profile) => [profile.access_token_id, profile])
  );
  const creatorById = new Map((creators ?? []).map((creator) => [creator.id, creator]));

  return (tokens ?? []).map((token) =>
    mapTokenRow(
      token,
      profileByToken.get(token.id) ?? null,
      token.created_by ? creatorById.get(token.created_by) ?? null : null
    )
  );
}

export async function GET(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  try {
    const admin = createAdminClient();
    const tokens = await loadTokenRows(admin);
    return NextResponse.json({ ok: true, tokens });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const label = String(body?.label ?? "").trim() || "Mobile Patrol Device";
  const token = generateAccessToken();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("access_tokens")
    .insert({
      token,
      label,
      created_by: user.id,
      is_active: true,
    })
    .select("id, token, label, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminClient = createAdminClient();
  const [row] = await loadTokenRows(adminClient).then((rows) =>
    rows.filter((entry) => entry.id === data.id)
  );

  return NextResponse.json({ ok: true, token: row ?? data });
}
