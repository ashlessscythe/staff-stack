"use client";

import type { FocusEvent } from "react";
import type { TimeDisplayFormat } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMinuteOfDay, normalizeTimeInput, timeInputPlaceholder } from "@/lib/time-format";
import {
  addAvailabilityRuleAction,
  updateAvailabilityRuleAction,
} from "@/server/actions/availability";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeTimeField(event: FocusEvent<HTMLInputElement>, format: TimeDisplayFormat) {
  event.currentTarget.value = normalizeTimeInput(event.currentTarget.value, format);
}

export function AvailabilityRuleForm({
  tenantSlug,
  timeDisplayFormat,
  ruleId,
  defaultDayOfWeek = 1,
  defaultStartMinute = 9 * 60,
  defaultEndMinute = 17 * 60,
  onCancel,
  onSaved,
}: {
  tenantSlug: string;
  timeDisplayFormat: TimeDisplayFormat;
  ruleId?: string;
  defaultDayOfWeek?: number;
  defaultStartMinute?: number;
  defaultEndMinute?: number;
  onCancel?: () => void;
  /** Called after a successful save (e.g. close inline editor). */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const placeholder = timeInputPlaceholder(timeDisplayFormat);
  const isEdit = Boolean(ruleId);
  const fieldId = ruleId ?? "new";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEdit) {
        await updateAvailabilityRuleAction(formData);
      } else {
        await addAvailabilityRuleAction(formData);
      }
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      {ruleId && <input type="hidden" name="ruleId" value={ruleId} />}
      <div className="space-y-2">
        <Label htmlFor={`dayOfWeek-${fieldId}`}>Day</Label>
        <select
          id={`dayOfWeek-${fieldId}`}
          name="dayOfWeek"
          defaultValue={defaultDayOfWeek}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          {days.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block" />
      <div className="space-y-2">
        <Label htmlFor={`startTime-${fieldId}`}>Start time</Label>
        <Input
          id={`startTime-${fieldId}`}
          name="startTime"
          type="text"
          required
          placeholder={placeholder}
          defaultValue={formatMinuteOfDay(defaultStartMinute, timeDisplayFormat)}
          onBlur={(e) => normalizeTimeField(e, timeDisplayFormat)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`endTime-${fieldId}`}>End time</Label>
        <Input
          id={`endTime-${fieldId}`}
          name="endTime"
          type="text"
          required
          placeholder={placeholder}
          defaultValue={formatMinuteOfDay(defaultEndMinute, timeDisplayFormat)}
          onBlur={(e) => normalizeTimeField(e, timeDisplayFormat)}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save rule" : "Add rule"}
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
