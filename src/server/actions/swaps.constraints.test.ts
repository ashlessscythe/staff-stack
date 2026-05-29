import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantShell: vi.fn(),
  prisma: {
    shiftAssignment: { findFirst: vi.fn() },
    shiftSwap: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  assertUserCanTakeShift: vi.fn(),
  tenantUserIdForUser: vi.fn(),
  writeAuditLog: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/tenant-context", () => ({
  requireTenantShell: mocks.requireTenantShell,
}));
vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/server/scheduling/assert-user-can-take-shift", () => ({
  assertUserCanTakeShift: mocks.assertUserCanTakeShift,
  SchedulingConstraintError: class SchedulingConstraintError extends Error {
    violations = [];
  },
}));
vi.mock("@/server/scheduling/constraint-context", () => ({
  tenantUserIdForUser: mocks.tenantUserIdForUser,
}));
vi.mock("@/server/audit", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("REDIRECT");
  },
}));

import { requestSwapFormAction } from "./swaps";

describe("requestSwapFormAction constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "req-user" } });
    mocks.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", settings: {} },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });
    const future = new Date(Date.now() + 86400000);
    mocks.prisma.shiftAssignment.findFirst
      .mockResolvedValueOnce({
        id: "a-req",
        userId: "req-user",
        shiftId: "s1",
        shift: {
          status: "PUBLISHED",
          startsAt: future,
          site: { timezone: "America/New_York" },
        },
      })
      .mockResolvedValueOnce({
        id: "a-tgt",
        userId: "tgt-user",
        shiftId: "s2",
        shift: {
          status: "PUBLISHED",
          startsAt: future,
          endsAt: future,
          site: { timezone: "America/New_York" },
        },
      });
    mocks.prisma.shiftSwap.findFirst.mockResolvedValue(null);
    mocks.tenantUserIdForUser.mockResolvedValue("tu-req");
    mocks.assertUserCanTakeShift.mockResolvedValue({ violations: [], blocking: [], warnings: [] });
    mocks.prisma.shiftSwap.create.mockResolvedValue({ id: "swap-1" });
  });

  it("validates requester against target shift before create", async () => {
    const fd = new FormData();
    fd.set("tenantSlug", "acme");
    fd.set("requesterAssignmentId", "00000000-0000-4000-8000-000000000001");
    fd.set("targetAssignmentId", "00000000-0000-4000-8000-000000000002");
    await requestSwapFormAction(fd);
    expect(mocks.assertUserCanTakeShift).toHaveBeenCalled();
    expect(mocks.prisma.shiftSwap.create).toHaveBeenCalled();
  });
});
