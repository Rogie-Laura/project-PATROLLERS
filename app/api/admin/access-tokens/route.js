import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/mobile/accessToken";

function generateAccessToken() {
  const suffix = randomBytes(8).toString("hex").toUpperCase();
  return `PATROLLERS-${suffix}`;
}

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json(
      { error: "Only system administrators can manage access tokens." },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("access_tokens")
    .select("id, token, label, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tokens: data ?? [] });
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

  return NextResponse.json({ ok: true, token: data });
}
