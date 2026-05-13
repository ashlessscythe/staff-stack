"use server";

import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { absoluteUrl } from "@/lib/app-origin";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/server/audit";
import { sendPasswordResetEmail } from "@/server/email/transactional";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const completeSchema = z.object({
  token: z.string().min(64).max(64),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

const RESET_TTL_MS = 60 * 60 * 1000;

export type PasswordResetRequestResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" };

/**
 * Always returns ok on valid-shaped email to avoid account enumeration.
 */
export async function requestPasswordResetAction(
  raw: unknown,
): Promise<PasswordResetRequestResult> {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid email.", field: "email" };
  }
  const email = parsed.data.email;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { ok: true };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const resetUrl = `${absoluteUrl("/reset-password")}?token=${rawToken}`;
  const result = await sendPasswordResetEmail({ to: user.email, resetUrl });
  const emailSkipped = "skipped" in result && result.skipped;
  if (emailSkipped) {
    console.warn("[password-reset] email skipped (RESEND_API_KEY missing); token still created");
  }

  await writeAuditLog({
    tenantId: null,
    actorUserId: user.id,
    action: "auth.password_reset_requested",
    entityType: "User",
    entityId: user.id,
    metadata: { emailDelivery: emailSkipped ? "skipped" : "sent" },
  });

  return { ok: true };
}

export type PasswordResetCompleteResult =
  | { ok: true }
  | { ok: false; error: string; field?: "password" | "token" };

export async function completePasswordResetAction(
  raw: unknown,
): Promise<PasswordResetCompleteResult> {
  const parsed = completeSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input.",
      field: field === "password" || field === "token" ? field : undefined,
    };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashResetToken(token);

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!row || row.expiresAt < new Date()) {
    return { ok: false, error: "This reset link is invalid or has expired.", field: "token" };
  }

  const argon2 = await import("argon2");
  const passwordHash = await argon2.default.hash(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);

  await writeAuditLog({
    tenantId: null,
    actorUserId: row.userId,
    action: "auth.password_reset_completed",
    entityType: "User",
    entityId: row.userId,
    metadata: {},
  });

  return { ok: true };
}
