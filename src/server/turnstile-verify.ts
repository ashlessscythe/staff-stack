import { env } from "@/lib/env";

export function isTurnstileEnabled(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

type SiteverifyJson = { success?: boolean; [key: string]: unknown };

/**
 * When Turnstile is configured, verifies the token with Cloudflare.
 * Returns ok: true when Turnstile is not configured (local dev).
 */
export async function verifyTurnstileOrThrow(
  token: string | undefined,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }
  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, message: "Please complete the security check." };
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  const body = new URLSearchParams({ secret: secret!, response: trimmed });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  let data: SiteverifyJson = {};
  try {
    data = (await res.json()) as SiteverifyJson;
  } catch {
    return { ok: false, message: "Security check failed. Please try again." };
  }

  if (!data.success) {
    return { ok: false, message: "Security check failed. Please try again." };
  }

  return { ok: true };
}

/** Site key for the browser widget only when server verification is also configured. */
export function turnstileSiteKeyForClient(): string | undefined {
  return env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    : undefined;
}
