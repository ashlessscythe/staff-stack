import { prisma } from "@/lib/db";

export async function getActionableSwapCount(
  tenantId: string,
  userId: string,
  canApprove: boolean,
  canRequest: boolean,
): Promise<{ count: number; hrefSuffix: string; description: string }> {
  if (canApprove) {
    const count = await prisma.shiftSwap.count({
      where: { tenantId, status: "PENDING_APPROVAL" },
    });
    return {
      count,
      hrefSuffix: "#awaiting-approval",
      description: "Review on Swaps →",
    };
  }

  if (canRequest) {
    const count = await prisma.shiftSwap.count({
      where: {
        tenantId,
        status: "REQUESTED",
        targetAssignment: { userId },
      },
    });
    return {
      count,
      hrefSuffix: "#needs-response",
      description: count > 0 ? "Respond on Swaps →" : "View swaps →",
    };
  }

  const count = await prisma.shiftSwap.count({
    where: {
      tenantId,
      status: { in: ["REQUESTED", "PENDING_APPROVAL"] },
      OR: [{ requesterAssignment: { userId } }, { targetAssignment: { userId } }],
    },
  });
  return {
    count,
    hrefSuffix: "",
    description: "View on Swaps →",
  };
}
