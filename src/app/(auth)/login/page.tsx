import { Suspense } from "react";

import { AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] text-[color:var(--ss-foreground)]">
      <AuthHeader cta={{ href: "/signup", label: "Create account" }} />
      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <Suspense
          fallback={<div className="text-sm text-[color:var(--ss-muted-foreground)]">Loading…</div>}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
