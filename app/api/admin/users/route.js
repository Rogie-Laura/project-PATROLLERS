import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canManageUsers,
  isMonitoringRole,
  normalizeRole,
  roleLabel,
} from "@/lib/auth/roles";
import { hashPassword } from "@/lib/auth/password";
import {
  isKnownOffice,
  isKnownUnitForOffice,
} from "@/lib/offices";

const LIST_ROLES = ["RCC", "PCC", "SCC", "System Administrator"];

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageUsers(user.role)) {
    return NextResponse.json(
      { error: "Only system administrators can manage monitoring accounts." },
      { status: 403 }
    );
  }
  return null;
}

function mapUserRow(row) {
  const role = normalizeRole(row.role);
  return {
    id: row.id,
    rank: row.rank ?? "",
    full_name: row.full_name ?? "",
    rank_fullname: row.rank_fullname ?? "",
    badge_number: row.badge_number ?? "",
    email: row.email ?? "",
    role,
    role_label: roleLabel(role),
    office: row.office ?? "",
    unit: row.unit ?? "",
    created_at: row.created_at,
  };
}

/** Reject if office/unit are missing or not in the PRO4A list. */
function validateScope(role, office, unit) {
  const normalized = normalizeRole(role);
  if (normalized === "PCC") {
    if (!office) {
      return "Provincial Command Center (PCC) accounts need an Office.";
    }
    if (!isKnownOffice(office)) {
      return "Select a valid office from the list.";
    }
  }
  if (normalized === "SCC") {
    if (!office || !unit) {
      return "Station (SCC) accounts need both an Office and a Unit.";
    }
    if (!isKnownOffice(office)) {
      return "Select a valid office from the list.";
    }
    if (!isKnownUnitForOffice(office, unit)) {
      return "Select a valid unit for the chosen office.";
    }
  }
  return null;
}

export async function GET(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user")
    .select(
      "id, rank, full_name, rank_fullname, badge_number, email, role, office, unit, created_at"
    )
    .in("role", LIST_ROLES)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    users: (data ?? []).map(mapUserRow),
  });
}

export async function POST(request) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = normalizeRole(String(body?.role ?? "").trim());
  const office = String(body?.office ?? "").trim() || null;
  const unit = String(body?.unit ?? "").trim() || null;
  const rank = String(body?.rank ?? "").trim() || null;
  const fullName = String(body?.full_name ?? "").trim() || null;
  const badgeNumber = String(body?.badge_number ?? "").trim() || null;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }
  if (!isMonitoringRole(role)) {
    return NextResponse.json(
      { error: "Role must be one of RCC, PCC, or SCC." },
      { status: 400 }
    );
  }

  const scopeError = validateScope(role, office, unit);
  if (scopeError) {
    return NextResponse.json({ error: scopeError }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user")
    .insert({
      email,
      password: hashPassword(password),
      role,
      office,
      unit,
      rank,
      full_name: fullName,
      badge_number: badgeNumber,
    })
    .select(
      "id, rank, full_name, rank_fullname, badge_number, email, role, office, unit, created_at"
    )
    .single();

  if (error) {
    const message = /duplicate|unique/i.test(error.message)
      ? "An account with that email or badge number already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user: mapUserRow(data) });
}
