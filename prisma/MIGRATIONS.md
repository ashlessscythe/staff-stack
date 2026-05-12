# Prisma migrations

- **Local / Neon:** apply with `npx prisma migrate dev` (creates new migrations from schema changes) or `npx prisma migrate deploy` in CI/production.
- **Initial migration:** `20260512100000_init` was generated via `prisma migrate diff --from-empty --to-schema-datamodel` so the repo bootstraps without a live DB at doc-authoring time. Regenerate if the schema drifts before first production deploy.
- **Forward-only:** do not rewrite applied migrations; add new folders for changes.
