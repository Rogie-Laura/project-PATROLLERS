import json
import hashlib
import re
from pathlib import Path

root = Path(r"c:\Users\Project Developer\Documents\projects\project-PATROLLERS")
rows = json.loads((root / "tmp-smart-locator-tokens.json").read_text(encoding="utf-8"))


def slug(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", str(value).strip()).strip("-").upper()
    return cleaned[:18] or "X"


def esc(value: str) -> str:
    return str(value).replace("'", "''")


seen = set()
out = []
for i, row in enumerate(rows, 1):
    unit = row["unit"].strip()
    office = row["office"].strip()
    role = row["role"].strip()
    tok = (row.get("access_token") or "").strip()
    if not tok:
        base = f"SL-{slug(office)}-{slug(unit)}"
        digest = hashlib.sha1(f"{office}|{unit}|{i}".encode()).hexdigest()[:4].upper()
        tok = f"{base}-{digest}"
    original = tok
    n = 1
    while tok.lower() in seen:
        n += 1
        tok = f"{original}-{n}"
    seen.add(tok.lower())
    out.append(
        {
            "unit": unit,
            "office": office,
            "role": role,
            "access_token": tok,
        }
    )

(root / "tmp-smart-locator-tokens.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

values = []
for row in out:
    values.append(
        "('%s','%s','%s','%s',true)"
        % (
            esc(row["access_token"]),
            esc(row["office"]),
            esc(row["unit"]),
            esc(row["role"]),
        )
    )

joined = ",\n".join(values)

sql = f"""-- Rebuild Smart Locator access tokens from access-token.xlsx
-- Columns: Unit, Office, Role, access_token

drop table if exists public.smart_locator_access_tokens cascade;

create table public.smart_locator_access_tokens (
  id uuid primary key default gen_random_uuid(),
  unit text not null default '',
  office text not null default '',
  role text not null default 'Encoder'
    check (role in ('Encoder', 'System Administrator')),
  access_token text not null,
  is_active boolean not null default true,
  session text,
  session_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index smart_locator_access_tokens_access_token_unique_idx
  on public.smart_locator_access_tokens (lower(trim(access_token)));

create unique index smart_locator_access_tokens_session_unique_idx
  on public.smart_locator_access_tokens (session)
  where session is not null;

create index smart_locator_access_tokens_office_unit_idx
  on public.smart_locator_access_tokens (office, unit);

alter table public.smart_locator_access_tokens enable row level security;

insert into public.smart_locator_access_tokens (access_token, office, unit, role, is_active)
values
{joined};
"""

migration_path = root / "supabase" / "migrations" / "060_smart_locator_access_tokens_from_xlsx.sql"
migration_path.write_text(sql, encoding="utf-8")

rosario = [r for r in out if "rosario" in r["unit"].lower()]
admin = [r for r in out if r["role"] == "System Administrator"]
print("TOTAL", len(out))
print("ROSARIO", rosario)
print("ADMIN", admin)
print("SQL", migration_path)
