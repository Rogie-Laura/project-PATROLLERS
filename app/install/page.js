import { getMobileAppRelease } from "@/lib/mobile/systemSettings";
import { resolveApkDownloadUrl } from "@/lib/mobile/appRelease";
import MobileInstallCard from "@/components/MobileInstallCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Install PATROLLERS — PRO4A",
  description: "Download and install the PATROLLERS mobile app on Android phones.",
};

const PRODUCTION_ORIGIN =
  process.env.NEXT_PUBLIC_PATROLLERS_URL?.replace(/\/$/, "") ||
  "https://project-patrollers.vercel.app";

function resolveSiteOrigin() {
  return PRODUCTION_ORIGIN;
}

export default async function InstallPage() {
  const release = await getMobileAppRelease();
  const downloadUrl = resolveApkDownloadUrl(release.mobile_apk_download_url);
  const installPageUrl = `${resolveSiteOrigin()}/install`;

  return (
    <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-4 py-10">
      <MobileInstallCard
        installPageUrl={installPageUrl}
        downloadUrl={downloadUrl}
        versionName={release.mobile_latest_version_name}
        versionCode={release.mobile_latest_version_code}
        releaseNotes={release.mobile_release_notes}
        configured={Boolean(release.mobile_apk_download_url)}
      />
    </main>
  );
}
