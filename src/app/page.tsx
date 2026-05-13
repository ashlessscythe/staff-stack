import { redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/landing-page";
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
    redirect("/account/pending");
  }

  return <LandingPage />;
}
