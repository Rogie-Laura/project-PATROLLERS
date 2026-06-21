import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import {
  normalizeClosureOutcome,
  getClosureOutcomeLabel,
} from "@/lib/callResponseOutcomes";
import { callResponseFromRow } from "@/lib/callResponses";
import {
  cancelAllActiveDispatches,
  cancelPendingDispatches,
  hasCompletedDispatch,
} from "@/lib/createCallResponseDispatches";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { user, error: authError } = await authorizeCommandCenter(request);
  if (authError) return authError;

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing incident id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body?.action ?? "").trim().toLowerCase();
  if (action !== "close" && action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("call_responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  if (existing.status === "closed") {
    return NextResponse.json({ error: "Incident is already closed." }, { status: 409 });
  }

  if (action === "cancel") {
    const closedAt = new Date().toISOString();
    const { data, error } = await admin
      .from("call_responses")
      .update({
        status: "closed",
        closure_outcome: "cancelled_by_command",
        closure_remarks: null,
        closed_at: closedAt,
        closed_by: user.id,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await cancelAllActiveDispatches(admin, id);
    } catch (cancelError) {
      console.error("cancel dispatch alerts failed:", cancelError);
    }

    return NextResponse.json({
      ok: true,
      callResponse: callResponseFromRow(data),
      closureSummary: "Response cancelled by Command Center.",
    });
  }

  const outcome = normalizeClosureOutcome(body?.outcome);
  if (!outcome) {
    return NextResponse.json(
      { error: "Select a valid response outcome." },
      { status: 400 }
    );
  }

  const remarks = String(body?.remarks ?? "").trim();
  if (outcome === "other" && !remarks) {
    return NextResponse.json(
      { error: "Please specify what happened for Others." },
      { status: 400 }
    );
  }

  const hasResolved = await hasCompletedDispatch(admin, id);
  if (!hasResolved) {
    return NextResponse.json(
      {
        error:
          "Mark as completed is available after at least one unit submits a resolved result.",
      },
      { status: 409 }
    );
  }

  const closedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("call_responses")
    .update({
      status: "closed",
      closure_outcome: outcome,
      closure_remarks: remarks || null,
      closed_at: closedAt,
      closed_by: user.id,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await cancelPendingDispatches(admin, id);
  } catch (cancelError) {
    console.error("cancel dispatch alerts failed:", cancelError);
  }

  return NextResponse.json({
    ok: true,
    callResponse: callResponseFromRow(data),
    closureSummary:
      outcome === "other"
        ? remarks
        : getClosureOutcomeLabel(outcome),
  });
}
