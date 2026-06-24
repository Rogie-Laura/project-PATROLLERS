import {
  DISPATCH_COPY,
  DISPATCH_ROLE,
  DISPATCH_STATUS,
  dispatchFromRow,
  dispatchesFromRows,
} from "@/lib/callResponseDispatches";
import { rankNearbyUnits } from "@/lib/dispatchUnits";
import {
  notifyDispatchAlert,
  notifyAlarmStop,
  notifyDispatchTerminated,
} from "@/lib/mobile/fcmSend";

export async function fetchLatestPatrolLocations(admin) {
  const { data, error } = await admin.rpc("get_latest_patrol_locations");
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

export async function cancelPendingDispatches(admin, callResponseId) {
  const { data: pending, error: pendingError } = await admin
    .from("call_response_dispatches")
    .select("access_token_id")
    .eq("call_response_id", callResponseId)
    .eq("status", DISPATCH_STATUS.pending);

  if (pendingError) throw new Error(pendingError.message);

  const { error } = await admin
    .from("call_response_dispatches")
    .update({
      status: DISPATCH_STATUS.cancelled,
      cancelled_at: new Date().toISOString(),
    })
    .eq("call_response_id", callResponseId)
    .eq("status", DISPATCH_STATUS.pending);

  if (error) throw new Error(error.message);

  const tokenIds = [
    ...new Set((pending ?? []).map((row) => row.access_token_id).filter(Boolean)),
  ];
  await Promise.allSettled(
    tokenIds.map((accessTokenId) => notifyAlarmStop(admin, accessTokenId))
  );
}

/** Cancel all in-flight dispatches so alerted mobiles stop and get termination notice. */
export async function cancelAllActiveDispatches(
  admin,
  callResponseId,
  { notifyRespondingPrimary = true } = {}
) {
  const now = new Date().toISOString();
  const activeStatuses = [
    DISPATCH_STATUS.pending,
    DISPATCH_STATUS.accepted,
    DISPATCH_STATUS.arrived,
  ];

  const { data: activeRows, error: fetchError } = await admin
    .from("call_response_dispatches")
    .select("id, access_token_id, status, role")
    .eq("call_response_id", callResponseId)
    .in("status", activeStatuses);

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await admin
    .from("call_response_dispatches")
    .update({
      status: DISPATCH_STATUS.cancelled,
      cancelled_at: now,
    })
    .eq("call_response_id", callResponseId)
    .in("status", activeStatuses);

  if (error) throw new Error(error.message);

  await Promise.allSettled(
    (activeRows ?? []).map(async (row) => {
      if (!row?.access_token_id) return;

      const isRespondingPrimary =
        row.role === DISPATCH_ROLE.primary &&
        (row.status === DISPATCH_STATUS.accepted ||
          row.status === DISPATCH_STATUS.arrived);

      if (isRespondingPrimary) {
        if (notifyRespondingPrimary) {
          await notifyDispatchTerminated(admin, row.access_token_id, {
            dispatchId: row.id,
            message: "Response has been terminated by the Command Center.",
          });
        } else {
          const { broadcastToMobileUnit } = await import(
            "@/lib/mobile/realtimeBroadcast"
          );
          await broadcastToMobileUnit(admin, row.access_token_id, "dispatch", {});
        }
        return;
      }

      if (row.status === DISPATCH_STATUS.pending) {
        await notifyAlarmStop(admin, row.access_token_id);
      }
    })
  );
}

export async function hasCompletedDispatch(admin, callResponseId) {
  const { data, error } = await admin
    .from("call_response_dispatches")
    .select("id")
    .eq("call_response_id", callResponseId)
    .eq("status", DISPATCH_STATUS.completed)
    .limit(1);

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function hasArrivedDispatch(admin, callResponseId) {
  const { data, error } = await admin
    .from("call_response_dispatches")
    .select("id")
    .eq("call_response_id", callResponseId)
    .eq("status", DISPATCH_STATUS.arrived)
    .limit(1);

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function createCallResponseDispatches(
  admin,
  callResponse,
  { maxRadiusM = 6000, replacePending = true } = {}
) {
  const locations = await fetchLatestPatrolLocations(admin);
  const ranked = rankNearbyUnits(callResponse, locations, maxRadiusM).filter(
    (unit) => unit.location.access_token_id
  );

  if (ranked.length === 0) {
    return {
      ok: true,
      dispatches: [],
      primary: null,
      cordon: [],
      alertedCount: 0,
      message: "No mobile units within dispatch radius.",
    };
  }

  if (replacePending) {
    await cancelPendingDispatches(admin, callResponse.id);
  }

  const [primaryUnit, ...cordonUnits] = ranked;
  const rows = [
    {
      call_response_id: callResponse.id,
      access_token_id: primaryUnit.location.access_token_id,
      role: DISPATCH_ROLE.primary,
      title: DISPATCH_COPY.primary.title,
      message: DISPATCH_COPY.primary.message,
      distance_meters: Math.round(primaryUnit.distanceMeters),
      status: DISPATCH_STATUS.pending,
    },
    ...cordonUnits
      .filter((unit) => unit.location.access_token_id)
      .map((unit) => ({
        call_response_id: callResponse.id,
        access_token_id: unit.location.access_token_id,
        role: DISPATCH_ROLE.cordon,
        title: DISPATCH_COPY.cordon.title,
        message: DISPATCH_COPY.cordon.message,
        distance_meters: Math.round(unit.distanceMeters),
        status: DISPATCH_STATUS.pending,
      })),
  ].filter((row) => row.access_token_id);

  const { data, error } = await admin
    .from("call_response_dispatches")
    .insert(rows)
    .select("*");

  if (error) throw new Error(error.message);

  const dispatches = dispatchesFromRows(data);
  const primary =
    dispatches.find((entry) => entry.role === DISPATCH_ROLE.primary) ?? null;
  const cordon = dispatches.filter((entry) => entry.role === DISPATCH_ROLE.cordon);

  await Promise.allSettled(
    dispatches.map((entry) =>
      notifyDispatchAlert(admin, entry.accessTokenId, entry.id, entry.role)
    )
  );

  return {
    ok: true,
    dispatches,
    primary,
    cordon,
    alertedCount: dispatches.length,
    message: `Alerted ${dispatches.length} mobile unit(s).`,
  };
}

export async function createSingleUnitDispatch(
  admin,
  callResponse,
  { accessTokenId, role, distanceMeters = null }
) {
  if (!accessTokenId || !role) {
    throw new Error("access_token_id and role are required.");
  }

  const copy = DISPATCH_COPY[role];
  if (!copy) {
    throw new Error("Invalid dispatch role.");
  }

  const { error: cancelError } = await admin
    .from("call_response_dispatches")
    .update({ status: DISPATCH_STATUS.cancelled })
    .eq("call_response_id", callResponse.id)
    .eq("access_token_id", accessTokenId)
    .eq("role", role)
    .eq("status", DISPATCH_STATUS.pending);

  if (cancelError) throw new Error(cancelError.message);

  const { data, error } = await admin
    .from("call_response_dispatches")
    .insert({
      call_response_id: callResponse.id,
      access_token_id: accessTokenId,
      role,
      title: copy.title,
      message: copy.message,
      distance_meters:
        Number.isFinite(distanceMeters) && distanceMeters >= 0
          ? Math.round(distanceMeters)
          : null,
      status: DISPATCH_STATUS.pending,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const dispatch = dispatchFromRow(data);

  await notifyDispatchAlert(
    admin,
    dispatch.accessTokenId,
    dispatch.id,
    dispatch.role
  );

  return {
    ok: true,
    dispatch,
    message:
      role === DISPATCH_ROLE.primary
        ? `Respond alert sent to mobile unit.`
        : `Dragnet alert sent to mobile unit.`,
  };
}

export async function listCallResponseDispatches(admin, callResponseId) {
  const { data, error } = await admin
    .from("call_response_dispatches")
    .select("*")
    .eq("call_response_id", callResponseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return dispatchesFromRows(data);
}

export { dispatchFromRow };
