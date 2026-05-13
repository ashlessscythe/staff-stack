import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/rbac";

export type TenantApiAuth =
  | { kind: "session"; userId: string }
  | { kind: "apikey"; apiKeyId: string };

function jsonError(status: 401 | 403, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message, details: {} } }, { status });
}

/** Raw token from `Authorization: Bearer …` when caller intends API key auth (`ssk_` prefix). */
function bearerApiKeyToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  if (!m?.[1]) return null;
  const token = m[1].trim();
  if (!token.startsWith("ssk_")) return null;
  return token;
}

async function assertActiveTenantUser(userId: string, tenantId: string): Promise<boolean> {
  const tu = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  return Boolean(tu?.isActive);
}

/**
 * Authenticates GET/POST/etc. on `/api/v1/tenants/:tenantId/*`:
 * - `Authorization: Bearer ssk_…` → SHA-256 hash lookup (`ApiKey`), tenant match, expiry, feature flag.
 * - Otherwise → session cookie (NextAuth); active `TenantUser` for `tenantId`.
 */
export async function authenticateTenantApiRequest(
  req: Request,
  tenantId: string,
): Promise<{ ok: true; auth: TenantApiAuth } | { ok: false; response: NextResponse }> {
  const bearerToken = bearerApiKeyToken(req);

  if (bearerToken) {
    const hashedKey = crypto.createHash("sha256").update(bearerToken).digest("hex");
    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey },
      include: { tenant: { select: { id: true, features: true } } },
    });

    if (!apiKey) {
      return { ok: false, response: jsonError(401, "UNAUTHORIZED", "Invalid API key") };
    }

    if (apiKey.tenantId !== tenantId) {
      return { ok: false, response: jsonError(403, "FORBIDDEN", "API key does not match tenant") };
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      return { ok: false, response: jsonError(401, "UNAUTHORIZED", "API key expired") };
    }

    if (!isFeatureEnabled(apiKey.tenant.features, "apiKeys", false)) {
      return {
        ok: false,
        response: jsonError(403, "FORBIDDEN", "API keys are disabled for this tenant"),
      };
    }

    void prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return { ok: true, auth: { kind: "apikey", apiKeyId: apiKey.id } };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHORIZED", "Sign in or provide Bearer API key"),
    };
  }

  const allowed = await assertActiveTenantUser(session.user.id, tenantId);
  if (!allowed) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", "Tenant access denied") };
  }

  return { ok: true, auth: { kind: "session", userId: session.user.id } };
}
