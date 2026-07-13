import Image from "next/image";
import AccountCard from "@/components/AccountCard";

export default function SmartLocatorHeader({ user, onSignOut, signingOut = false }) {
  const scopeLabel = [user?.unit, user?.office].filter(Boolean).join(" · ");

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Image
          src="/PNP.png"
          alt="PNP"
          width={36}
          height={36}
          className="h-8 w-auto shrink-0 object-contain"
        />
        <div className="min-w-0 border-l border-border/60 pl-2 sm:pl-3">
          <h1 className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-foreground sm:text-xs">
            Patrollers
          </h1>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-accent sm:text-[11px]">
            Smart Locator
          </p>
          {scopeLabel ? (
            <p className="mt-0.5 truncate text-[10px] text-muted">{scopeLabel}</p>
          ) : null}
        </div>
      </div>

      <AccountCard user={user} onSignOut={onSignOut} signingOut={signingOut} />
    </header>
  );
}
