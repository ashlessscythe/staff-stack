# StaffStack

Multi-tenant workforce scheduling: sites, shifts, assignments, availability, swaps, reminders (email/SMS), RBAC, and audit trails. Built with **Next.js (App Router)**, **Prisma**, **Neon PostgreSQL**, **Auth.js**, **Tailwind**, and **shadcn/ui**.

## Quickstart

```bash
git checkout dev
npm install
cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (e.g. http://localhost:3000)
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc                                          | Description                         |
| -------------------------------------------- | ----------------------------------- |
| [docs/onboarding.md](docs/onboarding.md)     | Dev setup, branching, RBAC overview |
| [docs/architecture.md](docs/architecture.md) | System design                       |
| [docs/api.md](docs/api.md)                   | REST `/api/v1`                      |
| [docs/security.md](docs/security.md)         | Security controls                   |
| [docs/deployment.md](docs/deployment.md)     | Vercel + Neon                       |
| [docs/sre.md](docs/sre.md)                   | Operations / alerts                 |
| [docs/contributing.md](docs/contributing.md) | PRs, branches (`dev` / `public`)    |
| [docs/operations.md](docs/operations.md)     | SMS/email compliance notes          |

## Environment variables

**Required for core app:** `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`  
**Required for notifications (when used):** `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`  
**Optional:** Stripe, OAuth, Sentry — see `.env.example`.

## Scripts

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Development server                                     |
| `npm run build`    | Production build                                       |
| `npm run lint`     | ESLint                                                 |
| `npm run format`   | Prettier                                               |
| `npm run test`     | Vitest unit tests                                      |
| `npm run test:e2e` | Playwright                                             |
| `npm run db:seed`  | Prisma seed (`-- --clear`, `--use-faker`, `--count N`) |

## License

MIT — see [LICENSE](LICENSE).
