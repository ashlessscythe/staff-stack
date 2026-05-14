import { Mailbox } from "lucide-react";
import { redirect } from "next/navigation";

import { SignOutForm } from "@/components/auth/sign-out-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccountPendingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/pending");
  }

  const tu = await prisma.tenantUser.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  if (tu) {
    redirect(`/t/${tu.tenant.slug}/dashboard`);
  }

  const email = session.user.email ?? "your email";

  return (
    <div className="relative flex min-h-screen flex-col bg-[color:var(--ss-background)] p-4 text-[color:var(--ss-foreground)]">
      <header className="flex items-center justify-end px-2 pb-6 pt-2">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)]/80 p-8 text-center shadow-[0_8px_40px_var(--ss-glow)] backdrop-blur">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--ss-muted)] text-[color:var(--ss-accent)]">
            <Mailbox className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">You&rsquo;re almost in</h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--ss-muted-foreground)]">
            Your account{" "}
            <span className="font-medium text-[color:var(--ss-foreground)]">{email}</span> is ready,
            but it isn&rsquo;t attached to a workspace yet. StaffStack workspaces are invite-only —
            ask your admin to send you an invite, and your dashboard will appear here automatically.
          </p>
          <SignOutForm
            className="mt-8"
            buttonClassName="inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--ss-border)] bg-[color:var(--ss-surface)] px-5 text-sm font-medium text-[color:var(--ss-foreground)] transition-colors hover:bg-[color:var(--ss-surface-2)]"
          >
            Sign out
          </SignOutForm>
        </div>
      </main>
    </div>
  );
}
