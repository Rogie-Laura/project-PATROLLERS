import { NextResponse } from "next/server";
import { authorizeCommandCenter } from "@/lib/auth/apiAuth";
import {
  DEFAULT_COMMAND_CLOSURE_OUTCOME,
  getClosureOutcomeLabel,
} from "@/lib/callResponseOutcomes";
import { callResponseFromRow } from "@/lib/callResponses";
import { isSameScope } from "@/lib/auth/scope";
import {
  cancelAllActiveDispatches,
  hasArrivedDispatch,
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

  // Only the command level that owns the incident may close/cancel it. Higher
  // offices get read-only awareness, not dispatch control.
  if (!isSameScope(user, existing)) {
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

  const hasArrived = await hasArrivedDispatch(admin, id);
  if (!hasArrived) {
    return NextResponse.json(
      {
        error:
          "Mark as completed is available after at least one unit marks arrived on scene.",
      },
      { status: 409 }
    );
  }

  const outcome = DEFAULT_COMMAND_CLOSURE_OUTCOME;

  const closedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("call_responses")
    .update({
      status: "closed",
      closure_outcome: outcome,
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
    closureSummary: getClosureOutcomeLabel(outcome),
  });
}
