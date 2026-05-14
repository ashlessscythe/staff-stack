import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getResetPasswordTokenState } from "@/server/actions/password-reset";
import { turnstileSiteKeyForClient } from "@/server/turnstile-verify";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawParam = sp.token;
  const raw =
    typeof rawParam === "string" ? rawParam : Array.isArray(rawParam) ? rawParam[0] : undefined;
  const tokenState = await getResetPasswordTokenState(raw);

  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <AuthHeader cta={{ href: "/login", label: "Sign in" }} />
      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <Suspense
          fallback={<div className="text-sm text-[color:var(--ss-muted-foreground)]">Loading…</div>}
        >
          <ResetPasswordForm
            tokenState={tokenState}
            turnstileSiteKey={turnstileSiteKeyForClient()}
          />
        </Suspense>
      </div>
    </div>
  );
}
