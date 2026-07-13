import json
from pathlib import Path

root = Path(r"c:\Users\Project Developer\Documents\projects\project-PATROLLERS")
rows = json.loads((root / "tmp-smart-locator-tokens.json").read_text(encoding="utf-8"))


def esc(value: str) -> str:
    return str(value).replace("'", "''")


batches = []
chunk = []
for row in rows:
    chunk.append(
        "('%s','%s','%s','%s',true)"
        % (
            esc(row["access_token"]),
            esc(row["office"]),
            esc(row["unit"]),
            esc(row["role"]),
        )
    )
    if len(chunk) == 40:
        batches.append(chunk)
        chunk = []
if chunk:
    batches.append(chunk)

queries = []
for batch in batches:
    queries.append(
        "insert into public.smart_locator_access_tokens (access_token, office, unit, role, is_active)\nvalues\n"
        + ",\n".join(batch)
        + ";"
    )

(root / "tmp-token-batches.json").write_text(
    json.dumps(queries, ensure_ascii=False),
    encoding="utf-8",
)
print(len(queries), sum(q.count("Encoder") + q.count("System Administrator") for q in queries))
