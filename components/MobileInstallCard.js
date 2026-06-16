"use client";

import { QRCodeSVG } from "qrcode.react";

export default function MobileInstallCard({
  installPageUrl,
  downloadUrl,
  versionName,
  versionCode,
  releaseNotes,
  configured,
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
        PRO4A PATROLLERS
      </div>
      <h1 className="text-2xl font-bold text-foreground">Install sa Android</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        I-scan ang QR code sa phone, o i-tap ang Download. Kailangan ng{" "}
        <strong className="text-foreground">Allow install from unknown sources</strong>{" "}
        kung hihingi ang phone.
      </p>

      {configured && downloadUrl ? (
        <>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="rounded-xl border border-border/70 bg-white p-3">
              <QRCodeSVG value={downloadUrl} size={220} level="M" />
            </div>
            <p className="text-center text-xs text-muted">
              QR → diretsong download ng APK (Google Drive)
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Version</span>
              <span className="font-semibold text-foreground">
                {versionName} (build {versionCode})
              </span>
            </div>
            {releaseNotes ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">{releaseNotes}</p>
            ) : null}
          </div>

          <a
            href={downloadUrl}
            download
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-background transition hover:bg-accent-dark"
          >
            Download APK
          </a>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            Pagkatapos i-download, buksan ang file at i-install. Kung may lumabas na
            Google Drive warning, piliin ang <strong className="text-foreground">Download anyway</strong>.
          </p>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Wala pang APK link</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-amber-100/90">
            <li>I-upload ang <code className="text-amber-50">app-release.apk</code> sa Google Drive.</li>
            <li>Share → <strong>Anyone with the link</strong> (Viewer).</li>
            <li>Kopyahin ang file link at ilagay sa <strong>System Settings → Mobile app update (OTA)</strong>.</li>
            <li>Set version code <strong>25</strong> at name <strong>1.6.5</strong>, then Save.</li>
            <li>I-refresh ang page na ito — lalabas ang QR.</li>
          </ol>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        Install page:{" "}
        <span className="break-all text-foreground/80">{installPageUrl}</span>
      </p>
    </div>
  );
}
