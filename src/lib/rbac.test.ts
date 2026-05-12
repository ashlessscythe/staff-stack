import { describe, expect, it } from "vitest";

import { hasPermission, permissionsForRole } from "@/lib/rbac";

describe("rbac", () => {
  it("grants shift:write to MANAGER", () => {
    const p = permissionsForRole("MANAGER", []);
    expect(hasPermission(p, "shift:write")).toBe(true);
  });

  it("denies shift:write to EMPLOYEE", () => {
    const p = permissionsForRole("EMPLOYEE", []);
    expect(hasPermission(p, "shift:write")).toBe(false);
  });
});
