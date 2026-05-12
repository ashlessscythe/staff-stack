# StaffStack — Deployment (Vercel + Neon)

## Overview

- **Hosting:** Vercel (Next.js App Router).
- **Database:** Neon PostgreSQL; use the **pooled** connection string for serverless.
- **Production branch:** `public` (Vercel Production environment must track `public`, not `dev`).
- **Previews:** Pull requests targeting `dev` (and feature branches) receive Preview deployments.

## Required environment variables

| Variable              | Required    | Description                                            |
| --------------------- | ----------- | ------------------------------------------------------ |
| `DATABASE_URL`        | Yes         | Neon pooled PostgreSQL URL (`?sslmode=require`)        |
| `NEXTAUTH_SECRET`     | Yes         | Random secret for Auth.js                              |
| `NEXTAUTH_URL`        | Yes in prod | Canonical site URL (e.g. `https://app.example.com`)    |
| `RESEND_API_KEY`      | Yes\*       | Email sending (\*if email features enabled at runtime) |
| `TWILIO_ACCOUNT_SID`  | Yes\*       | SMS (\*if SMS enabled)                                 |
| `TWILIO_AUTH_TOKEN`   | Yes\*       |                                                        |
| `TWILIO_PHONE_NUMBER` | Yes\*       | E.164 sender                                           |

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `SENTRY_DSN`, Upstash for rate limiting.

## Neon setup

1. Create a Neon project and database.
2. Copy the **pooled** connection string into Vercel as `DATABASE_URL`.
3. Enable **branching** for preview databases (recommended): link preview deployments to a Neon branch per PR or use a shared preview DB with caution.
4. Run migrations against production from CI or a controlled script:

```bash
DATABASE_URL="..." npx prisma migrate deploy
```

## Vercel checklist

- [ ] Project connected to GitHub; **Production** = branch `public`.
- [ ] All required env vars set for Production, Preview, and Development scopes as appropriate.
- [ ] `NEXTAUTH_URL` matches the production hostname.
- [ ] Cron jobs (if used for reminders) registered in `vercel.json` and documented in [sre.md](./sre.md).
- [ ] Preview: use Neon branch or isolated schema; never point previews at production DB without explicit approval.

## Rollback

- **Application:** In Vercel → Deployments → select previous Production deployment → **Promote to Production**.
- **Database:** Forward-only migrations; use expand/contract for breaking changes. Emergency fixes documented in PR with manual SQL if needed.

## Post-deploy verification

1. Health: `GET /api/health` returns 200.
2. Auth: sign-in page loads; credentials flow works against production DB.
3. Tenant route: `/t/[slug]` resolves for a known tenant.

See [sre.md](./sre.md) for alerts and runbooks.
