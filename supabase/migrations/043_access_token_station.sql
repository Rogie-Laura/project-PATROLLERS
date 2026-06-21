-- Station / Office grouping for access tokens.
-- Additive only: lets admins tag each 1-token-1-phone unit to a station
-- (e.g. "Rosario MPS") for bulk management and printable QR sheets.
-- Does NOT change tracking behaviour (still one marker per access_token_id).

alter table public.access_tokens
  add column if not exists station text;

create index if not exists access_tokens_station_idx
  on public.access_tokens (station);
