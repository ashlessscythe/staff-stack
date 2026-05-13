import type { RoleKey } from "@prisma/client";

const LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super admin",
  TENANT_ADMIN: "Tenant admin",
  SITE_ADMIN: "Site admin",
  MANAGER: "Manager",
  SCHEDULER: "Scheduler",
  EMPLOYEE: "Employee",
  VIEWER: "Viewer",
};

export function roleKeyLabel(role: RoleKey): string {
  return LABELS[role] ?? role;
}
