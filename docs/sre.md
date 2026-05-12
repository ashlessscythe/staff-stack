# StaffStack — SRE / Operations Notes

## On-call expectations

- **P1:** app down / auth broken / data corruption risk — page owner, rollback Vercel production.
- **P2:** degraded performance / partial feature — investigate logs, scale Neon compute if needed.

## Dashboards

- **Vercel:** deployment frequency, error rate, function duration.
- **Neon:** connection count, CPU, storage, slow queries (`pg_stat_statements` where available).

## Alerts (recommended)

- Spike in 5xx from Vercel analytics or log drain.
- Webhook failure rate (Stripe) if enabled.
- Reminder job backlog depth (if cron enqueues rows — monitor `ScheduledReminder` pending count).

## Runbooks

### Production incident — bad deploy

1. Vercel → Promote previous stable deployment on `public`.
2. If DB migration was applied, follow DB rollback section in [deployment.md](./deployment.md).

### Database connection exhaustion

1. Confirm using **pooled** `DATABASE_URL` from Neon.
2. Reduce Prisma connection pressure (singleton client; avoid per-request new clients).

### Email/SMS provider outage

1. Toggle tenant-level notification settings if UI exists; otherwise disable cron or queue processing temporarily.
2. Retry with exponential backoff for queued reminders.

## Scaling knobs

- Neon: scale compute; add read replica for heavy read paths (V2).
- Vercel: enable appropriate function regions and concurrency limits.
- Application: cache tenant settings in memory with short TTL (careful on serverless).

## Backups

- Neon PITR / backups per Neon project configuration — document RPO/RTO in your org’s internal wiki.
