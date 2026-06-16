import { getMobileAppRelease } from "@/lib/mobile/systemSettings";
import { resolveApkDownloadUrl } from "@/lib/mobile/appRelease";
import MobileInstallCard from "@/components/MobileInstallCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Install PATROLLERS — PRO4A",
  description: "Download and install the PATROLLERS mobile app on Android phones.",
};

function resolveSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_PATROLLERS_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "https://project-patrollers.vercel.app";
}

export default async function InstallPage() {
  const release = await getMobileAppRelease();
  const downloadUrl = resolveApkDownloadUrl(release.mobile_apk_download_url);
  const installPageUrl = `${resolveSiteOrigin()}/install`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
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
