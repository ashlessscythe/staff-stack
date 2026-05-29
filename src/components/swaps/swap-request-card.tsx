import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acceptSwapFormAction,
  approveSwapFormAction,
  cancelSwapFormAction,
  declineSwapFormAction,
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

export function SwapRequestCard({
  swap,
  tenantSlug,
  showAcceptDecline,
  showCancel,
  showApproveDeny,
}: {
  swap: SwapCardData;
  tenantSlug: string;
  showAcceptDecline?: boolean;
  showCancel?: boolean;
  showApproveDeny?: boolean;
}) {
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
        <div className="flex flex-wrap gap-2">
          {showAcceptDecline && (
            <>
              <form action={acceptSwapFormAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <input type="hidden" name="swapId" value={swap.id} />
                <Button type="submit" size="sm">
                  Accept
                </Button>
              </form>
              <form action={declineSwapFormAction}>
                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                <input type="hidden" name="swapId" value={swap.id} />
                <Button type="submit" size="sm" variant="outline">
                  Decline
                </Button>
              </form>
            </>
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
                <Button type="submit" size="sm">
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
