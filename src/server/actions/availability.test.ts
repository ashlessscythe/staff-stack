import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantShell: vi.fn(),
  prisma: {
    availabilityRule: {
      create: vi.fn(() => Promise.resolve({ id: "rule-1" })),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
    availabilityException: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: hoisted.auth }));
vi.mock("@/server/tenant-context", () => ({
  requireTenantShell: hoisted.requireTenantShell,
}));
vi.mock("@/lib/db", () => ({ prisma: hoisted.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  addAvailabilityRuleAction,
  deleteAvailabilityRuleAction,
  updateAvailabilityRuleAction,
} from "./availability";

describe("addAvailabilityRuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "user-1" } });
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWELVE_HOUR" },
      tenantUser: { id: "tu-1" },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });
  });

  it("parses 12-hour shorthand into minutes", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("dayOfWeek", "4");
    formData.set("startTime", "9a");
    formData.set("endTime", "10p");

    await addAvailabilityRuleAction(formData);

    expect(hoisted.prisma.availabilityRule.create).toHaveBeenCalledWith({
      data: {
        tenantUserId: "tu-1",
        dayOfWeek: 4,
        startMinute: 9 * 60,
        endMinute: 22 * 60,
      },
    });
  });

  it("parses 12-hour times into minutes", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("dayOfWeek", "1");
    formData.set("startTime", "9am");
    formData.set("endTime", "5pm");

    await addAvailabilityRuleAction(formData);

    expect(hoisted.prisma.availabilityRule.create).toHaveBeenCalledWith({
      data: {
        tenantUserId: "tu-1",
        dayOfWeek: 1,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
      },
    });
  });

  it("parses 24-hour times when tenant uses that format", async () => {
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWENTY_FOUR_HOUR" },
      tenantUser: { id: "tu-1" },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });

    const formData = new FormData();
    formData.set("tenantSlug", "medstaff");
    formData.set("dayOfWeek", "2");
    formData.set("startTime", "0900");
    formData.set("endTime", "1700");

    await addAvailabilityRuleAction(formData);

    expect(hoisted.prisma.availabilityRule.create).toHaveBeenCalledWith({
      data: {
        tenantUserId: "tu-1",
        dayOfWeek: 2,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
      },
    });
  });

  it("rejects end time before start time", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("dayOfWeek", "1");
    formData.set("startTime", "5pm");
    formData.set("endTime", "9am");

    await expect(addAvailabilityRuleAction(formData)).rejects.toThrow(
      "End time must be after start time",
    );
  });
});

describe("updateAvailabilityRuleAction", () => {
  const ruleId = "00000000-0000-4000-8000-000000000099";

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.auth.mockResolvedValue({ user: { id: "user-1" } });
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWELVE_HOUR" },
      tenantUser: { id: "tu-1" },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });
    hoisted.prisma.availabilityRule.findFirst.mockResolvedValue({
      id: ruleId,
      tenantUserId: "tu-1",
    });
  });

  it("updates owned rule", async () => {
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("ruleId", ruleId);
    formData.set("dayOfWeek", "2");
    formData.set("startTime", "10am");
    formData.set("endTime", "6pm");

    await updateAvailabilityRuleAction(formData);

    expect(hoisted.prisma.availabilityRule.update).toHaveBeenCalledWith({
      where: { id: ruleId },
      data: { dayOfWeek: 2, startMinute: 10 * 60, endMinute: 18 * 60 },
    });
  });

  it("rejects update when rule not owned", async () => {
    hoisted.prisma.availabilityRule.findFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("ruleId", ruleId);
    formData.set("dayOfWeek", "1");
    formData.set("startTime", "9am");
    formData.set("endTime", "5pm");

    await expect(updateAvailabilityRuleAction(formData)).rejects.toThrow("Not found");
  });
});

describe("deleteAvailabilityRuleAction", () => {
  it("deletes owned rule", async () => {
    hoisted.auth.mockResolvedValue({ user: { id: "user-1" } });
    hoisted.requireTenantShell.mockResolvedValue({
      tenant: { id: "tenant-1", timeDisplayFormat: "TWELVE_HOUR" },
      tenantUser: { id: "tu-1" },
      memberships: [{ role: "EMPLOYEE", permissions: [] }],
    });

    const formData = new FormData();
    formData.set("tenantSlug", "acme");
    formData.set("ruleId", "00000000-0000-4000-8000-000000000099");

    await deleteAvailabilityRuleAction(formData);

    expect(hoisted.prisma.availabilityRule.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "00000000-0000-4000-8000-000000000099",
        tenantUserId: "tu-1",
      },
    });
  });
});
