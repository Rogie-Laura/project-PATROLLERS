"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TokenQrCode({ value, size = 128, className = "" }) {
  if (!value) return null;

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white p-2 ${className}`}
      title="Scan with PATROLLERS mobile app"
    >
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  );
}
