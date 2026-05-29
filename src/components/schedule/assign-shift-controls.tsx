"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { assignShiftFormAction } from "@/server/actions/shifts";

import { AvailabilityNotifyDialog } from "./availability-notify-dialog";
import type { ConstraintHintSummary } from "./constraint-hints";

export function AssignShiftControls({
  tenantSlug,
  shiftId,
  tenantUsers,
  hintsForShift,
}: {
  tenantSlug: string;
  shiftId: string;
  tenantUsers: { userId: string; email: string }[];
  hintsForShift: Record<string, ConstraintHintSummary>;
}) {
  const defaultUserId =
    tenantUsers.find((tu) => !(hintsForShift[tu.userId]?.blocking.length ?? 0))?.userId ??
    tenantUsers[0]?.userId ??
    "";
  const [userId, setUserId] = useState(defaultUserId);
  const [forceAssign, setForceAssign] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const hint = hintsForShift[userId] ?? { blocking: [], warnings: [] };
  const hasBlocking = hint.blocking.length > 0;
  const hasWarnings = hint.warnings.length > 0;
  const notifyReason = hint.warnings.find((w) => w.code === "NO_RULES" || w.code === "OUTSIDE_RULE")
    ?.code as "NO_RULES" | "OUTSIDE_RULE" | undefined;

  const selectedEmail = tenantUsers.find((u) => u.userId === userId)?.email ?? userId;

  const optionLabel = useMemo(() => {
    return (uid: string) => {
      const h = hintsForShift[uid];
      if (!h) return tenantUsers.find((u) => u.userId === uid)?.email ?? uid;
      const email = tenantUsers.find((u) => u.userId === uid)?.email ?? uid;
      if (h.blocking.length > 0) return `${email} (blocked)`;
      if (h.warnings.length > 0) return `${email} (warning)`;
      return email;
    };
  }, [hintsForShift, tenantUsers]);

  return (
    <div className="flex flex-col gap-2 pt-1">
      <form action={assignShiftFormAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="shiftId" value={shiftId} />
        {forceAssign && <input type="hidden" name="forceAssign" value="1" />}
        <div className="space-y-1">
          <label htmlFor={`user-${shiftId}`} className="text-xs text-zinc-500">
            Assign user
          </label>
          <select
            id={`user-${shiftId}`}
            name="userId"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setForceAssign(false);
            }}
            className="h-10 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {tenantUsers.map((tu) => (
              <option
                key={tu.userId}
                value={tu.userId}
                disabled={!!hintsForShift[tu.userId]?.blocking.length}
              >
                {optionLabel(tu.userId)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={hasBlocking}>
          Assign
        </Button>
      </form>
      {hasWarnings && !hasBlocking && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <ul className="list-inside list-disc">
            {hint.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forceAssign}
              onChange={(e) => setForceAssign(e.target.checked)}
            />
            Assign anyway (acknowledge warnings)
          </label>
        </div>
      )}
      {hasBlocking && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {hint.blocking.map((b) => b.message).join(" · ")}
        </p>
      )}
      {notifyReason && (
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => setNotifyOpen(true)}>
            Notify to update availability
          </Button>
          <AvailabilityNotifyDialog
            tenantSlug={tenantSlug}
            userId={userId}
            userEmail={selectedEmail}
            shiftId={shiftId}
            reasonCode={notifyReason}
            open={notifyOpen}
            onClose={() => setNotifyOpen(false)}
          />
        </>
      )}
    </div>
  );
}
