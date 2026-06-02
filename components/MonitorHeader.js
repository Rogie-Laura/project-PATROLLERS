import Image from "next/image";
import Link from "next/link";
import AccountCard from "@/components/AccountCard";
import { isAdminRole } from "@/lib/mobile/adminRoles";

export default function MonitorHeader({
  user,
  onSignOut,
  signingOut = false,
  active = "map",
}) {
  const showAdminNav = isAdminRole(user?.role);

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <Image
          src="/PNP.png"
          alt="PNP"
          width={36}
          height={36}
          className="h-8 w-auto shrink-0 object-contain"
        />
        <Image
          src="/PRO4A.png"
          alt="PRO4A"
          width={36}
          height={40}
          className="h-8 w-auto shrink-0 object-contain"
        />
        <div className="min-w-0 border-l border-border/60 pl-2 sm:pl-2.5">
          <h1 className="truncate text-xs font-bold uppercase tracking-wide text-foreground sm:text-sm">
            PATROLLERS MONITORING CENTER
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {showAdminNav && (
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition sm:text-xs ${
                active === "map"
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Map
            </Link>
            <Link
              href="/access-tokens"
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition sm:text-xs ${
                active === "tokens"
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Access Tokens
            </Link>
          </nav>
        )}

        <AccountCard user={user} onSignOut={onSignOut} signingOut={signingOut} />
      </div>
    </header>
  );
}
