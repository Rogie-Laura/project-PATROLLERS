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

const USER_SELECT =
  "id, rank, full_name, rank_fullname, badge_number, email, role, office, unit, created_at, is_active, subscription_expires_at";

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
    is_active: row.is_active !== false,
    subscription_expires_at: row.subscription_expires_at ?? null,
  };
}

/** Normalize a subscription expiry input to an ISO string or null. */
function parseExpiry(input) {
  if (input === undefined || input === null || String(input).trim() === "") {
    return { value: null };
  }
  const ms = new Date(input).getTime();
  if (Number.isNaN(ms)) {
    return { error: "Subscription expiry must be a valid date." };
  }
  return { value: new Date(ms).toISOString() };
}

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

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("user")
    .select("id, role, office, unit")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (!isMonitoringRole(existing.role)) {
    return NextResponse.json(
      { error: "Only RCC, PCC, and SCC accounts can be edited here." },
      { status: 403 }
    );
  }

  const update = {};

  if (Object.prototype.hasOwnProperty.call(body, "role")) {
    const role = normalizeRole(String(body.role ?? "").trim());
    if (!isMonitoringRole(role)) {
      return NextResponse.json(
        { error: "Role must be one of RCC, PCC, or SCC." },
        { status: 400 }
      );
    }
    update.role = role;
  }
  if (Object.prototype.hasOwnProperty.call(body, "office")) {
    update.office = String(body.office ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "unit")) {
    update.unit = String(body.unit ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "rank")) {
    update.rank = String(body.rank ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
    update.full_name = String(body.full_name ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "badge_number")) {
    update.badge_number = String(body.badge_number ?? "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    update.is_active = body.is_active === true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "subscription_expires_at")) {
    const expiry = parseExpiry(body.subscription_expires_at);
    if (expiry.error) {
      return NextResponse.json({ error: expiry.error }, { status: 400 });
    }
    update.subscription_expires_at = expiry.value;
  }
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    }
    update.email = email;
  }
  if (body?.password) {
    const password = String(body.password);
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    update.password = hashPassword(password);
    // Force re-login everywhere after a password reset.
    update.session = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const nextRole = update.role ?? existing.role;
  const nextOffice =
    update.office !== undefined ? update.office : existing.office;
  const nextUnit = update.unit !== undefined ? update.unit : existing.unit;
  const scopeError = validateScope(nextRole, nextOffice, nextUnit);
  if (scopeError) {
    return NextResponse.json({ error: scopeError }, { status: 400 });
  }

  const { data, error } = await admin
    .from("user")
    .update(update)
    .eq("id", id)
    .select(USER_SELECT)
    .maybeSingle();

  if (error) {
    const message = /duplicate|unique/i.test(error.message)
      ? "An account with that email or badge number already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user: mapUserRow(data) });
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const denied = requireAdmin(user);
  if (denied) return denied;

  const { id } = await params;

  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("user")
    .select("id, role, email, rank_fullname")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (!isMonitoringRole(existing.role)) {
    return NextResponse.json(
      { error: "Only RCC, PCC, and SCC accounts can be deleted here." },
      { status: 403 }
    );
  }

  const { error: deleteError } = await admin
    .from("user")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      id: existing.id,
      email: existing.email,
      name: existing.rank_fullname,
    },
  });
}
