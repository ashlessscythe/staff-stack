import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantShell: vi.fn(),
  writeAuditLog: vi.fn(),
  prisma: {
    tenant: {
      update: vi.fn(() => Promise.resolve({})),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: hoisted.auth }));
vi.mock("@/server/tenant-context", () => ({
  requireTenantShell: hoisted.requireTenantShell,
}));
vi.mock("@/server/audit", () => ({
  writeAuditLog: hoisted.writeAuditLog,
}));
vi.mock("@/lib/db", () => ({ prisma: hoisted.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateTimeDisplayFormatAction } from "./tenant-settings";

describe("updateTimeDisplayFormatAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "user-1" } });
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWELVE_HOUR" },
      memberships: [{ role: "TENANT_ADMIN", permissions: [] }],
    });
  });

  it("updates tenant time display for admins", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("timeDisplayFormat", "TWENTY_FOUR_HOUR");

    const result = await updateTimeDisplayFormatAction({}, formData);

    expect(result.saved).toBe(true);
    expect(hoisted.prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-1" },
      data: { timeDisplayFormat: "TWENTY_FOUR_HOUR" },
    });
    expect(hoisted.writeAuditLog).toHaveBeenCalled();
  });

  it("rejects users without settings write permission", async () => {
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWELVE_HOUR" },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("timeDisplayFormat", "TWENTY_FOUR_HOUR");

    const result = await updateTimeDisplayFormatAction({}, formData);

    expect(result.error).toBe("Forbidden");
    expect(hoisted.prisma.tenant.update).not.toHaveBeenCalled();
  });
});
