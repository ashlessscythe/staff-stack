"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { requestSwapFormAction } from "@/server/actions/swaps";

import type { ConstraintHintSummary } from "./constraint-hints";

type SwapTarget = {
  assignmentId: string;
  label: string;
  hint: ConstraintHintSummary;
};

export function SwapRequestControls({
  tenantSlug,
  requesterAssignmentId,
  targets,
}: {
  tenantSlug: string;
  requesterAssignmentId: string;
  targets: SwapTarget[];
}) {
  const [targetId, setTargetId] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);

  const selected = useMemo(
    () => targets.find((t) => t.assignmentId === targetId),
    [targets, targetId],
  );

  const hasBlocking = (selected?.hint.blocking.length ?? 0) > 0;
  const hasWarnings = (selected?.hint.warnings.length ?? 0) > 0;

  if (targets.length === 0) return null;

  return (
    <form
      action={requestSwapFormAction}
      className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-zinc-200 p-2 dark:border-zinc-800"
    >
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="requesterAssignmentId" value={requesterAssignmentId} />
      {acknowledge && <input type="hidden" name="acknowledgeConstraints" value="1" />}
      <div className="space-y-1">
        <label htmlFor={`swap-target-${requesterAssignmentId}`} className="text-xs text-zinc-500">
          Request swap with
        </label>
        <select
          id={`swap-target-${requesterAssignmentId}`}
          name="targetAssignmentId"
          required
          value={targetId}
          onChange={(e) => {
            setTargetId(e.target.value);
            setAcknowledge(false);
          }}
          className="h-9 min-w-[220px] rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option value="">Select shift…</option>
          {targets.map((t) => (
            <option
              key={t.assignmentId}
              value={t.assignmentId}
              disabled={t.hint.blocking.length > 0}
            >
              {t.label}
              {t.hint.blocking.length > 0
                ? " (blocked)"
                : t.hint.warnings.length > 0
                  ? " (warning)"
                  : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={`swap-msg-${requesterAssignmentId}`} className="text-xs text-zinc-500">
          Message (optional)
        </label>
        <input
          id={`swap-msg-${requesterAssignmentId}`}
          name="message"
          type="text"
          placeholder="Reason for swap"
          className="h-9 min-w-[180px] rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>
      {selected && hasWarnings && !hasBlocking && (
        <label className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <input
            type="checkbox"
            checked={acknowledge}
            onChange={(e) => setAcknowledge(e.target.checked)}
          />
          I understand availability warnings
        </label>
      )}
      <Button type="submit" size="sm" variant="secondary" disabled={!targetId || hasBlocking}>
        Request swap
      </Button>
    </form>
  );
}
