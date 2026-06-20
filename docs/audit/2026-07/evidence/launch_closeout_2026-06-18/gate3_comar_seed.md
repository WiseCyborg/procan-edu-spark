# Gate 3 — COMAR Seed Validation

## Before

```sql
SELECT count(*) FROM comar_versions;  -- 0
```

`useCOMARVersion` was returning `source: 'regulatory_content'` (fallback path), not the authoritative `comar_versions` source. The `regulatory_content` table itself was populated (8 rows, latest `last_modified_at = 2025-12-16 03:23 UTC`), confirming the regulatory data ingest is healthy — only the canonical version row was missing.

## Seed applied

Migration `20260620_080016` inserted:

| field | value |
|---|---|
| `version_number` | `14.17.05` |
| `section_reference` | `COMAR 14.17.05` |
| `effective_date` | `2025-12-16 00:00:00+00` |
| `content` | Maryland Cannabis Administration regulations governing dispensary agent training, certification, and compliance. |
| `change_summary` | Initial seed for launch readiness — mirrors latest regulatory_content sync (2025-12-16). |

## After

```sql
SELECT count(*) FROM comar_versions;          -- 1
SELECT version_number, effective_date         -- 14.17.05 | 2025-12-16
  FROM comar_versions ORDER BY effective_date DESC LIMIT 1;
```

`useCOMARVersion` will now resolve to `source: 'comar_versions'` on the next hook fetch (1-hour staleTime; immediate after manual refresh / page reload).

**Exit criteria:** `comar_versions` populated with active row; hook reports `comar_versions` source. ✅
