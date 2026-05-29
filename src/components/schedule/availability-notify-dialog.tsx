"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  notifyUpdateAvailabilityAction,
  type NotifyAvailabilityState,
} from "@/server/actions/availability";

const initial: NotifyAvailabilityState = {};

export function AvailabilityNotifyDialog({
  tenantSlug,
  userId,
  userEmail,
  shiftId,
  reasonCode,
  open,
  onClose,
}: {
  tenantSlug: string;
  userId: string;
  userEmail: string;
  shiftId: string;
  reasonCode: "NO_RULES" | "OUTSIDE_RULE";
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(notifyUpdateAvailabilityAction, initial);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (state.ok || state.skipped) {
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [state.ok, state.skipped, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-0 shadow-lg backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950"
      onClose={onClose}
    >
      <form action={action} className="space-y-4 p-6">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="shiftId" value={shiftId} />
        <input type="hidden" name="reasonCode" value={reasonCode} />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Ask {userEmail} to update availability?
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {reasonCode === "NO_RULES"
            ? "This employee has no weekly availability rules on file. They will receive an email with a link to add them."
            : "This shift falls outside their declared weekly availability. They will receive an email asking them to review and update."}
        </p>
        <div className="space-y-1">
          <label htmlFor="notify-note" className="text-xs text-zinc-500">
            Note for employee (optional)
          </label>
          <textarea
            id="notify-note"
            name="note"
            rows={3}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="e.g. Please add Mon–Fri 9–5 or update before Friday"
          />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Email sent.</p>}
        {state.skipped && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Email could not be sent (provider unavailable or email disabled for this user).
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending || state.ok}>
            Send email
          </Button>
        </div>
      </form>
    </dialog>
  );
}
