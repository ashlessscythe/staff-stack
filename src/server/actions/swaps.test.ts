import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantShell: vi.fn(),
  writeAuditLog: vi.fn(),
  prisma: {
    shiftAssignment: {
      findFirst: vi.fn(),
    },
    shiftSwap: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: hoisted.auth }));
vi.mock("@/server/tenant-context", () => ({
  requireTenantShell: hoisted.requireTenantShell,
}));
vi.mock("@/lib/db", () => ({ prisma: hoisted.prisma }));
vi.mock("@/server/audit", () => ({ writeAuditLog: hoisted.writeAuditLog }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { acceptSwapFormAction, approveSwapFormAction, requestSwapFormAction } from "./swaps";

const shell = {
  tenant: { id: "tenant-1" },
  tenantUser: { id: "tu-1", userId: "user-1" },
  memberships: [{ role: "EMPLOYEE", permissions: [] }],
};

const managerShell = {
  tenant: { id: "tenant-1" },
  tenantUser: { id: "tu-mgr", userId: "mgr-1" },
  memberships: [{ role: "MANAGER", permissions: [] }],
};

const REQ_ASSIGN = "00000000-0000-4000-8000-000000000101";
const TGT_ASSIGN = "00000000-0000-4000-8000-000000000102";
const SHIFT_A = "00000000-0000-4000-8000-000000000201";
const SHIFT_B = "00000000-0000-4000-8000-000000000202";
const SWAP_ID = "00000000-0000-4000-8000-000000000301";

describe("requestSwapFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "user-1" } });
    hoisted.requireTenantShell.mockResolvedValue(shell);
    hoisted.prisma.shiftSwap.findFirst.mockResolvedValue(null);
    hoisted.prisma.shiftAssignment.findFirst
      .mockResolvedValueOnce({
        id: REQ_ASSIGN,
        userId: "user-1",
        shiftId: SHIFT_A,
        shift: { id: SHIFT_A, status: "PUBLISHED", startsAt: new Date(Date.now() + 86400000) },
      })
      .mockResolvedValueOnce({
        id: TGT_ASSIGN,
        userId: "user-2",
        shiftId: SHIFT_B,
        shift: { id: SHIFT_B, status: "PUBLISHED", startsAt: new Date(Date.now() + 172800000) },
      });
    hoisted.prisma.shiftSwap.create.mockResolvedValue({ id: SWAP_ID });
  });

  it("creates a REQUESTED swap for valid peer assignments", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("requesterAssignmentId", REQ_ASSIGN);
    formData.set("targetAssignmentId", TGT_ASSIGN);
    formData.set("message", "Family event");

    await requestSwapFormAction(formData);

    expect(hoisted.prisma.shiftSwap.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        status: "REQUESTED",
        requesterAssignmentId: REQ_ASSIGN,
        targetAssignmentId: TGT_ASSIGN,
        fromShiftId: SHIFT_A,
        toShiftId: SHIFT_B,
        message: "Family event",
      }),
    });
    expect(hoisted.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "swap.request" }),
    );
  });

  it("rejects self-swap", async () => {
    hoisted.prisma.shiftAssignment.findFirst.mockReset();
    hoisted.prisma.shiftAssignment.findFirst
      .mockResolvedValueOnce({
        id: REQ_ASSIGN,
        userId: "user-1",
        shiftId: SHIFT_A,
        shift: { id: SHIFT_A, status: "PUBLISHED", startsAt: new Date(Date.now() + 86400000) },
      })
      .mockResolvedValueOnce({
        id: TGT_ASSIGN,
        userId: "user-1",
        shiftId: SHIFT_B,
        shift: { id: SHIFT_B, status: "PUBLISHED", startsAt: new Date(Date.now() + 172800000) },
      });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("requesterAssignmentId", REQ_ASSIGN);
    formData.set("targetAssignmentId", TGT_ASSIGN);

    await expect(requestSwapFormAction(formData)).rejects.toThrow("Cannot swap with yourself");
  });

  it("rejects when an active swap already exists", async () => {
    hoisted.prisma.shiftSwap.findFirst.mockResolvedValue({ id: "existing" });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("requesterAssignmentId", REQ_ASSIGN);
    formData.set("targetAssignmentId", TGT_ASSIGN);

    await expect(requestSwapFormAction(formData)).rejects.toThrow(
      "An active swap already exists for one of these assignments",
    );
  });
});

describe("acceptSwapFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "user-2" } });
    hoisted.requireTenantShell.mockResolvedValue(shell);
  });

  it("moves swap to PENDING_APPROVAL", async () => {
    hoisted.prisma.shiftSwap.findFirst.mockResolvedValue({
      id: SWAP_ID,
      targetAssignment: { userId: "user-2" },
    });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("swapId", SWAP_ID);

    await acceptSwapFormAction(formData);

    expect(hoisted.prisma.shiftSwap.update).toHaveBeenCalledWith({
      where: { id: SWAP_ID },
      data: { status: "PENDING_APPROVAL" },
    });
  });
});

describe("approveSwapFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "mgr-1" } });
    hoisted.requireTenantShell.mockResolvedValue(managerShell);
    hoisted.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        shiftAssignment: { update: vi.fn() },
        shiftSwap: { update: vi.fn() },
      };
      await fn(tx);
      return tx;
    });
  });

  it("requires PENDING_APPROVAL status", async () => {
    hoisted.prisma.shiftSwap.findFirst.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("swapId", SWAP_ID);

    await expect(approveSwapFormAction(formData)).rejects.toThrow("Invalid swap");
  });

  it("swaps assignment user ids on approve", async () => {
    hoisted.prisma.shiftSwap.findFirst.mockResolvedValue({
      id: SWAP_ID,
      requesterAssignmentId: REQ_ASSIGN,
      targetAssignmentId: TGT_ASSIGN,
      requesterAssignment: { userId: "user-1" },
      targetAssignment: { userId: "user-2" },
    });

    const txUpdates: { where: { id: string }; data: { userId: string } }[] = [];
    hoisted.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        shiftAssignment: {
          update: vi.fn((args: { where: { id: string }; data: { userId: string } }) => {
            txUpdates.push(args);
          }),
        },
        shiftSwap: { update: vi.fn() },
      };
      await fn(tx);
    });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("swapId", SWAP_ID);

    await approveSwapFormAction(formData);

    expect(txUpdates).toEqual([
      { where: { id: REQ_ASSIGN }, data: { userId: "user-2" } },
      { where: { id: TGT_ASSIGN }, data: { userId: "user-1" } },
    ]);
  });
});
