const DEFAULT_RELEASE = {
  mobile_latest_version_code: 1,
  mobile_min_version_code: 1,
  mobile_latest_version_name: "1.0.0",
  mobile_apk_download_url: null,
  mobile_update_required: false,
  mobile_release_notes: null,
};

export function normalizeVersionCode(value, fallback = 1) {
  const code = Math.round(Number(value));
  if (!Number.isFinite(code) || code < 1) return fallback;
  return code;
}

export function normalizeVersionName(value, fallback = "1.0.0") {
  const name = String(value ?? "").trim();
  return name || fallback;
}

/** Google Drive share links → direct download (OTA needs a file URL, not a folder). */
export function googleDriveDirectDownloadUrl(input) {
  const url = String(input ?? "").trim();
  if (!url.includes("drive.google.com")) return null;

  if (/\/drive\/folders\//.test(url)) {
    return {
      error:
        "Google Drive folder links do not work for OTA. Open the APK file, Share → Anyone with the link, then paste the file link here.",
    };
  }

  const fileId =
    url.match(/\/file\/d\/([^/]+)/)?.[1] ?? new URL(url).searchParams.get("id");
  if (fileId) {
    // Large APKs need confirm=t on usercontent host — uc?export= returns HTML for OTA.
    return {
      url: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    };
  }

  return null;
}

export function normalizeApkUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { error: "APK download URL must use HTTPS." };
    }

    const drive = googleDriveDirectDownloadUrl(url);
    if (drive?.error) return drive;
    if (drive?.url) return { url: drive.url };

    return { url };
  } catch {
    return { error: "Enter a valid HTTPS URL for the APK download." };
  }
}

export function normalizeMobileRelease(row = {}) {
  const latest = normalizeVersionCode(row.mobile_latest_version_code, 1);
  let min = normalizeVersionCode(row.mobile_min_version_code, 1);
  if (min > latest) min = latest;

  return {
    mobile_latest_version_code: latest,
    mobile_min_version_code: min,
    mobile_latest_version_name: normalizeVersionName(
      row.mobile_latest_version_name,
      "1.0.0"
    ),
    mobile_apk_download_url: row.mobile_apk_download_url?.trim() || null,
    mobile_update_required: Boolean(row.mobile_update_required),
    mobile_release_notes: row.mobile_release_notes?.trim() || null,
  };
}

export function defaultMobileRelease() {
  return { ...DEFAULT_RELEASE };
}

/**
 * @param {number} installedVersionCode
 * @param {ReturnType<typeof normalizeMobileRelease>} release
 */
export function evaluateMobileUpdate(installedVersionCode, release) {
  const installed = normalizeVersionCode(installedVersionCode, 0);
  const latest = release.mobile_latest_version_code;
  const min = release.mobile_min_version_code;
  const hasUrl = Boolean(release.mobile_apk_download_url);

  const updateAvailable = installed > 0 && latest > installed && hasUrl;
  const updateRequired =
    (installed > 0 && installed < min && hasUrl) ||
    (release.mobile_update_required && updateAvailable);

  return {
    update_available: updateAvailable,
    update_required: updateRequired,
    installed_version_code: installed,
    latest_version_code: latest,
    min_version_code: min,
    latest_version_name: release.mobile_latest_version_name,
    download_url: release.mobile_apk_download_url,
    release_notes: release.mobile_release_notes,
  };
}

export function parseMobileReleaseInput(body = {}) {
  const latest = normalizeVersionCode(body.mobile_latest_version_code, 1);
  let min = normalizeVersionCode(body.mobile_min_version_code, 1);
  if (min > latest) {
    return { error: "Minimum version cannot be higher than latest version." };
  }

  const urlResult = normalizeApkUrl(body.mobile_apk_download_url);
  if (urlResult?.error) return urlResult;

  return {
    release: {
      mobile_latest_version_code: latest,
      mobile_min_version_code: min,
      mobile_latest_version_name: normalizeVersionName(
        body.mobile_latest_version_name
      ),
      mobile_apk_download_url: urlResult?.url ?? null,
      mobile_update_required: Boolean(body.mobile_update_required),
      mobile_release_notes: String(body.mobile_release_notes ?? "").trim() || null,
    },
  };
}
