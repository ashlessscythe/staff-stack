import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { turnstileSiteKeyForClient } from "@/server/turnstile-verify";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <AuthHeader cta={{ href: "/login", label: "Sign in" }} />
      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <Suspense
          fallback={<div className="text-sm text-[color:var(--ss-muted-foreground)]">Loading…</div>}
        >
          <ResetPasswordForm turnstileSiteKey={turnstileSiteKeyForClient()} />
        </Suspense>
      </div>
    </div>
  );
}
