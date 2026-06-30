import { createAdminClient } from "@/lib/supabase/admin";

export const TOKEN_IN_USE_CODE = "token_in_use";

export const TOKEN_IN_USE_MESSAGE =
  "This access token is already in use on another device. Contact your System Administrator if you replaced the duty phone.";

export function normalizeDeviceId(value) {
  const id = String(value ?? "").trim();
  if (!id || id.length > 128) return null;
  return id;
}

export function extractDeviceIdFromRequest(request, body = null) {
  const header = request?.headers?.get("x-patrollers-device-id");
  const fromHeader = normalizeDeviceId(header);
  if (fromHeader) return fromHeader;

  if (body && typeof body === "object") {
    return normalizeDeviceId(body.device_id);
  }

  return null;
}

export async function resolveMobileDeviceBinding(accessTokenId, deviceId, bind) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("resolve_mobile_device_binding", {
    p_access_token_id: accessTokenId,
    p_device_id: deviceId ?? "",
    p_bind: bind === true,
  });

  if (error) {
    throw new Error(error.message ?? "Could not verify device binding.");
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "Could not verify device binding.", code: "binding_failed" };
  }

  return data;
}

export async function assertMobileDeviceBinding(accessTokenId, deviceId) {
  const result = await resolveMobileDeviceBinding(accessTokenId, deviceId, false);
  if (result.ok === true) return null;

  return {
    status: result.code === TOKEN_IN_USE_CODE ? 409 : 403,
    error: result.error ?? TOKEN_IN_USE_MESSAGE,
    code: result.code ?? TOKEN_IN_USE_CODE,
  };
}

export async function bindMobileDevice(accessTokenId, deviceId) {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) {
    const check = await resolveMobileDeviceBinding(accessTokenId, "", false);
    if (check.ok !== true) return check;
    return { ok: true, legacy: true };
  }

  return resolveMobileDeviceBinding(accessTokenId, normalized, true);
}
