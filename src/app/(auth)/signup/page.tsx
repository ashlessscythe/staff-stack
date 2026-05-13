import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] p-4 text-[color:var(--ss-foreground)]">
      <header className="flex items-center justify-end px-2 pb-6 pt-2">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <Suspense
          fallback={<div className="text-sm text-[color:var(--ss-muted-foreground)]">Loading…</div>}
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
