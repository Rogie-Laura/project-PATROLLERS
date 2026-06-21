-- Subscription / activation control for monitoring accounts (SCC, PCC, RCC).
-- The System Administrator (region) owns the platform; stations and provinces
-- subscribe. An account can be deactivated, or set to auto-expire on a date.
-- System Administrator accounts are never blocked by these fields (enforced in app code).
--
-- is_active = false              -> account cannot sign in (manual deactivation)
-- subscription_expires_at = NULL -> never expires
-- subscription_expires_at < now  -> account cannot sign in until renewed

alter table public."user"
  add column if not exists is_active boolean not null default true,
  add column if not exists subscription_expires_at timestamptz;

create index if not exists user_subscription_expires_idx
  on public."user" (subscription_expires_at);
