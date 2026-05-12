# StaffStack — Security

## Goals

- **Tenant isolation:** no cross-tenant data reads/writes.
- **RBAC:** least privilege; server-side enforcement for every mutation and sensitive query.
- **OWASP-aligned** mitigations for common web risks.

## Authentication

- **Argon2id** password hashing for credentials provider.
- **Auth.js** session cookies: `HttpOnly`, `Secure` in production, `SameSite=Lax` (tighten where appropriate).

## Authorization

- Central `assertPermission(ctx, permission, { siteId? })` used by Server Actions and API routes.
- **Permission matrix** (excerpt): see product spec; implement full matrix in `src/lib/rbac.ts` and tests.

## Tenant isolation

- Repository pattern: all queries include `where: { tenantId: ctx.tenantId }`.
- CI grep / tests to catch raw queries without tenant scope where applicable.

## Headers (middleware)

- HSTS (production), `X-Frame-Options` / frame-ancestors via CSP, `Referrer-Policy`, baseline **CSP** (tighten iteratively for inline needs).

## CSRF / XSS

- SameSite cookies + Auth.js for session mutations.
- React escaping by default; sanitize any future rich text.
- **Prisma** parameterized queries only (no string-concat SQL).

## Audit logging

- Append-only `AuditLog` for sensitive actions (role changes, shift publish, swap approval, login failures optional).

## Brute force

- Rate limit credential sign-in route (in-memory or Redis/Upstash when configured).

## Secrets

- Never commit `.env`; use Vercel env for production.
- API keys stored hashed (`ApiKey`); show plaintext only once at creation.

## Threat model (STRIDE snapshot)

| Threat                 | Mitigation                                |
| ---------------------- | ----------------------------------------- |
| Spoofing               | Session handling, secure cookies          |
| Tampering              | RBAC + audits on critical writes          |
| Repudiation            | Audit logs                                |
| Information disclosure | Tenant-scoped queries, error sanitization |
| DoS                    | Rate limits, pagination                   |
| Elevation              | RBAC checks on every privileged path      |

## Related

- [operations.md](./operations.md) for SMS compliance notes.
