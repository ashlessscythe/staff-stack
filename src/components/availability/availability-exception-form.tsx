"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  addAvailabilityExceptionAction,
  updateAvailabilityExceptionAction,
} from "@/server/actions/availability";

export function AvailabilityExceptionForm({
  tenantSlug,
  exceptionId,
  defaultDate,
  defaultAvailable = false,
  defaultNote = "",
  onCancel,
  onSaved,
}: {
  tenantSlug: string;
  exceptionId?: string;
  defaultDate?: string;
  defaultAvailable?: boolean;
  defaultNote?: string;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(exceptionId);
  const fieldId = exceptionId ?? "new";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        await updateAvailabilityExceptionAction(formData);
      } else {
        await addAvailabilityExceptionAction(formData);
      }
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      {exceptionId && <input type="hidden" name="exceptionId" value={exceptionId} />}
      <div className="space-y-2">
        <label htmlFor={`exception-date-${fieldId}`} className="text-sm font-medium">
          Date
        </label>
        <input
          id={`exception-date-${fieldId}`}
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`exception-available-${fieldId}`} className="text-sm font-medium">
          Available?
        </label>
        <select
          id={`exception-available-${fieldId}`}
          name="available"
          defaultValue={defaultAvailable ? "true" : "false"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option value="false">No — day off</option>
          <option value="true">Yes — available (override weekly rules)</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor={`exception-note-${fieldId}`} className="text-sm font-medium">
          Note (optional)
        </label>
        <input
          id={`exception-note-${fieldId}`}
          name="note"
          type="text"
          maxLength={500}
          defaultValue={defaultNote}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save exception" : "Add exception"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
