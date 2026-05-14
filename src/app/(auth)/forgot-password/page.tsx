import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { auth } from "@/auth";
import { turnstileSiteKeyForClient } from "@/server/turnstile-verify";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <AuthHeader cta={{ href: "/login", label: "Sign in" }} />
      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <Suspense
          fallback={<div className="text-sm text-[color:var(--ss-muted-foreground)]">Loading…</div>}
        >
          <ForgotPasswordForm turnstileSiteKey={turnstileSiteKeyForClient()} />
        </Suspense>
      </div>
    </div>
  );
}
