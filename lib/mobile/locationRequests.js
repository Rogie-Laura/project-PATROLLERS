import { notifyLocationRequest } from "@/lib/mobile/fcmSend";

export const LOCATION_REQUEST_STATUS = {
  pending: "pending",
  success: "success",
  failed: "failed",
};

export const LOCATION_REQUEST_MODES = {
  silent: "silent",
  alarm: "alarm",
};

export function normalizeLocationRequestMode(value) {
  const mode = String(value ?? "")
    .trim()
    .toLowerCase();
  return mode === LOCATION_REQUEST_MODES.alarm
    ? LOCATION_REQUEST_MODES.alarm
    : LOCATION_REQUEST_MODES.silent;
}

export function locationRequestItemFromRow(row, locationByTokenId = {}) {
  if (!row) return null;

  const loc = locationByTokenId[row.access_token_id];
  const name =
    loc?.patrol_name ||
    loc?.mobile_plate ||
    loc?.radio_call_sign ||
    loc?.unit ||
    "Mobile unit";

  return {
    id: row.id,
    batchId: row.batch_id,
    accessTokenId: row.access_token_id,
    status: row.status,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at ?? null,
    locationUpdateId: row.location_update_id ?? null,
    failureReason: row.failure_reason ?? null,
    unitName: name,
  };
}

export function locationRequestBatchFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    label: row.label ?? null,
    requestMode: normalizeLocationRequestMode(row.request_mode),
    totalCount: row.total_count,
    successCount: row.success_count,
    failedCount: row.failed_count,
    pendingCount: row.pending_count,
  };
}

export async function createLocationRequestBatch(
  admin,
  { accessTokenIds, createdBy = null, label = null, requestMode = null }
) {
  const ids = [...new Set((accessTokenIds ?? []).filter(Boolean))];
  if (ids.length === 0) {
    throw new Error("Select at least one mobile unit.");
  }

  const mode = normalizeLocationRequestMode(requestMode);

  const { data, error } = await admin.rpc("create_location_request_batch", {
    p_access_token_ids: ids,
    p_created_by: createdBy,
    p_label: label,
    p_request_mode: mode,
  });

  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "Could not create batch.");

  const batchId = data.batch?.id;
  if (batchId) {
    const { data: items } = await admin
      .from("location_request_items")
      .select("id, access_token_id")
      .eq("batch_id", batchId)
      .eq("status", LOCATION_REQUEST_STATUS.pending);

    await Promise.allSettled(
      (items ?? []).map((item) =>
        notifyLocationRequest(admin, item.access_token_id, item.id, mode)
      )
    );
  }

  return {
    batch: locationRequestBatchFromRow(data.batch),
    itemCount: data.item_count ?? ids.length,
  };
}

export async function getLocationRequestBatch(admin, batchId) {
  const { data: batch, error: batchError } = await admin
    .from("location_request_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (batchError) throw new Error(batchError.message);
  if (!batch) return null;

  const timeoutSeconds =
    normalizeLocationRequestMode(batch.request_mode) ===
    LOCATION_REQUEST_MODES.alarm
      ? 180
      : 90;

  await admin.rpc("fail_stale_location_request_items", {
    p_batch_id: batchId,
    p_timeout_seconds: timeoutSeconds,
  });

  const { data: refreshed, error: refreshError } = await admin
    .from("location_request_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (refreshError) throw new Error(refreshError.message);

  const { data: items, error: itemsError } = await admin
    .from("location_request_items")
    .select("*")
    .eq("batch_id", batchId)
    .order("requested_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const tokenIds = [...new Set((items ?? []).map((i) => i.access_token_id))];
  let locationByTokenId = {};

  if (tokenIds.length > 0) {
    const { data: snapshot } = await admin.rpc("get_monitor_patrol_snapshot");
    const rows = Array.isArray(snapshot) ? snapshot : [];
    locationByTokenId = Object.fromEntries(
      rows
        .filter((row) => row?.access_token_id)
        .map((row) => [row.access_token_id, row])
    );
  }

  return {
    batch: locationRequestBatchFromRow(refreshed),
    items: (items ?? []).map((row) =>
      locationRequestItemFromRow(row, locationByTokenId)
    ),
  };
}
