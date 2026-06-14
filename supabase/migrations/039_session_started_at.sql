-- Track when the current monitor session started (for single-device login policy).

alter table public."user"
  add column if not exists session_started_at timestamptz;
