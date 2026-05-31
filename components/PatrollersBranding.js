import Pro4aLogo from "@/components/Pro4aLogo";

export default function PatrollersBranding({ compact = false }) {
  return (
    <header className={`text-center ${compact ? "mb-5" : "mb-8"}`}>
      <Pro4aLogo size={compact ? "sm" : "md"} />

      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">
          PRO4A
        </p>
        <h1
          className={`font-bold tracking-[0.2em] text-foreground ${
            compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
          }`}
        >
          PATROLLERS
        </h1>
        <p
          className={`mx-auto max-w-sm leading-relaxed text-muted ${
            compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"
          }`}
        >
          Police Activity Tracking and Realtime Operations Live Locator and
          Enhanced Response System
        </p>
      </div>

      <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
    </header>
  );
}
