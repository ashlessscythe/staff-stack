import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantShell: vi.fn(),
  prisma: {
    shift: { findFirst: vi.fn() },
    shiftAssignment: { upsert: vi.fn() },
    tenantUser: { findUnique: vi.fn() },
  },
  assertUserCanTakeShift: vi.fn(),
  tenantUserIdForUser: vi.fn(),
  writeAuditLog: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
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
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    throw new Error("REDIRECT");
  },
}));

import { assignShiftAction } from "./shifts";

describe("assignShiftAction constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "actor-1" } });
    mocks.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", settings: {} },
      memberships: [{ role: "MANAGER", permissions: [] }],
    });
    mocks.prisma.shift.findFirst.mockResolvedValue({
      id: "shift-1",
      startsAt: new Date(),
      endsAt: new Date(),
      site: { timezone: "America/New_York" },
    });
    mocks.tenantUserIdForUser.mockResolvedValue("tu-1");
    mocks.assertUserCanTakeShift.mockResolvedValue({ violations: [], blocking: [], warnings: [] });
    mocks.prisma.shiftAssignment.upsert.mockResolvedValue({});
  });

  it("calls assertUserCanTakeShift before upsert", async () => {
    await assignShiftAction("acme", "shift-1", "user-1");
    expect(mocks.assertUserCanTakeShift).toHaveBeenCalledWith(
      expect.objectContaining({ tenantUserId: "tu-1", forceAssign: undefined }),
    );
    expect(mocks.prisma.shiftAssignment.upsert).toHaveBeenCalled();
  });

  it("passes forceAssign when provided", async () => {
    await assignShiftAction("acme", "shift-1", "user-1", { forceAssign: true });
    expect(mocks.assertUserCanTakeShift).toHaveBeenCalledWith(
      expect.objectContaining({ forceAssign: true }),
    );
  });
});
