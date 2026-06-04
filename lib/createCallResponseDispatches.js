import {
  DISPATCH_COPY,
  DISPATCH_ROLE,
  DISPATCH_STATUS,
  dispatchFromRow,
  dispatchesFromRows,
} from "@/lib/callResponseDispatches";
import { rankNearbyUnits } from "@/lib/dispatchUnits";

export async function fetchLatestPatrolLocations(admin) {
  const { data, error } = await admin.rpc("get_latest_patrol_locations");
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

export async function cancelPendingDispatches(admin, callResponseId) {
  const { error } = await admin
    .from("call_response_dispatches")
    .update({ status: DISPATCH_STATUS.cancelled })
    .eq("call_response_id", callResponseId)
    .eq("status", DISPATCH_STATUS.pending);

  if (error) throw new Error(error.message);
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
