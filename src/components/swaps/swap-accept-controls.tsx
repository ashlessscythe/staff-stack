"use client";

import { useState } from "react";

import type { ConstraintHintSummary } from "@/components/schedule/constraint-hints";
import { Button } from "@/components/ui/button";
import { acceptSwapFormAction, declineSwapFormAction } from "@/server/actions/swaps";

function LegHints({ label, hint }: { label: string; hint: ConstraintHintSummary }) {
  if (hint.blocking.length === 0 && hint.warnings.length === 0) return null;
  return (
    <div className="text-xs">
      <span className="font-medium text-zinc-600 dark:text-zinc-400">{label}:</span>
      <ul className="mt-0.5 list-inside list-disc">
        {hint.blocking.map((b) => (
          <li key={b.code} className="text-red-700 dark:text-red-400">
            {b.message}
          </li>
        ))}
        {hint.warnings.map((w) => (
          <li key={w.code} className="text-amber-800 dark:text-amber-300">
            {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SwapAcceptControls({
  tenantSlug,
  swapId,
  targetLeg,
}: {
  tenantSlug: string;
  swapId: string;
  targetLeg: ConstraintHintSummary;
}) {
  const [acknowledge, setAcknowledge] = useState(false);
  const hasBlocking = targetLeg.blocking.length > 0;
  const hasWarnings = targetLeg.warnings.length > 0;

  return (
    <div className="space-y-2">
      <LegHints label="Your shift after accept" hint={targetLeg} />
      <div className="flex flex-wrap items-center gap-2">
        <form action={acceptSwapFormAction} className="inline">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="swapId" value={swapId} />
          {acknowledge && <input type="hidden" name="acknowledgeConstraints" value="1" />}
          {hasWarnings && !hasBlocking && (
            <label className="mr-2 inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
              <input
                type="checkbox"
                checked={acknowledge}
                onChange={(e) => setAcknowledge(e.target.checked)}
              />
              Acknowledge warnings
            </label>
          )}
          <Button type="submit" size="sm" disabled={hasBlocking}>
            Accept
          </Button>
        </form>
        <form action={declineSwapFormAction} className="inline">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="swapId" value={swapId} />
          <Button type="submit" size="sm" variant="outline">
            Decline
          </Button>
        </form>
      </div>
    </div>
  );
}
