"use client";

import { useEffect, useState } from "react";

function SettingCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ReadOnlyValue({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function SystemSettings() {
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/system-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.location_interval_minutes != null) {
          setIntervalMinutes(data.settings.location_interval_minutes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">System Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Monitoring center configuration for mobile patrol units and the command
            center map.
          </p>
        </div>

        <SettingCard
          title="Mobile location updates"
          description="How often patrol devices send GPS updates while live tracking is active."
        >
          <ReadOnlyValue
            label="Send interval"
            value={
              loading
                ? "Loading..."
                : `Every ${intervalMinutes} minutes`
            }
          />
          <p className="mt-2 text-[11px] text-muted">
            Configured via server environment variable{" "}
            <code className="rounded bg-background/80 px-1 py-0.5 text-[10px]">
              MOBILE_LOCATION_INTERVAL_MINUTES
            </code>
            . Mobile apps read this value when validating the access token.
          </p>
        </SettingCard>

        <SettingCard
          title="Patrol status"
          description="Default operational status reported by mobile units on the map."
        >
          <ReadOnlyValue label="Default status" value="Police Visibility" />
          <ReadOnlyValue label="Incident alert status" value="On Incident Response" />
          <p className="mt-2 text-[11px] text-muted">
            Map markers use green for Police Visibility and red for On Incident
            Response when Patrol Status is enabled on the live map.
          </p>
        </SettingCard>

        <SettingCard
          title="Access & administration"
          description="Manage who can sign in to the monitoring center and issue mobile tokens."
        >
          <p className="text-xs text-muted">
            Use <strong className="text-foreground">Access Tokens</strong> in the menu
            bar to create or deactivate mobile device tokens. System Administrator
            role is required for token management and this settings page.
          </p>
        </SettingCard>
      </div>
    </div>
  );
}
