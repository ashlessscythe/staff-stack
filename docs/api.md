# StaffStack — REST API (`/api/v1`)

## Versioning

- URI prefix: **`/api/v1`**.
- Breaking changes require **`/api/v2`** (new prefix); maintain v1 during deprecation window.

## Authentication

Tenant routes accept **either** of the following:

1. **Bearer API key (integrations, scripts):**
   - Header: `Authorization: Bearer ssk_<secret>` (full token string; only values with the `ssk_` prefix are treated as API keys).
   - The server stores `SHA-256(utf8(full_token))` and looks up `ApiKey` by `hashedKey` (same algorithm as key creation in the admin UI).
   - The key’s `tenantId` must match the `tenantId` path segment; optional `expiresAt` is enforced.
   - Requires the tenant **premium** feature `apiKeys` (same gate as creating keys in-app). If the feature is off, valid-looking keys still receive `403`.

2. **Session (browser / first-party):** NextAuth session cookie. The user must have an active `TenantUser` row for the path `tenantId`.

If there is no `Authorization: Bearer ssk_…` header, the handler uses **session only**. If a client sends `Bearer ssk_…` and the key is invalid or expired, the server returns **401** (it does not fall back to the session cookie for that request).

## Tenant scoping

Routes include `tenantId` (UUID) in the path unless otherwise noted. The server verifies access with the rules above (active tenant membership for session, or a valid non-expired API key for the same tenant).

## Error envelope

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {}
  }
}
```

## Pagination

- Cursor style: `?cursor=<opaque>&limit=50` (implementation may use offset for MVP; document chosen strategy).

## Example routes

| Method | Path                                                 | Description          |
| ------ | ---------------------------------------------------- | -------------------- |
| GET    | `/api/v1/tenants/:tenantId/sites`                    | List sites           |
| GET    | `/api/v1/tenants/:tenantId/shifts?siteId=&from=&to=` | List shifts in range |
| POST   | `/api/v1/tenants/:tenantId/shifts`                   | Create shift         |
| PATCH  | `/api/v1/tenants/:tenantId/shifts/:shiftId`          | Update shift         |
| POST   | `/api/v1/tenants/:tenantId/shifts/:shiftId/publish`  | Publish shift        |
| GET    | `/api/v1/tenants/:tenantId/assignments?userId=`      | List assignments     |

## Example create shift payload

```json
{
  "siteId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Floor Coverage",
  "startsAt": "2026-05-15T12:00:00.000Z",
  "endsAt": "2026-05-15T20:00:00.000Z",
  "status": "DRAFT"
}
```

## Rate limiting

Apply stricter limits to unauthenticated and API-key routes; per-tenant quotas for expensive operations (documented in implementation).
