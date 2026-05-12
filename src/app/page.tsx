import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const tu = await prisma.tenantUser.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
    if (tu) {
      redirect(`/t/${tu.tenant.slug}/dashboard`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          StaffStack
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Multi-tenant workforce scheduling. Sign in to open your tenant dashboard.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Sign in
      </Link>
    </div>
  );
}
