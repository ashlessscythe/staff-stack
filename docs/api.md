# StaffStack — REST API (`/api/v1`)

## Versioning

- URI prefix: **`/api/v1`**.
- Breaking changes require **`/api/v2`** (new prefix); maintain v1 during deprecation window.

## Authentication

- **Session (first-party):** cookie session (not primary for REST clients).
- **API keys (premium):** `Authorization: Bearer <api_key>` when `ApiKey` model and middleware are enabled for the tenant.

## Tenant scoping

Routes include `tenantId` (UUID) in the path unless otherwise noted. The server must verify the caller has access to that tenant (session membership or valid API key).

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
