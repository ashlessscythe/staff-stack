import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SwapConstraintSummary } from "@/server/scheduling/swap-constraint-summary";
import { SwapAcceptControls } from "@/components/swaps/swap-accept-controls";
import {
  approveSwapFormAction,
  cancelSwapFormAction,
  denySwapFormAction,
} from "@/server/actions/swaps";

export type SwapCardData = {
  id: string;
  status: string;
  message: string | null;
  fromShift: { title: string; startsAt: Date };
  toShift: { title: string; startsAt: Date };
  requesterEmail: string;
  targetEmail: string;
};

function formatShiftLine(shift: { title: string; startsAt: Date }) {
  return `${shift.title} · ${shift.startsAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function ConstraintSummaryBlock({ summary }: { summary: SwapConstraintSummary }) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/80 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">Scheduling constraints</p>
      <ul className="space-y-1">
        <li>
          <span className="text-zinc-500">Requester:</span>{" "}
          {summary.requesterLeg.blocking.length > 0
            ? summary.requesterLeg.blocking.map((b) => b.message).join("; ")
            : summary.requesterLeg.warnings.length > 0
              ? summary.requesterLeg.warnings.map((w) => w.message).join("; ")
              : "OK"}
        </li>
        <li>
          <span className="text-zinc-500">Target:</span>{" "}
          {summary.targetLeg.blocking.length > 0
            ? summary.targetLeg.blocking.map((b) => b.message).join("; ")
            : summary.targetLeg.warnings.length > 0
              ? summary.targetLeg.warnings.map((w) => w.message).join("; ")
              : "OK"}
        </li>
      </ul>
    </div>
  );
}

export function SwapRequestCard({
  swap,
  tenantSlug,
  showAcceptDecline,
  showCancel,
  showApproveDeny,
  constraintSummary,
}: {
  swap: SwapCardData;
  tenantSlug: string;
  showAcceptDecline?: boolean;
  showCancel?: boolean;
  showApproveDeny?: boolean;
  constraintSummary?: SwapConstraintSummary;
}) {
  const approveBlocked = constraintSummary?.hasBlocking ?? false;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{swap.status.replace(/_/g, " ")}</CardTitle>
        <CardDescription>
          {swap.requesterEmail} ↔ {swap.targetEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-zinc-500">Giving up:</span> {formatShiftLine(swap.fromShift)}
          </p>
          <p>
            <span className="text-zinc-500">Taking:</span> {formatShiftLine(swap.toShift)}
          </p>
          {swap.message ? (
            <p className="text-zinc-600 dark:text-zinc-400">&ldquo;{swap.message}&rdquo;</p>
          ) : null}
        </div>
        {constraintSummary && showApproveDeny && (
          <ConstraintSummaryBlock summary={constraintSummary} />
        )}
        <div className="flex flex-wrap gap-2">
          {showAcceptDecline && constraintSummary && (
            <SwapAcceptControls
              tenantSlug={tenantSlug}
              swapId={swap.id}
              targetLeg={constraintSummary.targetLeg}
            />
          )}
          {showCancel && (
            <form action={cancelSwapFormAction}>
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="swapId" value={swap.id} />
              <Button type="submit" size="sm" variant="outline">
                Cancel request
              </Button>
            </form>
          )}
          {showApproveDeny && (
            <>
              <form action={approveSwapFormAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <input type="hidden" name="swapId" value={swap.id} />
                <Button type="submit" size="sm" disabled={approveBlocked}>
                  Approve
                </Button>
              </form>
              <form action={denySwapFormAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <input type="hidden" name="swapId" value={swap.id} />
                <Button type="submit" size="sm" variant="outline">
                  Deny
                </Button>
              </form>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SwapsEmptyHint({ tenantSlug }: { tenantSlug: string }) {
  return (
    <p className="text-sm text-zinc-500">
      No swaps here. Request a swap from your assigned shifts on the{" "}
      <Link href={`/t/${tenantSlug}/schedule`} className="underline hover:text-zinc-700">
        schedule
      </Link>
      .
    </p>
  );
}
