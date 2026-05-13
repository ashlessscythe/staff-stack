import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  writeAuditLog: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(() => Promise.resolve({})),
    },
    passwordResetToken: {
      deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
      create: vi.fn(() => Promise.resolve({ id: "1" })),
      findUnique: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: hoisted.prisma }));
vi.mock("@/server/email/transactional", () => ({
  sendPasswordResetEmail: hoisted.sendPasswordResetEmail,
}));
vi.mock("@/server/audit", () => ({
  writeAuditLog: hoisted.writeAuditLog,
}));
vi.mock("@/lib/app-origin", () => ({
  absoluteUrl: (p: string) => `https://test.local${p}`,
}));

vi.mock("argon2", () => ({
  default: { hash: vi.fn().mockResolvedValue("argon-mock-hash"), verify: vi.fn() },
}));

import { completePasswordResetAction, requestPasswordResetAction } from "./password-reset";

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.sendPasswordResetEmail.mockResolvedValue({ ok: true });
  });

  it("rejects invalid email shape", async () => {
    const res = await requestPasswordResetAction({ email: "nope" });
    expect(res).toEqual({ ok: false, error: expect.any(String), field: "email" });
    expect(hoisted.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(hoisted.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(hoisted.writeAuditLog).not.toHaveBeenCalled();
  });

  it("returns ok without side effects when user is unknown", async () => {
    hoisted.prisma.user.findUnique.mockResolvedValue(null);
    const res = await requestPasswordResetAction({ email: "missing@example.com" });
    expect(res).toEqual({ ok: true });
    expect(hoisted.prisma.$transaction).not.toHaveBeenCalled();
    expect(hoisted.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(hoisted.writeAuditLog).not.toHaveBeenCalled();
  });

  it("returns ok without email when user has no password (OAuth-only)", async () => {
    hoisted.prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "oauth@example.com",
      passwordHash: null,
    });
    const res = await requestPasswordResetAction({ email: "oauth@example.com" });
    expect(res).toEqual({ ok: true });
    expect(hoisted.prisma.$transaction).not.toHaveBeenCalled();
    expect(hoisted.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates token, sends email, and writes audit for credential users", async () => {
    hoisted.prisma.user.findUnique.mockResolvedValue({
      id: "user-uuid-1",
      email: "member@example.com",
      passwordHash: "existing",
    });
    const res = await requestPasswordResetAction({ email: "member@example.com" });
    expect(res).toEqual({ ok: true });
    expect(hoisted.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(hoisted.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const arg = hoisted.sendPasswordResetEmail.mock.calls[0][0];
    expect(arg.to).toBe("member@example.com");
    expect(arg.resetUrl).toMatch(/^https:\/\/test\.local\/reset-password\?token=[a-f0-9]{64}$/);

    expect(hoisted.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: null,
        actorUserId: "user-uuid-1",
        action: "auth.password_reset_requested",
        entityType: "User",
        entityId: "user-uuid-1",
        metadata: { emailDelivery: "sent" },
      }),
    );
  });

  it("records skipped delivery in audit when Resend is unavailable", async () => {
    hoisted.prisma.user.findUnique.mockResolvedValue({
      id: "user-uuid-2",
      email: "member2@example.com",
      passwordHash: "existing",
    });
    hoisted.sendPasswordResetEmail.mockResolvedValue({ skipped: true });
    const res = await requestPasswordResetAction({ email: "member2@example.com" });
    expect(res).toEqual({ ok: true });
    expect(hoisted.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { emailDelivery: "skipped" },
      }),
    );
  });
});

describe("completePasswordResetAction", () => {
  const userId = "00000000-0000-4000-8000-000000000099";
  const rawToken = "aa".repeat(32);
  const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.prisma.passwordResetToken.findUnique.mockImplementation(
      (args: { where: { tokenHash: string } }) => {
        if (args.where.tokenHash !== tokenHash) return Promise.resolve(null);
        return Promise.resolve({
          userId,
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: userId, email: "u@example.com" },
        });
      },
    );
  });

  it("rejects short password", async () => {
    const res = await completePasswordResetAction({ token: rawToken, password: "short" });
    expect(res.ok).toBe(false);
    expect(hoisted.prisma.$transaction).not.toHaveBeenCalled();
    expect(hoisted.writeAuditLog).not.toHaveBeenCalled();
  });

  it("rejects invalid token", async () => {
    const res = await completePasswordResetAction({
      token: "bb".repeat(32),
      password: "longenough",
    });
    expect(res).toEqual({
      ok: false,
      error: "This reset link is invalid or has expired.",
      field: "token",
    });
    expect(hoisted.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects expired token", async () => {
    hoisted.prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: userId, email: "u@example.com" },
    });
    const res = await completePasswordResetAction({ token: rawToken, password: "longenough1" });
    expect(res.ok).toBe(false);
    expect(hoisted.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("updates password, clears tokens and sessions, and audits", async () => {
    const res = await completePasswordResetAction({ token: rawToken, password: "longenough1" });
    expect(res).toEqual({ ok: true });
    expect(hoisted.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(hoisted.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { passwordHash: "argon-mock-hash" },
      }),
    );
    expect(hoisted.prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(hoisted.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(hoisted.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: null,
        actorUserId: userId,
        action: "auth.password_reset_completed",
        entityType: "User",
        entityId: userId,
      }),
    );
  });
});
