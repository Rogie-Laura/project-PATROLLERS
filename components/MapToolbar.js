"use client";

import Link from "next/link";
import { isAdminRole } from "@/lib/mobile/adminRoles";
import { BASEMAPS } from "@/lib/mapBasemaps";

function MapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "map", href: "/", label: "Map", Icon: MapIcon },
  { id: "review", href: "/track-review", label: "Review Track", Icon: ReviewIcon },
  {
    id: "settings",
    href: "/system-settings",
    label: "System Settings",
    Icon: SettingsIcon,
    adminOnly: true,
  },
  {
    id: "tokens",
    href: "/access-tokens",
    label: "Access Tokens",
    Icon: KeyIcon,
    adminOnly: true,
  },
];

function PatrolStatusToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="View patrol status on map"
      title="Show patrol status colors and labels on markers"
      onClick={() => onChange(!enabled)}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2 py-1 transition hover:bg-background/80"
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition ${
          enabled ? "bg-accent" : "bg-muted/50"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
            enabled ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      <span
        className={`whitespace-nowrap text-[10px] font-medium sm:text-[11px] ${
          enabled ? "text-accent" : "text-muted"
        }`}
      >
        Patrol Status
      </span>
    </button>
  );
}

export default function MapToolbar({
  active = "map",
  user,
  basemapId,
  onBasemapChange,
  showBasemap = false,
  showPatrolStatus = true,
  onShowPatrolStatusChange,
}) {
  const isAdmin = isAdminRole(user?.role);
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-card/90 px-3 py-1 sm:px-4">
      <nav className="flex min-w-0 shrink-0 items-center gap-1">
        {items.map((item) => {
          const isActive = item.id === active;
          const { Icon } = item;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition sm:text-xs ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-background/80 hover:text-foreground"
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {showBasemap && onBasemapChange && (
        <>
          <div className="h-5 w-px shrink-0 bg-border/70" aria-hidden />
          <div
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
            role="group"
            aria-label="Map basemap"
          >
            {BASEMAPS.map((basemap) => {
              const isActive = basemap.id === basemapId;

              return (
                <button
                  key={basemap.id}
                  type="button"
                  onClick={() => onBasemapChange(basemap.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-medium leading-none transition sm:px-2 sm:text-[11px] ${
                    isActive
                      ? "bg-accent text-background shadow-sm"
                      : "text-muted hover:bg-background/80 hover:text-foreground"
                  }`}
                >
                  {basemap.label}
                </button>
              );
            })}
          </div>

          {onShowPatrolStatusChange && (
            <>
              <div className="h-5 w-px shrink-0 bg-border/70" aria-hidden />
              <PatrolStatusToggle
                enabled={showPatrolStatus}
                onChange={onShowPatrolStatusChange}
              />
            </>
          )}
        </>
      )}

      <div className="ml-auto w-28 shrink-0 sm:w-56">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            disabled
            placeholder="Search..."
            aria-label="Search patrol or location"
            className="w-full rounded-md border border-border/60 bg-background/60 py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
          />
        </div>
      </div>
    </div>
  );
}
