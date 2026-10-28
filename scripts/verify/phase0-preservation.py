#!/usr/bin/env python3
"""Compare redacted Phase 0 inventory snapshots without printing row contents.

Input JSON shape is either a direct table map or
{"tables": {"table_name": [{"id": "...", ...}, ...]}}.
Each row must be JSON data and contain a stable key field named id, key, or
role_id. Composite-key rows may provide an explicit _key string. Snapshot
files should remain private because keys themselves may identify personal data.
"""

import argparse
import hashlib
import json
from pathlib import Path
import sys


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def row_key(row):
    for field in ("_key", "id", "key", "card_id"):
        if field in row:
            return str(row[field])
    for fields in (("role_id", "item_id"), ("role_id", "requirement_id")):
        if all(field in row for field in fields):
            return "|".join(str(row[field]) for field in fields)
    if "role_id" in row:
        return str(row["role_id"])
    raise ValueError("row missing stable key (_key, id, key, or role_id)")


def digest(row):
    return hashlib.sha256(canonical(row).encode("utf-8")).hexdigest()


def read_snapshot(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    tables = payload.get("tables", payload)
    if not isinstance(tables, dict):
        raise ValueError("snapshot must contain a tables object")
    normalized = {}
    for table, rows in tables.items():
        if not isinstance(rows, list):
            raise ValueError(f"table {table!r} must contain a row list")
        indexed = {}
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError(f"table {table!r} contains a non-object row")
            key = row_key(row)
            if key in indexed:
                raise ValueError(f"table {table!r} contains duplicate stable keys")
            indexed[key] = digest(row)
        normalized[table] = indexed
    return normalized


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("after", type=Path)
    args = parser.parse_args()
    try:
        before = read_snapshot(args.baseline)
        after = read_snapshot(args.after)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 2

    changed = False
    for table in sorted(set(before) | set(after)):
        old = before.get(table, {})
        new = after.get(table, {})
        removed = sorted(set(old) - set(new))
        added = sorted(set(new) - set(old))
        modified = sorted(key for key in set(old) & set(new) if old[key] != new[key])
        table_changed = bool(removed or added or modified)
        changed |= table_changed
        print(f"TABLE {table} baseline={len(old)} after={len(new)} removed={len(removed)} added={len(added)} changed={len(modified)}")
        for category, keys in (("REMOVED", removed), ("ADDED", added), ("CHANGED", modified)):
            for key in keys:
                # Identifier values may themselves be personal. Emit only an opaque digest.
                opaque = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
                print(f"{category} {table} key_sha256={opaque}")
    print("RESULT " + ("DIFFERENCES_FOUND" if changed else "MATCH"))
    return 1 if changed else 0


if __name__ == "__main__":
    raise SystemExit(main())
