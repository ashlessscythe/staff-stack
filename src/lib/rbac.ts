import type { RoleKey } from "@prisma/client";

/** Fine-grained permission strings evaluated server-side. */
export const PERMISSIONS = {
  "tenant:settings:read": true,
  "tenant:settings:write": true,
  "site:structure:write": true,
  "shift:read": true,
  "shift:write": true,
  "assignment:write": true,
  "swap:approve": true,
  "swap:request": true,
  "availability:write:self": true,
  "audit:read": true,
  "api:key:manage": true,
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ROLE_DEFAULTS: Record<RoleKey, Permission[]> = {
  SUPER_ADMIN: Object.keys(PERMISSIONS) as Permission[],
  TENANT_ADMIN: [
    "tenant:settings:read",
    "tenant:settings:write",
    "site:structure:write",
    "shift:read",
    "shift:write",
    "assignment:write",
    "swap:approve",
    "swap:request",
    "availability:write:self",
    "audit:read",
    "api:key:manage",
  ],
  SITE_ADMIN: [
    "tenant:settings:read",
    "site:structure:write",
    "shift:read",
    "shift:write",
    "assignment:write",
    "swap:approve",
    "swap:request",
    "availability:write:self",
    "audit:read",
  ],
  MANAGER: [
    "tenant:settings:read",
    "shift:read",
    "shift:write",
    "assignment:write",
    "swap:approve",
    "swap:request",
    "availability:write:self",
  ],
  SCHEDULER: [
    "tenant:settings:read",
    "shift:read",
    "shift:write",
    "assignment:write",
    "swap:approve",
    "swap:request",
    "availability:write:self",
  ],
  EMPLOYEE: ["shift:read", "swap:request", "availability:write:self"],
  VIEWER: ["shift:read"],
};

export function permissionsForRole(role: RoleKey, overrides: string[]): Permission[] {
  const base = new Set<Permission>(ROLE_DEFAULTS[role] ?? []);
  for (const p of overrides) {
    if (p.startsWith("-")) base.delete(p.slice(1) as Permission);
    else if (p in PERMISSIONS) base.add(p as Permission);
  }
  return [...base];
}

export function hasPermission(granted: Permission[], required: Permission): boolean {
  return granted.includes(required);
}

export function tenantFeatures(features: unknown): Record<string, boolean> {
  if (features && typeof features === "object" && !Array.isArray(features)) {
    return features as Record<string, boolean>;
  }
  return {};
}

export function isFeatureEnabled(features: unknown, key: string, defaultValue = false): boolean {
  const f = tenantFeatures(features);
  return f[key] ?? defaultValue;
}
