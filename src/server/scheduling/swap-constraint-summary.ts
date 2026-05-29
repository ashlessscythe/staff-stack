import type { ConstraintHintSummary } from "@/components/schedule/constraint-hints";

import { hintForShift } from "./build-hints";
import { loadConstraintContextBatch, tenantUserIdForUser } from "./constraint-context";

export type SwapConstraintSummary = {
  requesterLeg: ConstraintHintSummary & { label: string };
  targetLeg: ConstraintHintSummary & { label: string };
  hasBlocking: boolean;
};

type SwapRow = {
  id: string;
  requesterAssignment: { userId: string };
  targetAssignment: { userId: string } | null;
  fromShift: { startsAt: Date; endsAt: Date; site: { timezone: string } };
  toShift: { startsAt: Date; endsAt: Date; site: { timezone: string } };
};

export async function buildSwapConstraintSummaries(
  tenantId: string,
  swaps: SwapRow[],
  tenantSettings: unknown,
): Promise<Record<string, SwapConstraintSummary>> {
  const userIds = new Set<string>();
  for (const s of swaps) {
    userIds.add(s.requesterAssignment.userId);
    if (s.targetAssignment) userIds.add(s.targetAssignment.userId);
  }

  const tuIds: string[] = [];
  const tuByUserId = new Map<string, string>();
  for (const uid of userIds) {
    const tuId = await tenantUserIdForUser(tenantId, uid);
    if (tuId) {
      tuIds.push(tuId);
      tuByUserId.set(uid, tuId);
    }
  }

  const contextBatch = await loadConstraintContextBatch(tuIds);
  const out: Record<string, SwapConstraintSummary> = {};

  for (const swap of swaps) {
    if (!swap.targetAssignment) continue;
    const reqTu = tuByUserId.get(swap.requesterAssignment.userId);
    const tgtTu = tuByUserId.get(swap.targetAssignment.userId);
    if (!reqTu || !tgtTu) continue;

    const requesterLeg = {
      label: "Requester taking target shift",
      ...hintForShift(swap.toShift, contextBatch.get(reqTu)!, tenantSettings),
    };
    const targetLeg = {
      label: "Target taking requester shift",
      ...hintForShift(swap.fromShift, contextBatch.get(tgtTu)!, tenantSettings),
    };
    const hasBlocking = requesterLeg.blocking.length > 0 || targetLeg.blocking.length > 0;
    out[swap.id] = { requesterLeg, targetLeg, hasBlocking };
  }

  return out;
}
