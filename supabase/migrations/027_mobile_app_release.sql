-- Mobile in-app update metadata (Android APK OTA).
-- Admin sets latest version + HTTPS APK URL in System Settings after each release build.

alter table public.system_settings
  add column if not exists mobile_latest_version_code integer not null default 1
    check (mobile_latest_version_code >= 1),
  add column if not exists mobile_min_version_code integer not null default 1
    check (mobile_min_version_code >= 1),
  add column if not exists mobile_latest_version_name text not null default '1.0.0',
  add column if not exists mobile_apk_download_url text,
  add column if not exists mobile_update_required boolean not null default false,
  add column if not exists mobile_release_notes text;

alter table public.system_settings
  drop constraint if exists system_settings_mobile_version_order_check;

alter table public.system_settings
  add constraint system_settings_mobile_version_order_check
  check (mobile_min_version_code <= mobile_latest_version_code);
