import MonitorHeader from "@/components/MonitorHeader";
import { COMMAND_BILLING_UNAVAILABLE_MESSAGE } from "@/lib/auth/commandAccess";

export default function CommandBillingUnavailable({
  user,
  onSignOut,
  signingOut = false,
  message = COMMAND_BILLING_UNAVAILABLE_MESSAGE,
}) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <MonitorHeader
        user={user}
        onSignOut={onSignOut}
        signingOut={signingOut}
      />

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-8 text-center shadow-lg shadow-black/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Monitoring center unavailable
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        </div>
      </div>
    </main>
  );
}
