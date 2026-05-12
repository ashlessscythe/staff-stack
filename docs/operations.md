# StaffStack — Operations

## SMS (Twilio) compliance notes

- Capture **explicit opt-in** for SMS reminders with timestamp in `NotificationPreference` (or equivalent).
- Honor **STOP/HELP** keywords per carrier and TCPA guidance; document your legal review for production use.
- Rate-limit SMS sends per user and per tenant to control cost and abuse.

## Email (Resend)

- Configure SPF/DKIM for your sending domain per Resend documentation.
- Handle bounces via webhook (optional) to suppress invalid addresses.

## Data retention

- Define retention for **AuditLog** and **FileObject** in your organization policy; implement archival jobs in a later phase.

## PII

- Minimize logged PII (prefer user IDs).
- Support export/delete requests per your privacy policy (implementation roadmap).

## Environment separation

- **Production** (`public` + production Vercel env) must never share database credentials with **Preview** environments.
