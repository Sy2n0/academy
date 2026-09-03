# HUB-ACADEMY DB backups — 2026-06-20

Two Postgres clusters are connected to the HUB-ACADEMY stack:

| Source container | Image              | DB               | User / pass        | Source host port |
| ---------------- | ------------------ | ---------------- | ------------------ | ---------------- |
| hub-academy-db-1 | postgres:16.4      | saas-starter-kit | admin / admin      | 5434             |
| hub-education-db | postgres:16-alpine | hubeducation     | hubedu / hubedu123 | 5433             |

(`hub-academy-minio` is object storage, not a DB — not included here.)

## Files

- `*.pgdumpall.sql` — full cluster dump (roles + all databases). Used for the auto-restore.
- `*.dump` — single-DB custom-format dump (for selective `pg_restore`).

## Easiest: bring both up locally exactly as-is

```bash
docker compose -f docker-compose.local.yml up -d
```

The `.pgdumpall.sql` files load automatically on first boot (only when the data
volume is empty). Then connect:

- academy : `postgres://admin:admin@localhost:5434/saas-starter-kit`
- education : `postgres://hubedu:hubedu123@localhost:5433/hubeducation`

To re-run a clean restore: `docker compose -f docker-compose.local.yml down -v` then `up -d` again.

## Restore into an existing/running Postgres

Cluster dump (plain SQL):

```bash
psql -h localhost -p 5434 -U admin -d postgres -f hub-academy-db-1.pgdumpall.sql
```

Single DB (custom format):

```bash
pg_restore -h localhost -p 5434 -U admin -d saas-starter-kit --clean --if-exists hub-academy_saas-starter-kit.dump
```
