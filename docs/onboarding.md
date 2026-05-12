# StaffStack — Engineering Onboarding

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn if you standardize later)
- Neon PostgreSQL database (or local Postgres for development)

## Clone and install

```bash
git clone <repo-url> staff-stack
cd staff-stack
git checkout dev
npm install
cp .env.example .env
# Fill DATABASE_URL, NEXTAUTH_SECRET, and optional vendor keys
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Branching model

| Branch         | Purpose                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- |
| `public`       | Production line; Vercel Production deploys here. Merge from `dev` when releasing.            |
| `dev`          | Default integration; day-to-day work and automation commits land here unless using `feat/*`. |
| `feat/<topic>` | Short-lived branches; open PRs into `dev`.                                                   |

Do not use `main` for this repository’s workflow.

## Conventions

- **TypeScript** everywhere; strict mode enabled.
- **Server Actions** for authenticated mutations; always validate session, tenant membership, and RBAC inside the action.
- **Repositories** in `src/server/repositories/*` must include `tenantId` (and `siteId` when applicable) in queries.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`). Milestone tags: `milestone/Mn-complete` on `dev` after review (document your tag policy in the team channel).

## RBAC mental model

- A **User** joins a **Tenant** via `TenantUser`.
- **SiteMembership** binds a tenant user to a **Site** with a **RoleKey** (`TENANT_ADMIN`, `SITE_ADMIN`, `MANAGER`, `SCHEDULER`, `EMPLOYEE`, `VIEWER`, `SUPER_ADMIN` platform role is separate if enabled).
- Permissions are derived from role defaults with optional `permissions[]` overrides on the membership row.
- **Never** trust `tenantId` or `tenantSlug` from the client without verifying membership server-side.

## Demo users (development seed only)

After `npm run db:seed`, use accounts documented in the seed output (emails under `@demo.local`). Passwords are for **local development only** — never ship these to production.

## Useful commands

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Next.js dev server                                   |
| `npm run build`     | Production build                                     |
| `npm run lint`      | ESLint                                               |
| `npm run format`    | Prettier write                                       |
| `npm run test`      | Unit tests (Vitest)                                  |
| `npm run test:e2e`  | Playwright (requires dev server or webServer config) |
| `npx prisma studio` | DB browser                                           |

## Where to read next

- [architecture.md](./architecture.md) — system boundaries and data flow
- [security.md](./security.md) — threat model and headers
- [api.md](./api.md) — REST `/api/v1` conventions
