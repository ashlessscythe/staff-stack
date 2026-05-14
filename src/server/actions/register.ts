"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendRegistrationPendingEmail } from "@/server/email/transactional";
import { verifyTurnstileOrThrow } from "@/server/turnstile-verify";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  turnstileToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" | "password" | "name" };

export async function registerUserAction(raw: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input.",
      field: field === "email" || field === "password" || field === "name" ? field : undefined,
    };
  }

  const { name, email, password, turnstileToken } = parsed.data;

  const captcha = await verifyTurnstileOrThrow(turnstileToken);
  if (!captcha.ok) {
    return { ok: false, error: captcha.message };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with that email already exists.", field: "email" };
  }

  const argon2 = await import("argon2");
  const passwordHash = await argon2.default.hash(password);

  await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash,
    },
  });

  void sendRegistrationPendingEmail({ to: email, name }).catch((err) => {
    console.warn("[register] registration email failed:", err);
  });

  return { ok: true };
}
